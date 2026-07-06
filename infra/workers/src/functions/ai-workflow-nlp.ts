// Ported from supabase/functions/ai-workflow-nlp/index.ts — converts a natural
// language process description into a structured workflow via ai-proxy tool-calling.
// Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { contextFromRequest } from "../_shared/auth-context";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Unauthorized", 401);
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId && ctx.role !== "service_role") return error("Invalid token", 401);

    const { tenant_id, description } = await req.json() as any;
    if (!tenant_id || !description) return error("tenant_id and description required", 400);

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
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
    console.error("ai-workflow-nlp error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
