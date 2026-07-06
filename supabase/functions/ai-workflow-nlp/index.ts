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

    const { tenant_id, description } = await req.json();
    if (!tenant_id || !description) return new Response(JSON.stringify({ error: "tenant_id and description required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: `You are a workflow automation expert. Convert natural language business process descriptions into structured, executable workflow definitions. 

Available trigger types: deal_stage_changed, invoice_created, invoice_overdue, payment_received, employee_onboarded, employee_offboarded, leave_requested, leave_approved, attendance_marked, expense_submitted, expense_approved, ticket_created, ticket_resolved, project_created, task_completed, meeting_scheduled, document_uploaded, form_submitted, schedule (cron), manual.

Available action types: send_email, send_sms, send_whatsapp, send_slack, create_task, create_invoice, update_deal_stage, assign_user, add_note, create_calendar_event, generate_document, send_notification, webhook_call, wait_delay, condition_check, approval_request, update_record, create_record.

Available condition operators: equals, not_equals, greater_than, less_than, contains, not_contains, is_empty, is_not_empty.

Generate practical, ready-to-use workflow definitions.` },
          { role: "user", content: JSON.stringify({ user_description: description, instruction: `Convert this natural language description into a structured workflow: "${description}"` }) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_workflow",
            description: "Return structured workflow definition from natural language",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Short descriptive workflow name" },
                description: { type: "string", description: "What this workflow does" },
                trigger: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    module: { type: "string" },
                    conditions: { type: "array", items: { type: "object", properties: { field: { type: "string" }, operator: { type: "string" }, value: { type: "string" } }, required: ["field", "operator", "value"] } },
                    schedule: { type: "string", description: "Cron expression if schedule trigger" },
                  },
                  required: ["type"],
                },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      order: { type: "number" },
                      name: { type: "string" },
                      type: { type: "string" },
                      config: { type: "object", description: "Action-specific configuration" },
                      condition: { type: "object", properties: { field: { type: "string" }, operator: { type: "string" }, value: { type: "string" } } },
                      on_failure: { type: "string", enum: ["continue", "stop", "retry"] },
                    },
                    required: ["order", "name", "type", "config"],
                  },
                },
                estimated_complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
                modules_involved: { type: "array", items: { type: "string" } },
                notes: { type: "array", items: { type: "string" }, description: "Implementation notes or caveats" },
              },
              required: ["name", "description", "trigger", "steps", "estimated_complexity", "modules_involved"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_workflow" } },
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
    console.error("ai-workflow-nlp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
