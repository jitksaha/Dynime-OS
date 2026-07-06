import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  email_draft: `You are an expert business email writer. Draft professional, concise emails based on user context. Return JSON using the suggest_emails tool.`,
  hr_assist: `You are an HR operations expert. Analyze employee data and provide actionable HR insights. Return JSON using the hr_insights tool.`,
  sales_intelligence: `You are a sales analytics expert. Analyze CRM data and provide sales intelligence insights. Return JSON using the sales_insights tool.`,
  expense_analysis: `You are a financial analyst. Analyze expense and invoice data to provide financial health insights. Return JSON using the finance_insights tool.`,
};

const TOOLS: Record<string, any[]> = {
  email_draft: [{ type: "function", function: { name: "suggest_emails", description: "Generate professional email drafts", parameters: { type: "object", properties: { drafts: { type: "array", items: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" }, tone: { type: "string", enum: ["formal", "friendly", "urgent", "follow-up"] }, category: { type: "string" } }, required: ["subject", "body", "tone", "category"], additionalProperties: false } } }, required: ["drafts"], additionalProperties: false } } }],
  hr_assist: [{ type: "function", function: { name: "hr_insights", description: "Provide HR analytics and recommendations", parameters: { type: "object", properties: { summary: { type: "string" }, headcount_analysis: { type: "string" }, recommendations: { type: "array", items: { type: "string" } }, risk_areas: { type: "array", items: { type: "object", properties: { area: { type: "string" }, severity: { type: "string", enum: ["low", "medium", "high"] }, description: { type: "string" }, action: { type: "string" } }, required: ["area", "severity", "description", "action"], additionalProperties: false } }, performance_highlights: { type: "array", items: { type: "string" } } }, required: ["summary", "headcount_analysis", "recommendations", "risk_areas"], additionalProperties: false } } }],
  sales_intelligence: [{ type: "function", function: { name: "sales_insights", description: "Provide sales pipeline intelligence", parameters: { type: "object", properties: { pipeline_summary: { type: "string" }, total_pipeline_value: { type: "number" }, win_rate_estimate: { type: "string" }, top_deals: { type: "array", items: { type: "object", properties: { name: { type: "string" }, value: { type: "number" }, score: { type: "number" }, next_action: { type: "string" }, risk: { type: "string", enum: ["low", "medium", "high"] } }, required: ["name", "value", "score", "next_action", "risk"], additionalProperties: false } }, recommendations: { type: "array", items: { type: "string" } }, sentiment_overview: { type: "string" } }, required: ["pipeline_summary", "total_pipeline_value", "win_rate_estimate", "top_deals", "recommendations"], additionalProperties: false } } }],
  expense_analysis: [{ type: "function", function: { name: "finance_insights", description: "Provide financial health analysis", parameters: { type: "object", properties: { executive_summary: { type: "string" }, total_expenses: { type: "number" }, total_revenue: { type: "number" }, top_categories: { type: "array", items: { type: "object", properties: { category: { type: "string" }, amount: { type: "number" }, trend: { type: "string", enum: ["up", "down", "stable"] }, note: { type: "string" } }, required: ["category", "amount", "trend"], additionalProperties: false } }, anomalies: { type: "array", items: { type: "object", properties: { description: { type: "string" }, amount: { type: "number" }, severity: { type: "string", enum: ["low", "medium", "high"] } }, required: ["description", "severity"], additionalProperties: false } }, recommendations: { type: "array", items: { type: "string" } }, cash_flow_prediction: { type: "string" } }, required: ["executive_summary", "total_expenses", "top_categories", "recommendations"], additionalProperties: false } } }],
};

const TOOL_CHOICES: Record<string, any> = {
  email_draft: { type: "function", function: { name: "suggest_emails" } },
  hr_assist: { type: "function", function: { name: "hr_insights" } },
  sales_intelligence: { type: "function", function: { name: "sales_insights" } },
  expense_analysis: { type: "function", function: { name: "finance_insights" } },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { operation, context } = await req.json();
    if (!operation || !SYSTEM_PROMPTS[operation]) {
      return new Response(JSON.stringify({ error: "Invalid operation. Valid: " + Object.keys(SYSTEM_PROMPTS).join(", ") }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userPrompt = typeof context === "string" ? context : JSON.stringify(context);

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[operation] },
          { role: "user", content: userPrompt },
        ],
        tools: TOOLS[operation],
        tool_choice: TOOL_CHOICES[operation],
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
    return new Response(JSON.stringify({ operation, result: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-business-ops error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
