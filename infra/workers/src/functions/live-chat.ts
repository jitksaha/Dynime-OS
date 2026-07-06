// Ported from supabase/functions/live-chat/index.ts.
// All DB access goes through withSession; the AI step calls the in-Worker ai-proxy
// handler directly instead of fetching SUPABASE_URL/functions/v1/ai-proxy. Realtime
// agent/AI replies are published via the Durable Object (publishChange).
//
// Note: postgres.js binds values with ${value} directly. tx(...) is ONLY for dynamic
// identifiers/fragments, so plain values use ${...} (the original port misused tx()).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { publishChange } from "../realtime/channel";
import { handler as aiProxy } from "./ai-proxy";

const SYSTEM_PROMPT = `You are a friendly customer support AI assistant for a business platform. Your role is to:
1. Answer common questions about pricing, features, onboarding, and account setup.
2. Help visitors understand what the platform offers.
3. Be concise and helpful. Use markdown for formatting.
4. If you cannot answer a question or the visitor explicitly asks for a human agent, respond with exactly: [ESCALATE]
5. Never make up information about specific plans or pricing — suggest the visitor check the pricing page or speak with a human.
6. Be warm, professional, and solution-oriented.`;

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ChatBody {
  action?: string;
  conversation_id?: string;
  message?: string;
  visitor_name?: string;
  visitor_email?: string;
  tenant_id?: string;
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { action, conversation_id, message, visitor_name, visitor_email, tenant_id } =
      (await req.json()) as ChatBody;

    if (action === "start") {
      const convId = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`
          INSERT INTO public.live_chat_conversations (visitor_name, visitor_email, tenant_id, status)
          VALUES (${visitor_name || "Visitor"}, ${visitor_email || ""}, ${tenant_id || null}, 'active')
          RETURNING id`;
        return rows[0].id as string;
      });

      const greeting = `Hi ${visitor_name || "there"}! 👋 I'm your AI assistant. How can I help you today?`;
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.live_chat_messages (conversation_id, sender_type, content)
           VALUES (${convId}, 'ai', ${greeting})`);

      return J({ conversation_id: convId, greeting });
    }

    if (action === "message") {
      if (!conversation_id || !message) {
        return J({ error: "conversation_id and message required" }, 400);
      }

      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.live_chat_messages (conversation_id, sender_type, content)
           VALUES (${conversation_id}, 'visitor', ${message})`);

      const convo = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT is_escalated, status FROM public.live_chat_conversations WHERE id = ${conversation_id}`;
        return rows[0] || null;
      });

      if (convo?.is_escalated) {
        return J({ reply: "Your message has been sent to our support team. They'll respond shortly!", escalated: true });
      }

      const history = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT sender_type, content FROM public.live_chat_messages
           WHERE conversation_id = ${conversation_id} ORDER BY created_at ASC LIMIT 20`);

      const messages = (history || []).map((m: any) => ({
        role: m.sender_type === "visitor" ? "user" : "assistant",
        content: m.content,
      }));

      // Call the in-Worker ai-proxy handler directly (no network hop to Supabase).
      const aiReq = new Request("https://internal/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages] }),
      });
      const aiResp = await aiProxy(aiReq, env);
      if (!aiResp.ok) {
        if (aiResp.status === 429) return J({ error: "Rate limit exceeded, please try again shortly." }, 429);
        if (aiResp.status === 402) return J({ error: "Service temporarily unavailable." }, 402);
        throw new Error("AI proxy error");
      }

      const aiData = (await aiResp.json()) as any;
      let reply: string = aiData.choices?.[0]?.message?.content ||
        "I'm sorry, I couldn't process that. Let me connect you with a human agent.";

      let escalated = false;
      if (reply.includes("[ESCALATE]")) {
        escalated = true;
        reply = "I'll connect you with a human support agent right away. Please hold on — someone will be with you shortly! 🙋";
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.live_chat_conversations
             SET is_escalated = true, escalated_at = now() WHERE id = ${conversation_id}`);
      }

      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.live_chat_messages (conversation_id, sender_type, content)
           VALUES (${conversation_id}, 'ai', ${reply})`);
      await publishChange(env, `live-chat-${conversation_id}`, {
        event: "INSERT", table: "live_chat_messages",
        new: { conversation_id, sender_type: "ai", content: reply },
      });

      return J({ reply, escalated });
    }

    if (action === "agent_reply") {
      const ctx = await contextFromRequest(req, env);
      if (!ctx.userId || ctx.role === "anon") return J({ error: "Unauthorized" }, 401);
      if (!conversation_id || !message) return J({ error: "conversation_id and message required" }, 400);

      await withSession(sql, SERVICE, async (tx) => {
        await tx`INSERT INTO public.live_chat_messages (conversation_id, sender_type, sender_id, content)
                 VALUES (${conversation_id}, 'agent', ${ctx.userId}, ${message})`;
        await tx`UPDATE public.live_chat_conversations
                 SET is_escalated = true, assigned_agent_id = ${ctx.userId} WHERE id = ${conversation_id}`;
      });
      await publishChange(env, `live-chat-${conversation_id}`, {
        event: "INSERT", table: "live_chat_messages",
        new: { conversation_id, sender_type: "agent", content: message },
      });

      return J({ success: true });
    }

    if (action === "close") {
      if (!conversation_id) return J({ error: "conversation_id required" }, 400);
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.live_chat_conversations
           SET status = 'closed', closed_at = now() WHERE id = ${conversation_id}`);
      return J({ success: true });
    }

    return J({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("live-chat error:", e);
    return J({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
