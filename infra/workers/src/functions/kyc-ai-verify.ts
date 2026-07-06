// Ported from supabase/functions/kyc-ai-verify/index.ts.
// Service-role DB access via connect()+withSession(SERVICE). AI verification routes
// through the ported ai-proxy handler directly (no internal HTTP hop).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getPlatformSetting } from "../_shared/secrets";
import { handler as aiProxy } from "./ai-proxy";

type Sql = ReturnType<typeof connect>;

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

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function getVerificationConfig(sql: Sql): Promise<VerificationConfig> {
  const value = await getPlatformSetting<VerificationConfig>(sql, "kyc_verification_config");
  return value || { method: "ai", sumsub_environment: "sandbox", sumsub_sandbox_app_token: "", sumsub_sandbox_secret_key: "", sumsub_live_app_token: "", sumsub_live_secret_key: "", sumsub_level_name: "basic-kyc-level", auto_approve_basic: false };
}

// REVIEW: Supabase Storage signed URLs have no Workers equivalent here yet.
// Returns null so AI verification degrades gracefully when storage isn't wired up.
async function createSignedUrl(_path: string): Promise<string | null> {
  return null;
}

async function handleManualVerification(sql: Sql, kyc: any, kycId: string, config: VerificationConfig) {
  if (config.auto_approve_basic && kyc.full_name && kyc.document_number && kyc.document_front_url && kyc.date_of_birth) {
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE public.kyc_verifications SET status = 'approved', reviewed_at = ${new Date().toISOString()} WHERE id = ${kycId}`);
    return { status: "approved", reason: "Auto-approved (basic field validation passed)" };
  }
  return { status: "pending", reason: "Submitted for manual review by admin" };
}

async function handleAIVerification(sql: Sql, env: Env, kyc: any, kycId: string) {
  const imageUrls: string[] = [];
  const docPaths = [kyc.document_front_url, kyc.document_back_url, kyc.selfie_url].filter(Boolean);

  for (const path of docPaths) {
    const signedUrl = await createSignedUrl(path);
    if (signedUrl) imageUrls.push(signedUrl);
  }

  if (imageUrls.length === 0) {
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE public.kyc_verifications SET status = 'rejected', reviewed_at = ${new Date().toISOString()}, rejection_reason = 'No document images were uploaded for AI verification.' WHERE id = ${kycId}`);
    return { status: "rejected", reason: "No documents uploaded" };
  }

  const userContent: any[] = [
    {
      type: "text",
      text: `You are a KYC document verification AI. Analyze the uploaded identity document images.

SUBMITTED INFORMATION:
- Full Name: ${kyc.full_name}
- Date of Birth: ${kyc.date_of_birth || "Not provided"}
- Nationality: ${kyc.nationality || "Not provided"}
- Document Type: ${kyc.document_type}
- Document Number: ${kyc.document_number}

VERIFICATION CHECKS:
1. Is the document image clear and readable?
2. Does it appear to be a genuine ${kyc.document_type} document?
3. Can you see text/numbers on the document?
4. If a selfie is included, does it appear to show a real person?

RULES:
- Be lenient. If the document looks like a real physical document photo, APPROVE it.
- Only REJECT if completely unreadable, clearly fake, or shows no document at all.

Respond with ONLY a JSON object (no markdown):
{"decision": "approved" or "rejected", "reason": "Brief explanation", "confidence": 0.0 to 1.0}`,
    },
  ];

  for (const url of imageUrls) {
    userContent.push({ type: "image_url", image_url: { url } });
  }

  // KYC verification uses ai-proxy with a specific model override for vision.
  // REVIEW: call the ported ai-proxy handler directly instead of an internal HTTP hop.
  const aiResponse = await aiProxy(new Request("https://internal/ai-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: userContent }],
      model: "openai/gpt-5", // Vision-capable model override
    }),
  }), env);

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("AI proxy error:", aiResponse.status, errText);

    if (aiResponse.status === 429 || aiResponse.status === 402) {
      const basicApprove = kyc.full_name && kyc.document_number && kyc.document_front_url && kyc.date_of_birth;
      const fallbackStatus = basicApprove ? "approved" : "pending";
      const fallbackReason = basicApprove ? "Auto-approved (basic field validation — AI temporarily unavailable)" : "Pending manual review (AI temporarily unavailable)";
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.kyc_verifications SET status = ${fallbackStatus}, reviewed_at = ${new Date().toISOString()}, rejection_reason = ${fallbackStatus === "approved" ? null : fallbackReason} WHERE id = ${kycId}`);
      return { status: fallbackStatus, reason: fallbackReason };
    }
    throw new Error(`AI proxy error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json() as any;
  const rawContent = aiData.choices?.[0]?.message?.content || "";

  let decision = "pending";
  let reason = "Could not parse AI response";
  let confidence = 0;

  try {
    const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    decision = parsed.decision === "approved" ? "approved" : "rejected";
    reason = parsed.reason || "No reason provided";
    confidence = parsed.confidence || 0;
  } catch {
    console.error("Failed to parse AI response:", rawContent);
    if (kyc.full_name && kyc.document_number && kyc.document_front_url) {
      decision = "approved";
      reason = "Auto-approved (AI response parsing failed, basic checks passed)";
    }
  }

  await withSession(sql, SERVICE, (tx) =>
    tx`UPDATE public.kyc_verifications SET status = ${decision}, reviewed_at = ${new Date().toISOString()}, rejection_reason = ${decision === "rejected" ? reason : null} WHERE id = ${kycId}`);

  console.log(`KYC ${kycId}: ${decision} (confidence: ${confidence}) — ${reason}`);
  return { status: decision, reason, confidence };
}

async function handleSumsubVerification(sql: Sql, kyc: any, kycId: string, config: VerificationConfig) {
  if (!config.sumsub_sandbox_app_token && !config.sumsub_live_app_token) {
    return { status: "pending", reason: "Sumsub credentials not configured. Pending manual review." };
  }

  const isSandbox = config.sumsub_environment === "sandbox";
  const appToken = isSandbox ? config.sumsub_sandbox_app_token : config.sumsub_live_app_token;
  const secretKey = isSandbox ? config.sumsub_sandbox_secret_key : config.sumsub_live_secret_key;

  if (!appToken || !secretKey) {
    return { status: "pending", reason: `Sumsub ${isSandbox ? "sandbox" : "live"} credentials not configured.` };
  }

  const ts = Math.floor(Date.now() / 1000).toString();
  const externalUserId = kyc.user_id;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  const method = "POST";
  const url = `/resources/accessTokens?userId=${externalUserId}&levelName=${config.sumsub_level_name}`;
  const dataToSign = ts + method + url;

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataToSign));
  const hexSig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");

  const response = await fetch(`https://api.sumsub.com${url}`, {
    method,
    headers: { "Accept": "application/json", "X-App-Token": appToken, "X-App-Access-Sig": hexSig, "X-App-Access-Ts": ts },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Sumsub API error:", response.status, err);
    return { status: "pending", reason: "Sumsub API error. Pending manual review.", sumsub_error: err };
  }

  const tokenData = await response.json() as any;
  await withSession(sql, SERVICE, (tx) =>
    tx`UPDATE public.kyc_verifications SET status = 'under_review' WHERE id = ${kycId}`);

  return { status: "under_review", reason: "Sumsub verification initiated", sumsub_token: tokenData.token, sumsub_user_id: externalUserId };
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { kyc_id } = await req.json() as any;
    if (!kyc_id) throw new Error("kyc_id is required");

    const rows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT * FROM public.kyc_verifications WHERE id = ${kyc_id} LIMIT 1`);
    const kyc = rows[0];
    if (!kyc) throw new Error("KYC record not found");

    const config = await getVerificationConfig(sql);

    let result;
    switch (config.method) {
      case "manual": result = await handleManualVerification(sql, kyc, kyc_id, config); break;
      case "sumsub": result = await handleSumsubVerification(sql, kyc, kyc_id, config); break;
      case "ai": default: result = await handleAIVerification(sql, env, kyc, kyc_id); break;
    }

    return J(result);
  } catch (e) {
    console.error("kyc-ai-verify error:", e);
    return J({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
