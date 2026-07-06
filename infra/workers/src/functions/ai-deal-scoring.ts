// Ported from supabase/functions/ai-deal-scoring/index.ts — CRM deal scoring via
// ai-proxy tool-calling. Original had no auth gate. Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders, json } from "../_shared/cors";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const { deals } = await req.json() as any;
    if (!deals?.length) throw new Error("No deals provided");

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: `You are a CRM deal-scoring AI. Score each deal from 0-100 based on win probability. Consider deal stage, value, days in stage, priority, and source. Provide actionable next steps.` },
          { role: "user", content: `Score these deals:\n${JSON.stringify(deals.map((d: any) => ({ id: d.id, name: d.name, value: d.value, stage: d.stage, days_in_stage: d.days_in_stage, priority: d.priority, source: d.source, contact_name: d.contact_name })))}` },
        ],
        tools: [{ type: "function", function: { name: "score_deals", description: "Return AI score and recommendations for each deal", parameters: { type: "object", properties: { scores: { type: "array", items: { type: "object", properties: { id: { type: "string" }, score: { type: "number" }, win_probability: { type: "string" }, risk_level: { type: "string", enum: ["low", "medium", "high"] }, next_action: { type: "string" }, reasoning: { type: "string" } }, required: ["id", "score", "win_probability", "risk_level", "next_action", "reasoning"], additionalProperties: false } }, summary: { type: "string" } }, required: ["scores", "summary"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "score_deals" } },
      }),
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json() as any;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { scores: [], summary: "" };

    return json(result);
  } catch (e) {
    console.error("ai-deal-scoring error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
