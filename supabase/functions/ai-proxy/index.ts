import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIConfig {
  ai_provider: string;
  model: string;
  enabled: boolean;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  api_keys?: Record<string, string>;
}

async function getAIConfig(): Promise<AIConfig> {
  const defaults: AIConfig = {
    ai_provider: "openai",
    model: "gpt-4o",
    enabled: true,
    max_tokens: 2048,
    temperature: 0.7,
    api_keys: {},
  };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_config")
      .maybeSingle();

    if (data?.value) {
      const cfg = data.value as Record<string, any>;
      return {
        ai_provider: cfg.ai_provider || defaults.ai_provider,
        model: cfg.model || defaults.model,
        enabled: cfg.enabled !== false,
        system_prompt: cfg.system_prompt || undefined,
        max_tokens: cfg.max_tokens || defaults.max_tokens,
        temperature: cfg.temperature ?? defaults.temperature,
        api_keys: cfg.api_keys || {},
      };
    }
  } catch (e) {
    console.warn("Could not fetch AI config:", e);
  }
  return defaults;
}

function getProviderEndpoint(provider: string): { url: string; keyEnv: string } {
  switch (provider) {
    case "anthropic":
      return { url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY" };
    case "google":
      return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GOOGLE_AI_API_KEY" };
    default: // openai
      return { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY" };
  }
}

// Normalize model name per provider — strip prefixes like "google/" or "openai/"
function normalizeModelName(provider: string, model: string): string {
  if (!model) return model;
  // Strip "provider/" prefix if present
  const stripped = model.includes("/") ? model.split("/").pop()! : model;

  if (provider === "google") {
    // Valid Gemini families currently: 1.5, 2.0, 2.5. Anything else → safe default.
    const validGemini = /^gemini-(1\.5|2\.0|2\.5)/i.test(stripped);
    if (!validGemini) return "gemini-2.0-flash";
    // Strip "-preview" / "-exp" suffixes that often aren't available via OpenAI compat
    return stripped.replace(/-(preview|exp)(-\d+)?$/i, "");
  }

  if (provider === "openai") {
    // Catch invalid futuristic models
    if (/^gpt-[5-9]/i.test(stripped) || /gpt-\d+\.\d+-pro-\d{4}/i.test(stripped)) {
      return "gpt-4o-mini";
    }
    return stripped;
  }

  if (provider === "anthropic") {
    if (!/^claude-/i.test(stripped)) return "claude-3-5-sonnet-20241022";
    return stripped;
  }

  return stripped;
}

// Convert OpenAI-format tools to Anthropic format
function convertToolsToAnthropic(tools: any[]): any[] {
  return tools.map((t: any) => ({
    name: t.function?.name || t.name,
    description: t.function?.description || t.description,
    input_schema: t.function?.parameters || t.input_schema,
  }));
}

// Convert OpenAI tool_choice to Anthropic
function convertToolChoiceToAnthropic(toolChoice: any): any {
  if (!toolChoice) return undefined;
  if (toolChoice.type === "function") {
    return { type: "tool", name: toolChoice.function.name };
  }
  if (toolChoice === "auto") return { type: "auto" };
  if (toolChoice === "none") return undefined;
  return { type: "auto" };
}

// Convert Anthropic response to OpenAI format
function convertAnthropicResponse(anthropicResp: any): any {
  const content = anthropicResp.content || [];
  const textParts = content.filter((c: any) => c.type === "text");
  const toolParts = content.filter((c: any) => c.type === "tool_use");

  const message: any = {
    role: "assistant",
    content: textParts.map((t: any) => t.text).join("") || null,
  };

  if (toolParts.length > 0) {
    message.tool_calls = toolParts.map((t: any) => ({
      id: t.id,
      type: "function",
      function: {
        name: t.name,
        arguments: JSON.stringify(t.input),
      },
    }));
  }

  return {
    choices: [{ message, finish_reason: anthropicResp.stop_reason || "stop" }],
    usage: anthropicResp.usage,
  };
}

async function callAnthropic(apiKey: string, model: string, messages: any[], tools?: any[], toolChoice?: any, maxTokens?: number, temperature?: number, stream?: boolean) {
  // Extract system message
  const systemMsgs = messages.filter((m: any) => m.role === "system");
  const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");
  const systemText = systemMsgs.map((m: any) => m.content).join("\n") || undefined;

  const body: any = {
    model,
    max_tokens: maxTokens || 2048,
    messages: nonSystemMsgs,
  };
  if (systemText) body.system = systemText;
  if (temperature !== undefined) body.temperature = temperature;
  if (tools?.length) body.tools = convertToolsToAnthropic(tools);
  if (toolChoice) body.tool_choice = convertToolChoiceToAnthropic(toolChoice);
  if (stream) body.stream = true;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  return resp;
}

async function callAnthropicStreaming(apiKey: string, model: string, messages: any[], maxTokens?: number, temperature?: number): Promise<Response> {
  const systemMsgs = messages.filter((m: any) => m.role === "system");
  const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");
  const systemText = systemMsgs.map((m: any) => m.content).join("\n") || undefined;

  const body: any = {
    model,
    max_tokens: maxTokens || 2048,
    messages: nonSystemMsgs,
    stream: true,
  };
  if (systemText) body.system = systemText;
  if (temperature !== undefined) body.temperature = temperature;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) return resp;

  // Transform Anthropic SSE to OpenAI SSE format
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const event = JSON.parse(jsonStr);
              // Convert Anthropic events to OpenAI format
              if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                const openaiEvent = {
                  choices: [{ delta: { content: event.delta.text }, index: 0 }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiEvent)}\n\n`));
              } else if (event.type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Stream transform error:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, tools, tool_choice, stream, max_tokens, temperature, model: modelOverride } = await req.json();

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = await getAIConfig();

    if (!config.enabled) {
      return new Response(JSON.stringify({ error: "AI features are currently disabled by administrator." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = config.ai_provider;
    const rawModel = modelOverride || config.model;
    const model = normalizeModelName(provider, rawModel);
    if (rawModel !== model) console.log(`Normalized model "${rawModel}" → "${model}" for provider "${provider}"`);
    const finalMaxTokens = max_tokens || config.max_tokens || 2048;
    const finalTemp = temperature ?? config.temperature ?? 0.7;

    const { keyEnv } = getProviderEndpoint(provider);
    const apiKey = config.api_keys?.[provider] || Deno.env.get(keyEnv);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API key not configured for "${provider}". Add it in Super Admin → AI Configuration.` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle Anthropic separately due to different API format
    if (provider === "anthropic") {
      if (stream && !tools) {
        const streamResp = await callAnthropicStreaming(apiKey, model, messages, finalMaxTokens, finalTemp);
        if (!streamResp.ok) {
          const errText = await streamResp.text();
          console.error("Anthropic error:", streamResp.status, errText);
          if (streamResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (streamResp.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(streamResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }

      const resp = await callAnthropic(apiKey, model, messages, tools, tool_choice, finalMaxTokens, finalTemp, false);
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Anthropic error:", resp.status, errText);
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402 || resp.status === 400) return new Response(JSON.stringify({ error: `AI error: ${errText}` }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anthropicData = await resp.json();
      const converted = convertAnthropicResponse(anthropicData);
      return new Response(JSON.stringify(converted), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // OpenAI-compatible providers: openai, google
    const { url } = getProviderEndpoint(provider);
    const body: any = { model, messages };
    if (tools?.length) body.tools = tools;
    if (tool_choice) body.tool_choice = tool_choice;
    if (stream) body.stream = true;
    if (finalMaxTokens) body.max_tokens = finalMaxTokens;
    if (finalTemp !== undefined) body.temperature = finalTemp;

    const doFetch = async (b: any) => fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });

    // Retry on 429 with exponential backoff
    const fetchWithRetry = async (b: any, maxRetries = 2): Promise<Response> => {
      let resp = await doFetch(b);
      for (let attempt = 1; attempt <= maxRetries && resp.status === 429; attempt++) {
        const retryAfter = parseInt(resp.headers.get("retry-after") || "0", 10);
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * Math.pow(2, attempt), 4000);
        console.warn(`429 from ${provider}, retry ${attempt}/${maxRetries} after ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
        resp = await doFetch(b);
      }
      return resp;
    };

    let response = await fetchWithRetry(body);

    // Auto-fallback: if model isn't a chat model, retry with a safe default
    if (!response.ok && provider === "openai") {
      const errText = await response.clone().text();
      const isModelIssue = /not a chat model|does not exist|model_not_found|unsupported.*model/i.test(errText);
      if (isModelIssue) {
        const fallbackModel = "gpt-4o-mini";
        console.warn(`Model "${model}" not chat-compatible. Falling back to ${fallbackModel}.`);
        body.model = fallbackModel;
        response = await fetchWithRetry(body);
      }
    }

    // Auto-fallback for Google Gemini if model is invalid
    if (!response.ok && provider === "google") {
      const errText = await response.clone().text();
      const isModelIssue = /not found|does not exist|invalid.*model|unsupported|model_not_found/i.test(errText);
      if (isModelIssue) {
        const fallbackModel = "gemini-2.0-flash";
        console.warn(`Gemini model "${model}" invalid. Falling back to ${fallbackModel}.`);
        body.model = fallbackModel;
        response = await fetchWithRetry(body);
      }
    }

    if (!response.ok) {
      const t = await response.text();
      console.error(`${provider} API error:`, response.status, t);
      let detail = t;
      let errCode: string | undefined;
      let rawJson: any = null;
      try {
        rawJson = JSON.parse(t);
        detail = rawJson?.error?.message || rawJson?.error || t;
        errCode = rawJson?.error?.code?.toString() || rawJson?.error?.status;
      } catch {}

      // Persist error log for super admins (non-blocking)
      try {
        const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
        const summary = typeof lastUserMsg?.content === "string"
          ? lastUserMsg.content.slice(0, 200)
          : JSON.stringify(lastUserMsg?.content || "").slice(0, 200);
        await supa.from("ai_error_logs").insert({
          provider,
          model: body.model || model,
          http_status: response.status,
          error_code: errCode,
          error_message: typeof detail === "string" ? detail.slice(0, 2000) : JSON.stringify(detail).slice(0, 2000),
          raw_response: rawJson,
          feature: "ai-proxy",
          request_summary: summary,
        });
      } catch (logErr) {
        console.warn("Failed to persist ai_error_log:", logErr);
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: `${provider} rate limit / quota exceeded. Check your ${provider.toUpperCase()} account billing & usage, or switch provider in Super Admin → AI Configuration. (${detail})` }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: `${provider} payment required. Add credits to your ${provider.toUpperCase()} account.` }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: `Invalid API key for ${provider}. Update it in Super Admin → AI Configuration.` }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI service error (${provider}): ${detail}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
