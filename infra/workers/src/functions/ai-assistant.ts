// Ported from supabase/functions/ai-assistant/index.ts — streams a chat completion
// through ai-proxy with an analytics-assistant system prompt. Behaviour preserved 1:1.
//   - Deno.serve(req => ...)        becomes  export async function handler(req, env)
//   - createClient(user, getUser)   becomes  contextFromRequest (auth gate)
//   - createClient(SERVICE) config  becomes  getPlatformSetting("ai_config")
//   - fetch(SUPABASE_URL/functions/v1/ai-proxy) becomes internal aiProxy(...) call

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { getPlatformSetting } from "../_shared/secrets";
import { handler as aiProxy } from "./ai-proxy";

const DEFAULT_SYSTEM_PROMPT = `You are an AI Assistant — a smart business analytics helper embedded in an ERP/CRM platform. You help users with:

1. **Report Generation**: Summarize business data, create executive summaries, and generate insights.
2. **Data Insights**: Analyze trends in sales, HR, finance, and marketing data.
3. **Module Suggestions**: Recommend workflows, optimizations, and best practices.
4. **Task Assistance**: Help draft emails, create project plans, and suggest next steps.

Keep responses concise, actionable, and formatted with markdown. Use tables for data comparisons. Be proactive in suggesting follow-up actions.`;

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Unauthorized", 401);
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId && ctx.role !== "service_role") return error("Invalid token", 401);

    const { messages } = await req.json() as any;

    // Fetch system prompt override from AI config
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    try {
      const sql = connect(env);
      const config = await getPlatformSetting<Record<string, any>>(sql, "ai_config");
      if (config?.system_prompt) systemPrompt = config.system_prompt;
    } catch {}

    // Route through ai-proxy (internal call replaces functions/v1/ai-proxy fetch)
    const proxyResp = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    }), env);

    if (!proxyResp.ok) {
      const errBody = await proxyResp.text();
      console.error("ai-proxy error:", proxyResp.status, errBody);
      // Return a friendly SSE chunk so streaming UIs don't blank-screen
      const friendly = "⚠️ Platform AI is currently experiencing an error (provider quota or rate limit). Please wait — we're working to fix it.";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunk = { choices: [{ delta: { content: friendly }, index: 0 }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(proxyResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
