// Ported from supabase/functions/ai-churn-detection/index.ts — gathers multi-signal
// tenant data (service-role) and runs churn analysis via ai-proxy tool-calling.
//   - createClient(SERVICE_ROLE) reads  becomes  connect(env) + withSession(SERVICE)
//   - Supabase query-builder selects     becomes  raw SQL via tx tagged templates
// Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Unauthorized", 401);
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId && ctx.role !== "service_role") return error("Invalid token", 401);

    const { tenant_id } = await req.json() as any;
    if (!tenant_id) return error("tenant_id required", 400);

    const sql = connect(env);

    // Gather multi-signal data for churn analysis (service-role, like the original admin client)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

    const { deals, invoices, expenses, tickets, payments } = await withSession(sql, SERVICE, async (tx) => {
      const [deals, invoices, expenses, tickets, payments] = await Promise.all([
        tx`SELECT name, contact_name, email, stage, value, days_in_stage, created_at, updated_at, loss_reason, next_follow_up
           FROM deals WHERE tenant_id = ${tenant_id} LIMIT 100`,
        tx`SELECT client_name, client_email, status, due_date, total_amount, created_at, paid_date
           FROM invoices WHERE tenant_id = ${tenant_id} AND created_at >= ${ninetyDaysAgo} LIMIT 200`,
        tx`SELECT category, amount, created_at
           FROM expenses WHERE tenant_id = ${tenant_id} AND created_at >= ${ninetyDaysAgo} LIMIT 200`,
        tx`SELECT subject, status, priority, created_at, customer_email
           FROM helpdesk_tickets WHERE tenant_id = ${tenant_id} AND created_at >= ${sixtyDaysAgo} LIMIT 100`,
        tx`SELECT amount, status, payment_date, payer_name
           FROM payments WHERE tenant_id = ${tenant_id} AND payment_date >= ${ninetyDaysAgo} LIMIT 200`,
      ]);
      return { deals, invoices, expenses, tickets, payments };
    });

    const context = {
      deals: deals || [],
      invoices: invoices || [],
      expenses: expenses || [],
      support_tickets: tickets || [],
      payments: payments || [],
      analysis_period: { from: ninetyDaysAgo, to: new Date().toISOString() },
      instruction: `Analyze this business data to predict customer churn risk. Look for:
1. Deals stuck in pipeline or lost deals patterns
2. Overdue/unpaid invoices indicating payment issues
3. Declining payment frequency or amounts
4. Increasing support ticket volume or severity
5. Long periods without interaction

For each at-risk customer, provide a churn probability score (0-100), key risk signals, and recommended retention actions.`,
    };

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
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
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await response.json() as any;
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return error("AI did not return structured data", 500);
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return json({ result: parsed });
  } catch (e) {
    console.error("ai-churn-detection error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
