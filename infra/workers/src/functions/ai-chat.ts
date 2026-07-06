// Ported from supabase/functions/ai-chat/index.ts — universal streaming chat that
// persists conversations/messages/usage. Direct provider calls (openai/anthropic/google),
// streaming SSE transform, and DB persistence are preserved 1:1.
//   - createClient(anon, getUser) becomes  contextFromRequest (auth + userId)
//   - createClient(SERVICE_ROLE)   becomes  connect(env) + withSession(SERVICE)
//   - Supabase query-builder ops    becomes  raw SQL via tx tagged templates
//   - Deno.env.get(PROVIDER_KEY)    becomes  (env as any).<KEY>  (Worker secrets)

import type { Env } from "../_shared/env";
import { corsHeaders, json } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { getPlatformSetting } from "../_shared/secrets";

const SYSTEM_PROMPT = `You are Dynime AI — a powerful, universal AI assistant powered by Dynime. You can help with absolutely anything, just like ChatGPT or Claude.

Your capabilities include but are not limited to:
- General knowledge & Q&A on any topic
- Creative writing, storytelling, poetry, and content creation
- Code generation, debugging, and programming help in any language
- Math, science, and academic assistance
- Language translation and learning
- Business strategy, analysis, and planning
- Document drafting (emails, reports, proposals, contracts)
- Data analysis and interpretation
- Research and summarization
- Brainstorming and ideation
- Personal productivity and life advice
- Technical explanations and tutorials

Rules:
1. Be helpful, accurate, and thorough in all responses
2. Format responses with markdown — use headings, bullet points, code blocks, and tables when appropriate
3. Adapt your tone to the context — professional for business, casual for chat, technical for code
4. Support any language the user writes in — respond in their language
5. When you don't know something, say so honestly
6. For code, always include language identifiers in code blocks
7. Be concise when the question is simple, detailed when it's complex
8. You can help with creative tasks, analysis, writing, coding, math, and anything else`;

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, { status: 401 });

    // Verify user
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) return json({ error: "Invalid auth token" }, { status: 401 });
    const userId = ctx.userId;

    const sql = connect(env);

    // Get user's tenant
    const profileRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT tenant_id FROM profiles WHERE user_id = ${userId}`);
    const tenantId = profileRows[0]?.tenant_id;
    if (!tenantId) return json({ error: "No organization found" }, { status: 400 });

    const { conversation_id, messages, title } = await req.json() as any;

    if (!messages?.length) return json({ error: "Messages required" }, { status: 400 });

    // Create or update conversation
    let convId = conversation_id;
    if (!convId) {
      const conv = await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO ai_conversations ${tx({
          tenant_id: tenantId,
          user_id: userId,
          title: title || messages[0]?.content?.slice(0, 60) || "New Chat",
        })} RETURNING id`);
      convId = conv[0]?.id;
    }

    // Save user message
    const userMsg = messages[messages.length - 1];
    if (userMsg?.role === "user") {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO ai_messages ${tx({
          conversation_id: convId,
          tenant_id: tenantId,
          role: "user",
          content: userMsg.content,
        })}`);
    }

    // Get AI config from platform settings
    let aiConfig: Record<string, any> = {
      ai_provider: "openai",
      model: "gpt-4o",
      max_tokens: 4096,
      temperature: 0.7,
    };

    const cfg = await getPlatformSetting<Record<string, any>>(sql, "ai_config");
    if (cfg) {
      aiConfig = { ...aiConfig, ...cfg };
    }

    // Build provider endpoint
    const providerMap: Record<string, { url: string; keyEnv: string }> = {
      openai: { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY" },
      anthropic: { url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY" },
      google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GOOGLE_AI_API_KEY" },
    };

    const provider = providerMap[aiConfig.ai_provider] || providerMap.openai;
    // Provider API keys are Worker secrets (e.g. OPENAI_API_KEY), with DB-config override.
    const apiKey = (aiConfig as any).api_keys?.[aiConfig.ai_provider] || (env as any)[provider.keyEnv];
    if (!apiKey) {
      return json({ error: `AI key not configured. Add it in Super Admin → AI Configuration.` }, { status: 500 });
    }

    // Helper: persist assistant response + usage after streaming completes
    const persist = async (fullResponse: string) => {
      if (fullResponse && convId) {
        await withSession(sql, SERVICE, async (tx) => {
          await tx`INSERT INTO ai_messages ${tx({
            conversation_id: convId,
            tenant_id: tenantId,
            role: "assistant",
            content: fullResponse,
            model_used: aiConfig.model,
          })}`;
          await tx`UPDATE ai_conversations SET
            message_count = ${messages.length + 1},
            last_message_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
            WHERE id = ${convId}`;
          // Log usage
          await tx`INSERT INTO ai_usage_logs ${tx({
            tenant_id: tenantId,
            user_id: userId,
            model: aiConfig.model,
            provider: aiConfig.ai_provider,
            tokens_input: userMsg?.content?.length || 0,
            tokens_output: fullResponse.length,
            feature: "chat",
          })}`;
        });
      }
    };

    // Prepare messages with system prompt
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Handle Anthropic separately
    if (aiConfig.ai_provider === "anthropic") {
      const nonSystem = aiMessages.filter((m: any) => m.role !== "system");
      const systemText = SYSTEM_PROMPT;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: aiConfig.model,
          max_tokens: aiConfig.max_tokens,
          temperature: aiConfig.temperature,
          system: systemText,
          messages: nonSystem,
          stream: true,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Anthropic error:", resp.status, errText);
        if (resp.status === 429) return json({ error: "Rate limit exceeded" }, { status: 429 });
        if (resp.status === 402) return json({ error: "Payment required" }, { status: 402 });
        return json({ error: "AI service error" }, { status: 500 });
      }

      // Transform Anthropic SSE → OpenAI SSE and collect full response for saving
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let idx: number;
              while ((idx = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;
                try {
                  const event = JSON.parse(jsonStr);
                  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                    fullResponse += event.delta.text;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] })}\n\n`));
                  } else if (event.type === "message_stop") {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  }
                } catch {}
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } finally {
            controller.close();
            // Save assistant response
            await persist(fullResponse);
          }
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId || "" },
      });
    }

    // OpenAI-compatible providers (openai, google)
    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: aiMessages,
        stream: true,
        max_tokens: aiConfig.max_tokens,
        temperature: aiConfig.temperature,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
      if (response.status === 402) return json({ error: "AI credits required. Please add funds." }, { status: 402 });
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return json({ error: "AI service error" }, { status: 500 });
    }

    // Stream and collect response for saving
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              if (line.endsWith("\r")) {}
              const trimmed = line.trim();
              if (trimmed.startsWith(":") || trimmed === "") continue;
              if (!trimmed.startsWith("data: ")) continue;
              const jsonStr = trimmed.slice(6).trim();
              if (jsonStr === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                break;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {}
              controller.enqueue(encoder.encode(line + "\n"));
            }
          }
        } finally {
          controller.close();
          // Save assistant response
          await persist(fullResponse);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId || "" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
