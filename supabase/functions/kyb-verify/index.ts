import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerificationConfig {
  method: "manual" | "ai" | "sumsub";
  sumsub_environment: "sandbox" | "live";
  sumsub_sandbox_app_token: string;
  sumsub_sandbox_secret_key: string;
  sumsub_live_app_token: string;
  sumsub_live_secret_key: string;
  sumsub_level_name: string;
  auto_approve_basic: boolean;
}

async function getVerificationConfig(supabase: any): Promise<VerificationConfig> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "kyc_verification_config")
    .maybeSingle();
  return data?.value || {
    method: "ai",
    sumsub_environment: "sandbox",
    sumsub_sandbox_app_token: "",
    sumsub_sandbox_secret_key: "",
    sumsub_live_app_token: "",
    sumsub_live_secret_key: "",
    sumsub_level_name: "basic-kyc-level",
    auto_approve_basic: false,
  };
}

async function createHmacSignature(
  secretKey: string,
  method: string,
  url: string,
  ts: string,
  body: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const dataToSign = ts + method + url + body;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataToSign));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── AI Verification for KYB ───
async function verifyWithAI(supabase: any, tenant: any, tenantId: string) {
  // Use ai-proxy for AI verification (routes through configured provider)
  // Collect document URLs for AI analysis
  const docs = tenant.kyb_documents || {};
  const imageUrls: { label: string; url: string }[] = [];

  for (const [key, value] of Object.entries(docs)) {
    if (value && (value as any).path) {
      const { data } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl((value as any).path, 600);
      if (data?.signedUrl) {
        imageUrls.push({ label: key, url: data.signedUrl });
      }
    }
  }

  // Build comprehensive business data summary
  const businessData = `
BUSINESS INFORMATION:
- Legal Business Name: ${tenant.kyb_business_name || "Not provided"}
- Business Type: ${tenant.kyb_business_type || "Not provided"}
- Country: ${tenant.kyb_country || "Not provided"}
- Registration Number: ${tenant.kyb_registration_number || "Not provided"}
- Tax ID: ${tenant.kyb_tax_id || "Not provided"}
- Industry: ${tenant.industry || "Not provided"}
- Incorporation Date: ${tenant.kyb_incorporation_date || "Not provided"}
- Employee Count: ${tenant.kyb_employee_count || "Not provided"}
- Website: ${tenant.kyb_website || "Not provided"}

CONTACT:
- Email: ${tenant.kyb_email || "Not provided"}
- Phone: ${tenant.kyb_phone || "Not provided"}

ADDRESS:
- Street: ${tenant.kyb_business_address || "Not provided"}
- City: ${tenant.kyb_city || "Not provided"}
- State: ${tenant.kyb_state || "Not provided"}
- Postal Code: ${tenant.kyb_postal_code || "Not provided"}

AUTHORIZED REPRESENTATIVE:
- Name: ${tenant.kyb_authorized_rep_name || "Not provided"}
- Title: ${tenant.kyb_authorized_rep_title || "Not provided"}
- Email: ${tenant.kyb_authorized_rep_email || "Not provided"}
- Phone: ${tenant.kyb_authorized_rep_phone || "Not provided"}
- DOB: ${tenant.kyb_authorized_rep_dob || "Not provided"}

FINANCIAL:
- Annual Revenue: ${tenant.kyb_annual_revenue || "Not provided"}
- Source of Funds: ${tenant.kyb_source_of_funds || "Not provided"}
- Purpose of Account: ${tenant.kyb_purpose_of_account || "Not provided"}

BENEFICIAL OWNERS:
${tenant.kyb_beneficial_owners && Array.isArray(tenant.kyb_beneficial_owners) && tenant.kyb_beneficial_owners.length > 0
  ? tenant.kyb_beneficial_owners.map((o: any, i: number) =>
      `  ${i + 1}. ${o.full_name || "Unknown"} - ${o.ownership_percentage || 0}% - Nationality: ${o.nationality || "N/A"} - PEP: ${o.is_pep ? "Yes" : "No"}`
    ).join("\n")
  : "  None provided"}

DOCUMENTS UPLOADED: ${imageUrls.map(d => d.label.replace(/_/g, " ")).join(", ") || "None"}
DOCUMENTS MISSING: ${Object.keys(docs).length === 0 ? "All" : ""}
`;

  const userContent: any[] = [
    {
      type: "text",
      text: `You are a KYB (Know Your Business) verification AI analyst. Analyze the submitted business data and uploaded documents to verify this company.

${businessData}

VERIFICATION CHECKS:
1. Are all critical business fields filled (name, type, registration number, tax ID)?
2. Is the business address complete?
3. Is there an authorized representative with full details?
4. Are the uploaded documents readable and appear genuine?
5. Do the documents match the provided business information?
6. Are there any red flags (e.g., PEP beneficial owners, inconsistent data)?
7. Is financial information provided?

SCORING:
- Give a risk score from 0 (no risk) to 100 (high risk)
- List specific issues found
- Provide a recommendation

RULES:
- Be thorough but fair
- Missing non-critical documents should lower score but not auto-reject
- Inconsistencies between documents and data are serious flags

Respond with ONLY a JSON object (no markdown):
{
  "decision": "approved" or "rejected" or "needs_review",
  "risk_score": 0-100,
  "confidence": 0.0-1.0,
  "reason": "Brief summary of decision",
  "issues": ["issue 1", "issue 2"],
  "checks": {
    "business_info_complete": true/false,
    "address_complete": true/false,
    "representative_verified": true/false,
    "documents_verified": true/false,
    "financials_provided": true/false,
    "no_pep_flags": true/false
  }
}`,
    },
  ];

  // Attach document images for visual analysis
  for (const doc of imageUrls) {
    userContent.push({ type: "image_url", image_url: { url: doc.url } });
  }

  const aiResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errText);

    if (aiResponse.status === 429) {
      return { status: "error", reason: "AI rate limit exceeded. Please try again later." };
    }
    if (aiResponse.status === 402) {
      return { status: "error", reason: "AI credits exhausted. Please add credits." };
    }
    throw new Error(`AI gateway error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content || "";

  try {
    const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const decision = parsed.decision || "needs_review";
    const reason = parsed.reason || "AI analysis complete";

    // Auto-update tenant KYB status based on AI decision
    if (decision === "approved") {
      await supabase.from("tenants").update({
        kyb_status: "approved",
        kyb_verified_at: new Date().toISOString(),
      }).eq("id", tenantId);
    } else if (decision === "rejected") {
      await supabase.from("tenants").update({
        kyb_status: "rejected",
        kyb_rejection_reason: reason,
      }).eq("id", tenantId);
    } else {
      // needs_review → mark as under_review
      await supabase.from("tenants").update({
        kyb_status: "under_review",
      }).eq("id", tenantId);
    }

    return {
      status: decision,
      reason,
      risk_score: parsed.risk_score,
      confidence: parsed.confidence,
      issues: parsed.issues || [],
      checks: parsed.checks || {},
    };
  } catch {
    console.error("Failed to parse AI response:", rawContent);
    return {
      status: "needs_review",
      reason: "AI analysis completed but response could not be parsed. Manual review recommended.",
      raw_response: rawContent.substring(0, 500),
    };
  }
}

// ─── Sumsub Verification for KYB ───
async function verifyWithSumsub(supabase: any, tenant: any, tenantId: string, config: VerificationConfig) {
  const isSandbox = config.sumsub_environment === "sandbox";
  const appToken = isSandbox ? config.sumsub_sandbox_app_token : config.sumsub_live_app_token;
  const secretKey = isSandbox ? config.sumsub_sandbox_secret_key : config.sumsub_live_secret_key;

  if (!appToken || !secretKey) {
    return {
      status: "error",
      reason: `Sumsub ${isSandbox ? "sandbox" : "live"} credentials not configured. Go to Verification Settings to set them up.`,
    };
  }

  const levelName = config.sumsub_level_name || "basic-kyb-level";
  const externalUserId = `kyb-${tenantId}`;

  // Step 1: Create applicant
  const ts1 = Math.floor(Date.now() / 1000).toString();
  const createBody = JSON.stringify({
    externalUserId,
    type: "company",
    info: {
      companyInfo: {
        companyName: tenant.kyb_business_name || tenant.name,
        registrationNumber: tenant.kyb_registration_number || "",
        country: tenant.kyb_country || "",
        legalAddress: tenant.kyb_business_address || "",
        email: tenant.kyb_email || "",
        phone: tenant.kyb_phone || "",
        website: tenant.kyb_website || "",
        taxId: tenant.kyb_tax_id || "",
        incorporatedOn: tenant.kyb_incorporation_date || "",
        type: tenant.kyb_business_type || "",
      },
    },
  });

  const createUrl = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
  const createSig = await createHmacSignature(secretKey, "POST", createUrl, ts1, createBody);

  const createResponse = await fetch(`https://api.sumsub.com${createUrl}`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-App-Token": appToken,
      "X-App-Access-Sig": createSig,
      "X-App-Access-Ts": ts1,
    },
    body: createBody,
  });

  if (!createResponse.ok) {
    const err = await createResponse.text();
    console.error("Sumsub create applicant error:", createResponse.status, err);

    // If applicant already exists, try to get access token
    if (createResponse.status === 409) {
      // Continue to generate access token
    } else {
      return {
        status: "error",
        reason: `Sumsub API error (${createResponse.status}): ${err}`,
      };
    }
  }

  // Step 2: Generate access token for the applicant
  const ts2 = Math.floor(Date.now() / 1000).toString();
  const tokenUrl = `/resources/accessTokens?userId=${externalUserId}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=1200`;
  const tokenSig = await createHmacSignature(secretKey, "POST", tokenUrl, ts2, "");

  const tokenResponse = await fetch(`https://api.sumsub.com${tokenUrl}`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "X-App-Token": appToken,
      "X-App-Access-Sig": tokenSig,
      "X-App-Access-Ts": ts2,
    },
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error("Sumsub access token error:", tokenResponse.status, err);
    return {
      status: "error",
      reason: `Failed to create Sumsub access token: ${err}`,
    };
  }

  const tokenData = await tokenResponse.json();

  // Update KYB status
  await supabase.from("tenants").update({
    kyb_status: "under_review",
  }).eq("id", tenantId);

  return {
    status: "under_review",
    reason: "Sumsub KYB verification initiated. Complete verification in the Sumsub dashboard.",
    sumsub_token: tokenData.token,
    sumsub_user_id: externalUserId,
    environment: isSandbox ? "sandbox" : "live",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, method } = await req.json();
    if (!tenant_id) throw new Error("tenant_id is required");
    if (!method || !["ai", "sumsub"].includes(method)) {
      throw new Error("method must be 'ai' or 'sumsub'");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch tenant data
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenant_id)
      .single();

    if (tenantErr || !tenant) throw new Error("Tenant not found");

    const config = await getVerificationConfig(supabase);

    let result;
    if (method === "sumsub") {
      result = await verifyWithSumsub(supabase, tenant, tenant_id, config);
    } else {
      result = await verifyWithAI(supabase, tenant, tenant_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kyb-verify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
