import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { tenant_id } = await req.json();
    if (!tenant_id) return new Response(JSON.stringify({ error: "tenant_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Gather multi-signal data for churn analysis
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

    const [dealsRes, invoicesRes, expensesRes, ticketsRes, paymentsRes] = await Promise.all([
      adminClient.from("deals").select("name, contact_name, email, stage, value, days_in_stage, created_at, updated_at, loss_reason, next_follow_up").eq("tenant_id", tenant_id).limit(100),
      adminClient.from("invoices").select("client_name, client_email, status, due_date, total_amount, created_at, paid_date").eq("tenant_id", tenant_id).gte("created_at", ninetyDaysAgo).limit(200),
      adminClient.from("expenses").select("category, amount, created_at").eq("tenant_id", tenant_id).gte("created_at", ninetyDaysAgo).limit(200),
      adminClient.from("helpdesk_tickets").select("subject, status, priority, created_at, customer_email").eq("tenant_id", tenant_id).gte("created_at", sixtyDaysAgo).limit(100),
      adminClient.from("payments").select("amount, status, payment_date, payer_name").eq("tenant_id", tenant_id).gte("payment_date", ninetyDaysAgo).limit(200),
    ]);

    const context = {
      deals: dealsRes.data || [],
      invoices: invoicesRes.data || [],
      expenses: expensesRes.data || [],
      support_tickets: ticketsRes.data || [],
      payments: paymentsRes.data || [],
      analysis_period: { from: ninetyDaysAgo, to: new Date().toISOString() },
      instruction: `Analyze this business data to predict customer churn risk. Look for:
1. Deals stuck in pipeline or lost deals patterns
2. Overdue/unpaid invoices indicating payment issues
3. Declining payment frequency or amounts
4. Increasing support ticket volume or severity
5. Long periods without interaction

For each at-risk customer, provide a churn probability score (0-100), key risk signals, and recommended retention actions.`,
    };

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert customer success analyst specializing in B2B churn prediction. Analyze multi-signal business data to identify at-risk customers and provide actionable retention strategies. Be data-driven and specific." },
          { role: "user", content: JSON.stringify(context) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "churn_analysis",
            description: "Return structured churn prediction analysis",
            parameters: {
              type: "object",
              properties: {
                overall_health_score: { type: "number", description: "Overall customer health score 0-100" },
                summary: { type: "string", description: "Executive summary of churn risk landscape" },
                at_risk_customers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      customer_name: { type: "string" },
                      email: { type: "string" },
                      churn_probability: { type: "number", description: "0-100 churn risk score" },
                      risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      risk_signals: { type: "array", items: { type: "string" } },
                      last_interaction: { type: "string" },
                      revenue_at_risk: { type: "number" },
                      recommended_actions: { type: "array", items: { type: "string" } },
                    },
                    required: ["customer_name", "churn_probability", "risk_level", "risk_signals", "recommended_actions"],
                  },
                },
                trends: {
                  type: "object",
                  properties: {
                    payment_health: { type: "string" },
                    engagement_trend: { type: "string" },
                    support_sentiment: { type: "string" },
                    pipeline_velocity: { type: "string" },
                  },
                },
                retention_priorities: { type: "array", items: { type: "string" } },
              },
              required: ["overall_health_score", "summary", "at_risk_customers", "trends", "retention_priorities"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "churn_analysis" } },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ result: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-churn-detection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
