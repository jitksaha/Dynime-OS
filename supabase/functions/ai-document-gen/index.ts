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

    const { tenant_id, doc_type, context: userContext } = await req.json();
    if (!tenant_id || !doc_type) return new Response(JSON.stringify({ error: "tenant_id and doc_type required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch tenant info for branding
    const { data: tenant } = await adminClient.from("tenants").select("name, industry, country, currency").eq("id", tenant_id).single();

    // Fetch relevant data based on document type
    let businessData: any = { company: tenant };

    if (doc_type === "proposal" || doc_type === "contract") {
      const [dealsRes, profileRes] = await Promise.all([
        adminClient.from("deals").select("name, contact_name, email, value, stage").eq("tenant_id", tenant_id).limit(10),
        adminClient.from("profiles").select("full_name").eq("user_id", user.id).single(),
      ]);
      businessData.deals = dealsRes.data || [];
      businessData.author = profileRes.data?.full_name || user.email;
    } else if (doc_type === "report") {
      const [dealsRes, invoicesRes, expensesRes] = await Promise.all([
        adminClient.from("deals").select("name, contact_name, stage, value, created_at").eq("tenant_id", tenant_id).limit(50),
        adminClient.from("invoices").select("client_name, status, total_amount, created_at, due_date").eq("tenant_id", tenant_id).limit(50),
        adminClient.from("expenses").select("category, amount, status, created_at").eq("tenant_id", tenant_id).limit(50),
      ]);
      businessData.deals = dealsRes.data || [];
      businessData.invoices = invoicesRes.data || [];
      businessData.expenses = expensesRes.data || [];
    } else if (doc_type === "sow") {
      const [projectsRes] = await Promise.all([
        adminClient.from("projects").select("name, description, status, priority, start_date, end_date, budget").eq("tenant_id", tenant_id).limit(10),
      ]);
      businessData.projects = projectsRes.data || [];
    }

    const docTypeLabels: Record<string, string> = {
      proposal: "Business Proposal",
      contract: "Service Contract / Agreement",
      report: "Business Performance Report",
      sow: "Statement of Work",
      nda: "Non-Disclosure Agreement",
      memo: "Internal Business Memo",
    };

    const systemPrompt = `You are an expert business document writer. Generate professional, well-structured ${docTypeLabels[doc_type] || doc_type} documents. Use formal business language, include all standard sections, and personalize with the provided company data. Output should be publication-ready with proper formatting using Markdown.`;

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
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
    console.error("ai-document-gen error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
