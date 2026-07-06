import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { deals } = await req.json();
    if (!deals?.length) throw new Error("No deals provided");

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: `You are a CRM deal-scoring AI. Score each deal from 0-100 based on win probability. Consider deal stage, value, days in stage, priority, and source. Provide actionable next steps.` },
          { role: "user", content: `Score these deals:\n${JSON.stringify(deals.map((d: any) => ({ id: d.id, name: d.name, value: d.value, stage: d.stage, days_in_stage: d.days_in_stage, priority: d.priority, source: d.source, contact_name: d.contact_name })))}` },
        ],
        tools: [{ type: "function", function: { name: "score_deals", description: "Return AI score and recommendations for each deal", parameters: { type: "object", properties: { scores: { type: "array", items: { type: "object", properties: { id: { type: "string" }, score: { type: "number" }, win_probability: { type: "string" }, risk_level: { type: "string", enum: ["low", "medium", "high"] }, next_action: { type: "string" }, reasoning: { type: "string" } }, required: ["id", "score", "win_probability", "risk_level", "next_action", "reasoning"], additionalProperties: false } }, summary: { type: "string" } }, required: ["scores", "summary"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "score_deals" } },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { scores: [], summary: "" };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-deal-scoring error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
