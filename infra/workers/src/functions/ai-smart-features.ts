// Ported from supabase/functions/ai-smart-features/index.ts — auto_fill /
// natural_language_search / meeting_summary helpers via ai-proxy tool-calling.
// Original had no auth gate; preserved. Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders, json } from "../_shared/cors";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const { type, context } = await req.json() as any;

    let systemPrompt = "";
    let tools: any[] = [];
    let toolChoice: any = undefined;

    if (type === "auto_fill") {
      systemPrompt = `You are a smart form auto-fill assistant. Given partial form data and the form type, suggest values for empty fields based on the provided context. Only suggest reasonable, professional values.`;
      tools = [{ type: "function", function: { name: "suggest_fields", description: "Return suggested values for empty form fields.", parameters: { type: "object", properties: { suggestions: { type: "array", items: { type: "object", properties: { field_name: { type: "string" }, suggested_value: { type: "string" }, confidence: { type: "number" } }, required: ["field_name", "suggested_value", "confidence"] } } }, required: ["suggestions"] } } }];
      toolChoice = { type: "function", function: { name: "suggest_fields" } };
    } else if (type === "natural_language_search") {
      systemPrompt = `You are a search query translator. Convert natural language search queries into structured database filters. The available modules are: employees, deals, invoices, expenses, projects, documents, attendance_records, meetings, campaigns. Return the module to search and filters to apply.`;
      tools = [{ type: "function", function: { name: "translate_search", description: "Convert natural language to structured search parameters.", parameters: { type: "object", properties: { module: { type: "string", enum: ["employees", "deals", "invoices", "expenses", "projects", "documents", "attendance_records", "meetings", "campaigns"] }, filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike"] }, value: { type: "string" } }, required: ["column", "operator", "value"] } }, sort_by: { type: "string" }, sort_order: { type: "string", enum: ["asc", "desc"] }, summary: { type: "string" } }, required: ["module", "filters", "summary"] } } }];
      toolChoice = { type: "function", function: { name: "translate_search" } };
    } else if (type === "meeting_summary") {
      systemPrompt = `You are a meeting notes summarizer. Given meeting notes or descriptions, extract key discussion points, decisions made, and action items with assignees if mentioned. Be concise and professional.`;
      tools = [{ type: "function", function: { name: "summarize_meeting", description: "Extract structured summary from meeting notes.", parameters: { type: "object", properties: { summary: { type: "string" }, key_points: { type: "array", items: { type: "string" } }, decisions: { type: "array", items: { type: "string" } }, action_items: { type: "array", items: { type: "object", properties: { task: { type: "string" }, assignee: { type: "string" }, deadline: { type: "string" } }, required: ["task"] } } }, required: ["summary", "key_points", "action_items"] } } }];
      toolChoice = { type: "function", function: { name: "summarize_meeting" } };
    } else {
      return json({ error: "Invalid type" }, { status: 400 });
    }

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(context) },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json() as any;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result = {};
    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch { result = { raw: toolCall.function.arguments }; }
    }

    return json({ result });
  } catch (e) {
    console.error("ai-smart-features error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
