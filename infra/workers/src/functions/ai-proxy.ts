// Phase 5 — ai-proxy ported to a Worker. This is the TEMPLATE the other 69 functions follow:
//   - Deno.serve(req => ...)            becomes  export async function handler(req, env, ctx)
//   - createClient(SERVICE_ROLE)        becomes  connect(env) + withSession(SERVICE)
//   - Deno.env.get(...)                 becomes  config from DB (getPlatformSetting) or env
//   - corsHeaders inline                becomes  import { corsHeaders } from "@shared/cors"
// Behaviour (providers openai/anthropic/google, streaming, retries, fallbacks,
// ai_error_logs) is preserved 1:1 from supabase/functions/ai-proxy/index.ts.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getPlatformSetting } from "../_shared/secrets";

interface AIConfig {
  ai_provider: string;
  model: string;
  enabled: boolean;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  api_keys?: Record<string, string>;
}

async function getAIConfig(sql: ReturnType<typeof connect>): Promise<AIConfig> {
  const defaults: AIConfig = {
    ai_provider: "openai", model: "gpt-4o", enabled: true,
    max_tokens: 2048, temperature: 0.7, api_keys: {},
  };
  try {
    const cfg = await getPlatformSetting<Record<string, any>>(sql, "ai_config");
    if (cfg) {
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
  } catch (e) { console.warn("Could not fetch AI config:", e); }
  return defaults;
}

function getProviderEndpoint(provider: string): { url: string; keyEnv: string } {
  switch (provider) {
    case "anthropic": return { url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY" };
    case "google": return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GOOGLE_AI_API_KEY" };
    default: return { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY" };
  }
}

function normalizeModelName(provider: string, model: string): string {
  if (!model) return model;
  const stripped = model.includes("/") ? model.split("/").pop()! : model;
  if (provider === "google") {
    const validGemini = /^gemini-(1\.5|2\.0|2\.5)/i.test(stripped);
    if (!validGemini) return "gemini-2.0-flash";
    return stripped.replace(/-(preview|exp)(-\d+)?$/i, "");
  }
  if (provider === "openai") {
    if (/^gpt-[5-9]/i.test(stripped) || /gpt-\d+\.\d+-pro-\d{4}/i.test(stripped)) return "gpt-4o-mini";
    return stripped;
  }
  if (provider === "anthropic") {
    if (!/^claude-/i.test(stripped)) return "claude-3-5-sonnet-20241022";
    return stripped;
  }
  return stripped;
}

const convertToolsToAnthropic = (tools: any[]) => tools.map((t: any) => ({
  name: t.function?.name || t.name,
  description: t.function?.description || t.description,
  input_schema: t.function?.parameters || t.input_schema,
}));

function convertToolChoiceToAnthropic(tc: any): any {
  if (!tc) return undefined;
  if (tc.type === "function") return { type: "tool", name: tc.function.name };
  if (tc === "auto") return { type: "auto" };
  if (tc === "none") return undefined;
  return { type: "auto" };
}

function convertAnthropicResponse(resp: any): any {
  const content = resp.content || [];
  const textParts = content.filter((c: any) => c.type === "text");
  const toolParts = content.filter((c: any) => c.type === "tool_use");
  const message: any = { role: "assistant", content: textParts.map((t: any) => t.text).join("") || null };
  if (toolParts.length) {
    message.tool_calls = toolParts.map((t: any) => ({
      id: t.id, type: "function",
      function: { name: t.name, arguments: JSON.stringify(t.input) },
    }));
  }
  return { choices: [{ message, finish_reason: resp.stop_reason || "stop" }], usage: resp.usage };
}

async function callAnthropic(apiKey: string, model: string, messages: any[], tools?: any[], toolChoice?: any, maxTokens?: number, temperature?: number) {
  const systemMsgs = messages.filter((m: any) => m.role === "system");
  const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");
  const systemText = systemMsgs.map((m: any) => m.content).join("\n") || undefined;
  const body: any = { model, max_tokens: maxTokens || 2048, messages: nonSystemMsgs };
  if (systemText) body.system = systemText;
  if (temperature !== undefined) body.temperature = temperature;
  if (tools?.length) body.tools = convertToolsToAnthropic(tools);
  if (toolChoice) body.tool_choice = convertToolChoiceToAnthropic(toolChoice);
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
}

async function callAnthropicStreaming(apiKey: string, model: string, messages: any[], maxTokens?: number, temperature?: number): Promise<Response> {
  const systemMsgs = messages.filter((m: any) => m.role === "system");
  const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");
  const systemText = systemMsgs.map((m: any) => m.content).join("\n") || undefined;
  const body: any = { model, max_tokens: maxTokens || 2048, messages: nonSystemMsgs, stream: true };
  if (systemText) body.system = systemText;
  if (temperature !== undefined) body.temperature = temperature;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return resp;

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text }, index: 0 }] })}\n\n`));
              } else if (event.type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* ignore */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) { console.error("Stream transform error:", e); }
      finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

async function logError(sql: ReturnType<typeof connect>, row: Record<string, unknown>) {
  try {
    await withSession(sql, SERVICE, (tx) => tx`INSERT INTO public.ai_error_logs ${tx(row as any)}`);
  } catch (e) { console.warn("ai_error_logs insert failed:", e); }
}

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { messages, tools, tool_choice, stream, max_tokens, temperature, model: modelOverride } =
      await req.json() as any;
    if (!messages?.length) return J({ error: "messages array is required" }, 400);

    const config = await getAIConfig(sql);
    if (!config.enabled) return J({ error: "AI features are currently disabled by administrator." }, 403);

    const provider = config.ai_provider;
    const rawModel = modelOverride || config.model;
    const model = normalizeModelName(provider, rawModel);
    const finalMaxTokens = max_tokens || config.max_tokens || 2048;
    const finalTemp = temperature ?? config.temperature ?? 0.7;

    const { keyEnv } = getProviderEndpoint(provider);
    const apiKey = config.api_keys?.[provider] || (env as any)[keyEnv];
    if (!apiKey) return J({ error: `API key not configured for "${provider}". Add it in Super Admin → AI Configuration.` }, 500);

    if (provider === "anthropic") {
      if (stream && !tools) {
        const sr = await callAnthropicStreaming(apiKey, model, messages, finalMaxTokens, finalTemp);
        if (!sr.ok) {
          const t = await sr.text(); console.error("Anthropic error:", sr.status, t);
          if (sr.status === 429) return J({ error: "Rate limit exceeded." }, 429);
          if (sr.status === 402) return J({ error: "Payment required." }, 402);
          return J({ error: "AI service error" }, 500);
        }
        return new Response(sr.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
      const resp = await callAnthropic(apiKey, model, messages, tools, tool_choice, finalMaxTokens, finalTemp);
      if (!resp.ok) {
        const t = await resp.text(); console.error("Anthropic error:", resp.status, t);
        if (resp.status === 429) return J({ error: "Rate limit exceeded." }, 429);
        if (resp.status === 402 || resp.status === 400) return J({ error: `AI error: ${t}` }, resp.status);
        return J({ error: "AI service error" }, 500);
      }
      return J(convertAnthropicResponse(await resp.json()));
    }

    // OpenAI-compatible: openai, google
    const { url } = getProviderEndpoint(provider);
    const body: any = { model, messages };
    if (tools?.length) body.tools = tools;
    if (tool_choice) body.tool_choice = tool_choice;
    if (stream) body.stream = true;
    if (finalMaxTokens) body.max_tokens = finalMaxTokens;
    if (finalTemp !== undefined) body.temperature = finalTemp;

    const doFetch = (b: any) => fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const fetchWithRetry = async (b: any, maxRetries = 2): Promise<Response> => {
      let resp = await doFetch(b);
      for (let attempt = 1; attempt <= maxRetries && resp.status === 429; attempt++) {
        const retryAfter = parseInt(resp.headers.get("retry-after") || "0", 10);
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * Math.pow(2, attempt), 4000);
        await new Promise((r) => setTimeout(r, delayMs));
        resp = await doFetch(b);
      }
      return resp;
    };

    let response = await fetchWithRetry(body);

    if (!response.ok && provider === "openai") {
      const errText = await response.clone().text();
      if (/not a chat model|does not exist|model_not_found|unsupported.*model/i.test(errText)) {
        body.model = "gpt-4o-mini"; response = await fetchWithRetry(body);
      }
    }
    if (!response.ok && provider === "google") {
      const errText = await response.clone().text();
      if (/not found|does not exist|invalid.*model|unsupported|model_not_found/i.test(errText)) {
        body.model = "gemini-2.0-flash"; response = await fetchWithRetry(body);
      }
    }

    if (!response.ok) {
      const t = await response.text();
      console.error(`${provider} API error:`, response.status, t);
      let detail: any = t, errCode: string | undefined, rawJson: any = null;
      try { rawJson = JSON.parse(t); detail = rawJson?.error?.message || rawJson?.error || t; errCode = rawJson?.error?.code?.toString() || rawJson?.error?.status; } catch { /* ignore */ }
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      const summary = typeof lastUserMsg?.content === "string"
        ? lastUserMsg.content.slice(0, 200) : JSON.stringify(lastUserMsg?.content || "").slice(0, 200);
      await logError(sql, {
        provider, model: body.model || model, http_status: response.status, error_code: errCode,
        error_message: typeof detail === "string" ? detail.slice(0, 2000) : JSON.stringify(detail).slice(0, 2000),
        raw_response: rawJson, feature: "ai-proxy", request_summary: summary,
      });
      return J({ error: typeof detail === "string" ? detail : "AI service error" }, response.status);
    }

    if (stream) return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    return J(await response.json());
  } catch (e) {
    return J({ error: `ai-proxy error: ${(e as Error).message}` }, 500);
  }
}
