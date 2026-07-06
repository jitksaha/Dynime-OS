// Ported from supabase/functions/ai-invoice-summary/index.ts — invoice analytics
// summary via ai-proxy tool-calling. Original had no auth gate. Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders, json } from "../_shared/cors";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const { invoices, period } = await req.json() as any;
    if (!invoices?.length) throw new Error("No invoices provided");

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: `You are an accounting AI. Analyze invoices and generate executive summaries with key metrics, trends, and actionable recommendations.` },
          { role: "user", content: `Generate a summary for ${period || "this period"} invoices:\n${JSON.stringify(invoices.map((inv: any) => ({ id: inv.id, client: inv.client_name, amount: inv.total_amount, status: inv.status, due_date: inv.due_date, created_at: inv.created_at })))}` },
        ],
        tools: [{ type: "function", function: { name: "generate_invoice_summary", description: "Return invoice analysis and summary", parameters: { type: "object", properties: { total_revenue: { type: "number" }, total_outstanding: { type: "number" }, overdue_count: { type: "number" }, overdue_amount: { type: "number" }, average_invoice_value: { type: "number" }, top_clients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, total: { type: "number" } }, required: ["name", "total"], additionalProperties: false } }, trends: { type: "array", items: { type: "string" } }, recommendations: { type: "array", items: { type: "string" } }, executive_summary: { type: "string" } }, required: ["total_revenue", "total_outstanding", "overdue_count", "overdue_amount", "average_invoice_value", "top_clients", "trends", "recommendations", "executive_summary"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "generate_invoice_summary" } },
      }),
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json() as any;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    return json(result);
  } catch (e) {
    console.error("ai-invoice-summary error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
