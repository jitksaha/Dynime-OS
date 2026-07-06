// Ported from supabase/functions/ai-expense-categorize/index.ts — expense
// categorization via ai-proxy tool-calling. Original had no auth gate. Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders, json } from "../_shared/cors";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const { expenses } = await req.json() as any;
    if (!expenses?.length) throw new Error("No expenses provided");

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: `You are a financial categorization AI. Categorize each expense into one of these categories: Office Supplies, Travel, Marketing, Software, Utilities, Payroll, Equipment, Professional Services, Insurance, Meals & Entertainment, Miscellaneous. Also suggest a tax-deductible flag (true/false).` },
          { role: "user", content: `Categorize these expenses:\n${JSON.stringify(expenses.map((e: any) => ({ id: e.id, description: e.description, amount: e.amount, current_category: e.category })))}` },
        ],
        tools: [{ type: "function", function: { name: "categorize_expenses", description: "Return categorization for each expense", parameters: { type: "object", properties: { categorizations: { type: "array", items: { type: "object", properties: { id: { type: "string" }, suggested_category: { type: "string" }, confidence: { type: "number" }, tax_deductible: { type: "boolean" }, reasoning: { type: "string" } }, required: ["id", "suggested_category", "confidence", "tax_deductible", "reasoning"], additionalProperties: false } } }, required: ["categorizations"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "categorize_expenses" } },
      }),
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json() as any;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { categorizations: [] };

    return json(result);
  } catch (e) {
    console.error("ai-expense-categorize error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
