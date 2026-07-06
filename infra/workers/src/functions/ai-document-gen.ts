// Ported from supabase/functions/ai-document-gen/index.ts — gathers tenant/business
// data (service-role) and generates a business document via ai-proxy tool-calling.
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

    const { tenant_id, doc_type, context: userContext } = await req.json() as any;
    if (!tenant_id || !doc_type) return error("tenant_id and doc_type required", 400);

    const sql = connect(env);
    const userId = ctx.userId;

    const businessData: any = await withSession(sql, SERVICE, async (tx) => {
      // Fetch tenant info for branding
      const tenantRows = await tx`SELECT name, industry, country, currency FROM tenants WHERE id = ${tenant_id}`;
      const data: any = { company: tenantRows[0] ?? null };

      // Fetch relevant data based on document type
      if (doc_type === "proposal" || doc_type === "contract") {
        const [deals, profile] = await Promise.all([
          tx`SELECT name, contact_name, email, value, stage FROM deals WHERE tenant_id = ${tenant_id} LIMIT 10`,
          tx`SELECT full_name FROM profiles WHERE user_id = ${userId}`,
        ]);
        data.deals = deals || [];
        data.author = profile[0]?.full_name || ctx.email;
      } else if (doc_type === "report") {
        const [deals, invoices, expenses] = await Promise.all([
          tx`SELECT name, contact_name, stage, value, created_at FROM deals WHERE tenant_id = ${tenant_id} LIMIT 50`,
          tx`SELECT client_name, status, total_amount, created_at, due_date FROM invoices WHERE tenant_id = ${tenant_id} LIMIT 50`,
          tx`SELECT category, amount, status, created_at FROM expenses WHERE tenant_id = ${tenant_id} LIMIT 50`,
        ]);
        data.deals = deals || [];
        data.invoices = invoices || [];
        data.expenses = expenses || [];
      } else if (doc_type === "sow") {
        const projects = await tx`SELECT name, description, status, priority, start_date, end_date, budget FROM projects WHERE tenant_id = ${tenant_id} LIMIT 10`;
        data.projects = projects || [];
      }
      return data;
    });

    const docTypeLabels: Record<string, string> = {
      proposal: "Business Proposal",
      contract: "Service Contract / Agreement",
      report: "Business Performance Report",
      sow: "Statement of Work",
      nda: "Non-Disclosure Agreement",
      memo: "Internal Business Memo",
    };

    const systemPrompt = `You are an expert business document writer. Generate professional, well-structured ${docTypeLabels[doc_type] || doc_type} documents. Use formal business language, include all standard sections, and personalize with the provided company data. Output should be publication-ready with proper formatting using Markdown.`;

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ doc_type, user_instructions: userContext, business_data: businessData, instruction: `Generate a complete, professional ${docTypeLabels[doc_type] || doc_type}. Use the business data to personalize. The user's specific instructions: "${userContext || 'Generate a standard document'}"` }) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_document",
            description: "Return the generated document",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Document title" },
                content: { type: "string", description: "Full document content in Markdown format" },
                summary: { type: "string", description: "Brief summary of the document" },
                sections: { type: "array", items: { type: "string" }, description: "List of section headings in the document" },
                metadata: {
                  type: "object",
                  properties: {
                    word_count: { type: "number" },
                    document_type: { type: "string" },
                    date_generated: { type: "string" },
                    confidentiality: { type: "string", enum: ["public", "internal", "confidential", "strictly_confidential"] },
                  },
                },
              },
              required: ["title", "content", "summary", "sections", "metadata"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_document" } },
        max_tokens: 4096,
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
    console.error("ai-document-gen error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
