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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, currentModule, tenantId, businessContext } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are Dynime Copilot — an AI command bar assistant embedded in an enterprise SaaS platform. You help users navigate, analyze data, draft content, and take actions across business modules.

## Current Context
- Module: ${currentModule || "Dashboard"}
- Tenant ID: ${tenantId || "unknown"}
${businessContext ? `- Business Data: ${JSON.stringify(businessContext)}` : ""}

## Capabilities
You can help with:
1. **Navigation** — Guide users to the right page/module
2. **Data Queries** — Answer questions about revenue, employees, deals, projects, etc.
3. **Content Generation** — Draft emails, invoices, reports, meeting agendas
4. **Quick Actions** — Create records, schedule meetings, assign tasks
5. **Analysis** — Provide insights on business performance, trends, anomalies

## Response Format
Always respond with a JSON object using the tool call. Be concise and actionable.
- For navigation: include the route path
- For data answers: include formatted numbers and brief analysis
- For content: include the draft text
- For actions: describe what will be created and the parameters`;

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        tools: [{
          type: "function",
          function: {
            name: "copilot_response",
            description: "Return a structured copilot response with actions",
            parameters: {
              type: "object",
              properties: {
                answer: {
                  type: "string",
                  description: "The main text answer to the user's query. Use markdown for formatting.",
                },
                actions: {
                  type: "array",
                  description: "Suggested follow-up actions the user can take",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", description: "Button label for the action" },
                      type: {
                        type: "string",
                        enum: ["navigate", "create", "draft", "analyze"],
                        description: "Type of action",
                      },
                      route: { type: "string", description: "Route to navigate to (for navigate type)" },
                      data: { type: "string", description: "Additional data or draft content" },
                      icon: {
                        type: "string",
                        enum: ["arrow-right", "plus", "file-text", "bar-chart", "mail", "calendar", "users", "dollar-sign", "briefcase", "clipboard"],
                        description: "Icon for the action button",
                      },
                    },
                    required: ["label", "type", "icon"],
                    additionalProperties: false,
                  },
                },
                category: {
                  type: "string",
                  enum: ["navigation", "data", "content", "action", "insight"],
                  description: "Category of the response",
                },
              },
              required: ["answer", "actions", "category"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "copilot_response" } },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("AI proxy error:", response.status, errBody);
      const friendly = "⚠️ Platform AI is currently experiencing an error. Please wait — we're working to fix it.";
      return new Response(
        JSON.stringify({
          answer: friendly,
          actions: [],
          category: "data",
          platform_error: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall
      ? JSON.parse(toolCall.function.arguments)
      : { answer: data.choices?.[0]?.message?.content || "I couldn't process that request.", actions: [], category: "data" };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
