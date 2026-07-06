import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { businessData } = await req.json();

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

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a business intelligence analyst. Provide data-driven insights in concise markdown format." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("ai-business-insights upstream error:", response.status, errBody);
      // Return a friendly markdown message as a successful 200 so the UI renders it inline
      // instead of throwing and triggering a blank-screen runtime error.
      const friendly =
        response.status === 429 || response.status === 402
          ? "## ⚠️ AI Provider Quota Exceeded\n\nThe configured AI provider has run out of credits or hit a rate limit.\n\n**What to do:**\n- Open **Super Admin → AI Configuration** to check provider status & error logs\n- Add billing / new API key for the active provider, OR\n- Switch to a provider that has available quota (OpenAI / Anthropic / Google)\n\n_Insights will resume automatically once quota is restored._"
          : "## ⚠️ AI Service Temporarily Unavailable\n\nWe couldn't generate insights right now. Please try again in a moment.";
      return new Response(JSON.stringify({ insights: friendly }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || "No insights generated.";

    return new Response(JSON.stringify({ insights }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-business-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
