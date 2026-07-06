import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoices, period } = await req.json();
    if (!invoices?.length) throw new Error("No invoices provided");

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: `You are an accounting AI. Analyze invoices and generate executive summaries with key metrics, trends, and actionable recommendations.` },
          { role: "user", content: `Generate a summary for ${period || "this period"} invoices:\n${JSON.stringify(invoices.map((inv: any) => ({ id: inv.id, client: inv.client_name, amount: inv.total_amount, status: inv.status, due_date: inv.due_date, created_at: inv.created_at })))}` },
        ],
        tools: [{ type: "function", function: { name: "generate_invoice_summary", description: "Return invoice analysis and summary", parameters: { type: "object", properties: { total_revenue: { type: "number" }, total_outstanding: { type: "number" }, overdue_count: { type: "number" }, overdue_amount: { type: "number" }, average_invoice_value: { type: "number" }, top_clients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, total: { type: "number" } }, required: ["name", "total"], additionalProperties: false } }, trends: { type: "array", items: { type: "string" } }, recommendations: { type: "array", items: { type: "string" } }, executive_summary: { type: "string" } }, required: ["total_revenue", "total_outstanding", "overdue_count", "overdue_amount", "average_invoice_value", "top_clients", "trends", "recommendations", "executive_summary"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "generate_invoice_summary" } },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-invoice-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
