// Ported from supabase/functions/ai-copilot/index.ts — Dynime Copilot command-bar
// assistant via ai-proxy tool-calling. Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { json, error } from "../_shared/cors";
import { contextFromRequest } from "../_shared/auth-context";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Unauthorized", 401);
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId && ctx.role !== "service_role") return error("Invalid token", 401);

    const { query, currentModule, tenantId, businessContext } = await req.json() as any;
    if (!query) return error("Query is required", 400);

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

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
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
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      console.error("AI proxy error:", response.status, errBody);
      const friendly = "⚠️ Platform AI is currently experiencing an error. Please wait — we're working to fix it.";
      return json({
        answer: friendly,
        actions: [],
        category: "data",
        platform_error: true,
      }, { status: 200 });
    }

    const data = await response.json() as any;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall
      ? JSON.parse(toolCall.function.arguments)
      : { answer: data.choices?.[0]?.message?.content || "I couldn't process that request.", actions: [], category: "data" };

    return json(result);
  } catch (e) {
    console.error("ai-copilot error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
