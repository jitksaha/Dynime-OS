import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Verify user
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Invalid auth token" }, 401);
    }
    const userId = user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user's tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.tenant_id) return json({ error: "No organization found" }, 400);

    const { conversation_id, messages, title } = await req.json();

    if (!messages?.length) return json({ error: "Messages required" }, 400);

    // Create or update conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .insert({
          tenant_id: profile.tenant_id,
          user_id: userId,
          title: title || messages[0]?.content?.slice(0, 60) || "New Chat",
        })
        .select("id")
        .single();
      convId = conv?.id;
    }

    // Save user message
    const userMsg = messages[messages.length - 1];
    if (userMsg?.role === "user") {
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        tenant_id: profile.tenant_id,
        role: "user",
        content: userMsg.content,
      });
    }

    // Get AI config from platform settings
    let aiConfig = {
      ai_provider: "openai",
      model: "gpt-4o",
      max_tokens: 4096,
      temperature: 0.7,
    };

    const { data: configData } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_config")
      .maybeSingle();

    if (configData?.value) {
      const cfg = configData.value as Record<string, any>;
      aiConfig = { ...aiConfig, ...cfg };
    }

    // Build provider endpoint
    const providerMap: Record<string, { url: string; keyEnv: string }> = {
      openai: { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY" },
      anthropic: { url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY" },
      google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GOOGLE_AI_API_KEY" },
    };

    const provider = providerMap[aiConfig.ai_provider] || providerMap.openai;
    const apiKey = (aiConfig as any).api_keys?.[aiConfig.ai_provider] || Deno.env.get(provider.keyEnv);
    if (!apiKey) {
      return json({ error: `AI key not configured. Add it in Super Admin → AI Configuration.` }, 500);
    }

    // Prepare messages with system prompt
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Handle Anthropic separately
    if (aiConfig.ai_provider === "anthropic") {
      const nonSystem = aiMessages.filter(m => m.role !== "system");
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
        if (resp.status === 429) return json({ error: "Rate limit exceeded" }, 429);
        if (resp.status === 402) return json({ error: "Payment required" }, 402);
        return json({ error: "AI service error" }, 500);
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
            if (fullResponse && convId) {
              await supabase.from("ai_messages").insert({
                conversation_id: convId,
                tenant_id: profile.tenant_id,
                role: "assistant",
                content: fullResponse,
                model_used: aiConfig.model,
              });
              await supabase.from("ai_conversations").update({
                message_count: messages.length + 1,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq("id", convId);
              // Log usage
              await supabase.from("ai_usage_logs").insert({
                tenant_id: profile.tenant_id,
                user_id: userId,
                model: aiConfig.model,
                provider: aiConfig.ai_provider,
                tokens_input: userMsg?.content?.length || 0,
                tokens_output: fullResponse.length,
                feature: "chat",
              });
            }
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
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again later." }, 429);
      if (response.status === 402) return json({ error: "AI credits required. Please add funds." }, 402);
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return json({ error: "AI service error" }, 500);
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
          if (fullResponse && convId) {
            await supabase.from("ai_messages").insert({
              conversation_id: convId,
              tenant_id: profile.tenant_id,
              role: "assistant",
              content: fullResponse,
              model_used: aiConfig.model,
            });
            await supabase.from("ai_conversations").update({
              message_count: messages.length + 1,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", convId);
            await supabase.from("ai_usage_logs").insert({
              tenant_id: profile.tenant_id,
              user_id: userId,
              model: aiConfig.model,
              provider: aiConfig.ai_provider,
              tokens_input: userMsg?.content?.length || 0,
              tokens_output: fullResponse.length,
              feature: "chat",
            });
          }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId || "" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
