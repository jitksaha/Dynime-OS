// Ported from supabase/functions/ai-business-insights/index.ts — analyzes business
// data via ai-proxy and returns markdown insights. Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { json, error } from "../_shared/cors";
import { contextFromRequest } from "../_shared/auth-context";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Unauthorized", 401);
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId && ctx.role !== "service_role") return error("Invalid token", 401);

    const { businessData } = await req.json() as any;

    const prompt = `You are a business intelligence analyst for an enterprise SaaS platform. Analyze the following business data and provide actionable insights.

## Business Data
${JSON.stringify(businessData, null, 2)}

## Instructions
Provide a concise analysis covering:
1. **Key Trends** — Identify patterns in the data
2. **Anomalies & Alerts** — Flag anything unusual
3. **Actionable Recommendations** — 3-5 specific actions
4. **Quick Wins** — Low-effort, high-impact opportunities

Format in clean markdown. Keep under 300 words.`;

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a business intelligence analyst. Provide data-driven insights in concise markdown format." },
          { role: "user", content: prompt },
        ],
      }),
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      console.error("ai-business-insights upstream error:", response.status, errBody);
      // Return a friendly markdown message as a successful 200 so the UI renders it inline
      // instead of throwing and triggering a blank-screen runtime error.
      const friendly =
        response.status === 429 || response.status === 402
          ? "## ⚠️ AI Provider Quota Exceeded\n\nThe configured AI provider has run out of credits or hit a rate limit.\n\n**What to do:**\n- Open **Super Admin → AI Configuration** to check provider status & error logs\n- Add billing / new API key for the active provider, OR\n- Switch to a provider that has available quota (OpenAI / Anthropic / Google)\n\n_Insights will resume automatically once quota is restored._"
          : "## ⚠️ AI Service Temporarily Unavailable\n\nWe couldn't generate insights right now. Please try again in a moment.";
      return json({ insights: friendly });
    }

    const data = await response.json() as any;
    const insights = data.choices?.[0]?.message?.content || "No insights generated.";

    return json({ insights });
  } catch (e) {
    console.error("ai-business-insights error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
