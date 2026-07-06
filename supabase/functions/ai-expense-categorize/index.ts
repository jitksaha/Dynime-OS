import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { expenses } = await req.json();
    if (!expenses?.length) throw new Error("No expenses provided");

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: `You are a financial categorization AI. Categorize each expense into one of these categories: Office Supplies, Travel, Marketing, Software, Utilities, Payroll, Equipment, Professional Services, Insurance, Meals & Entertainment, Miscellaneous. Also suggest a tax-deductible flag (true/false).` },
          { role: "user", content: `Categorize these expenses:\n${JSON.stringify(expenses.map((e: any) => ({ id: e.id, description: e.description, amount: e.amount, current_category: e.category })))}` },
        ],
        tools: [{ type: "function", function: { name: "categorize_expenses", description: "Return categorization for each expense", parameters: { type: "object", properties: { categorizations: { type: "array", items: { type: "object", properties: { id: { type: "string" }, suggested_category: { type: "string" }, confidence: { type: "number" }, tax_deductible: { type: "boolean" }, reasoning: { type: "string" } }, required: ["id", "suggested_category", "confidence", "tax_deductible", "reasoning"], additionalProperties: false } } }, required: ["categorizations"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "categorize_expenses" } },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { categorizations: [] };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-expense-categorize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
