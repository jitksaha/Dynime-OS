import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a friendly customer support AI assistant for a business platform. Your role is to:
1. Answer common questions about pricing, features, onboarding, and account setup.
2. Help visitors understand what the platform offers.
3. Be concise and helpful. Use markdown for formatting.
4. If you cannot answer a question or the visitor explicitly asks for a human agent, respond with exactly: [ESCALATE]
5. Never make up information about specific plans or pricing — suggest the visitor check the pricing page or speak with a human.
6. Be warm, professional, and solution-oriented.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, conversation_id, message, visitor_name, visitor_email, tenant_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "start") {
      const { data, error } = await supabase
        .from("live_chat_conversations")
        .insert({ visitor_name: visitor_name || "Visitor", visitor_email: visitor_email || "", tenant_id: tenant_id || null, status: "active" })
        .select("id")
        .single();

      if (error) throw error;

      const greeting = `Hi ${visitor_name || "there"}! 👋 I'm your AI assistant. How can I help you today?`;
      await supabase.from("live_chat_messages").insert({ conversation_id: data.id, sender_type: "ai", content: greeting });

      return new Response(JSON.stringify({ conversation_id: data.id, greeting }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "message") {
      if (!conversation_id || !message) {
        return new Response(JSON.stringify({ error: "conversation_id and message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase.from("live_chat_messages").insert({ conversation_id, sender_type: "visitor", content: message });

      const { data: convo } = await supabase.from("live_chat_conversations").select("is_escalated, status").eq("id", conversation_id).single();
      if (convo?.is_escalated) {
        return new Response(JSON.stringify({ reply: "Your message has been sent to our support team. They'll respond shortly!", escalated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: history } = await supabase.from("live_chat_messages").select("sender_type, content").eq("conversation_id", conversation_id).order("created_at", { ascending: true }).limit(20);
      const messages = (history || []).map((m) => ({ role: m.sender_type === "visitor" ? "user" : "assistant", content: m.content }));

      // Route through ai-proxy
      const aiResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        }),
      });

      if (!aiResp.ok) {
        const errBody = await aiResp.text();
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI proxy error");
      }

      const aiData = await aiResp.json();
      let reply = aiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Let me connect you with a human agent.";

      let escalated = false;
      if (reply.includes("[ESCALATE]")) {
        escalated = true;
        reply = "I'll connect you with a human support agent right away. Please hold on — someone will be with you shortly! 🙋";
        await supabase.from("live_chat_conversations").update({ is_escalated: true, escalated_at: new Date().toISOString() }).eq("id", conversation_id);
      }

      await supabase.from("live_chat_messages").insert({ conversation_id, sender_type: "ai", content: reply });

      return new Response(JSON.stringify({ reply, escalated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "agent_reply") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const authSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error: authError } = await authSupabase.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await supabase.from("live_chat_messages").insert({ conversation_id, sender_type: "agent", sender_id: user.id, content: message });
      await supabase.from("live_chat_conversations").update({ is_escalated: true, assigned_agent_id: user.id }).eq("id", conversation_id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "close") {
      await supabase.from("live_chat_conversations").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", conversation_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("live-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
