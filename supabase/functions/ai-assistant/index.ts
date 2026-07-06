import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SYSTEM_PROMPT = `You are an AI Assistant — a smart business analytics helper embedded in an ERP/CRM platform. You help users with:

1. **Report Generation**: Summarize business data, create executive summaries, and generate insights.
2. **Data Insights**: Analyze trends in sales, HR, finance, and marketing data.
3. **Module Suggestions**: Recommend workflows, optimizations, and best practices.
4. **Task Assistance**: Help draft emails, create project plans, and suggest next steps.

Keep responses concise, actionable, and formatted with markdown. Use tables for data comparisons. Be proactive in suggesting follow-up actions.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    // Fetch system prompt override from AI config
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "ai_config").maybeSingle();
      if (data?.value) {
        const config = data.value as Record<string, any>;
        if (config.system_prompt) systemPrompt = config.system_prompt;
      }
    } catch {}

    // Route through ai-proxy
    const proxyResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!proxyResp.ok) {
      const errBody = await proxyResp.text();
      console.error("ai-proxy error:", proxyResp.status, errBody);
      // Return a friendly SSE chunk so streaming UIs don't blank-screen
      const friendly = "⚠️ Platform AI is currently experiencing an error (provider quota or rate limit). Please wait — we're working to fix it.";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunk = { choices: [{ delta: { content: friendly }, index: 0 }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(proxyResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
