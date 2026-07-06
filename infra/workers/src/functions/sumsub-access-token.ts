// Ported from supabase/functions/sumsub-access-token/index.ts.
// User identity comes from the Worker-issued token (contextFromRequest); admin
// reads/writes go through the service-role session. Sumsub HMAC calls preserved verbatim.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { getPlatformSetting } from "../_shared/secrets";

interface SumsubConfig {
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

function extractLevelNames(payload: any): string[] {
  const candidates = [
    payload,
    payload?.list,
    payload?.items,
    payload?.levels,
    payload?.verificationLevels,
    payload?.data,
    payload?.data?.list,
    payload?.data?.items,
    payload?.result,
    payload?.result?.list,
  ];

  const firstArray = candidates.find((c) => Array.isArray(c)) as any[] | undefined;
  if (!firstArray) return [];

  return firstArray
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.name || item?.id || item?.levelName || null;
    })
    .filter((name): name is string => Boolean(name));
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return J({ error: "Unauthorized" }, 401);
    }

    // Verify user from the Worker-issued token.
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) {
      return J({ error: "Invalid auth token" }, 401);
    }
    const userId = ctx.userId;
    const userEmail = ctx.email;
    const { action } = await req.json() as any;

    // Get Sumsub config from platform_settings
    const config = (await getPlatformSetting<SumsubConfig>(sql, "kyc_verification_config")) || ({} as SumsubConfig);

    if (config.method !== "sumsub") {
      return J({ error: "Sumsub verification is not enabled" }, 400);
    }

    const isSandbox = config.sumsub_environment === "sandbox" || (!config.sumsub_environment && (config as any).sumsub_app_token?.startsWith("sbx:"));
    const appToken = isSandbox
      ? (config.sumsub_sandbox_app_token || (config as any).sumsub_app_token)
      : (config.sumsub_live_app_token || (config as any).sumsub_app_token);
    const secretKey = isSandbox
      ? (config.sumsub_sandbox_secret_key || (config as any).sumsub_secret_key)
      : (config.sumsub_live_secret_key || (config as any).sumsub_secret_key);
    const baseUrl = isSandbox
      ? "https://api.sumsub.com"
      : "https://api.sumsub.com";
    // Sumsub uses same API URL for both, sandbox is controlled by credentials

    if (!appToken || !secretKey) {
      return J({ error: `Sumsub ${isSandbox ? "sandbox" : "live"} credentials are not configured` }, 400);
    }

    let levelName = config.sumsub_level_name || "basic-kyc-level";

    if (action === "create-access-token") {
      // Validate configured level and fallback to first available when needed
      const tsCheck = Math.floor(Date.now() / 1000).toString();
      const levelsUrl = "/resources/applicants/-/levels";
      const levelsSignature = await createHmacSignature(secretKey, "GET", levelsUrl, tsCheck, "");

      const levelsResp = await fetch(`${baseUrl}${levelsUrl}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-App-Token": appToken,
          "X-App-Access-Sig": levelsSignature,
          "X-App-Access-Ts": tsCheck,
        },
      });

      const levelsText = await levelsResp.text();
      if (!levelsResp.ok) {
        return J({
          error: "Failed to fetch Sumsub verification levels",
          status: levelsResp.status,
          details: levelsText,
        }, 500);
      }

      let parsedLevels: any = null;
      try {
        parsedLevels = levelsText ? JSON.parse(levelsText) : null;
      } catch {
        parsedLevels = null;
      }

      const levelNames = extractLevelNames(parsedLevels);

      if (levelNames.length === 0) {
        return J({
          error: "No verification levels found in your Sumsub account",
          details: "Create at least one level in Sumsub Dashboard → Verification Levels, then retry.",
        }, 400);
      }

      if (!levelNames.includes(levelName)) {
        console.log(`Level '${levelName}' not found. Available: ${levelNames.join(", ")}. Using first: ${levelNames[0]}`);
        levelName = levelNames[0];
      }

      // Generate access token for the applicant
      const ts = Math.floor(Date.now() / 1000).toString();
      const method = "POST";
      const url = `/resources/accessTokens?userId=${userId}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=1200`;
      const body = "";

      const signature = await createHmacSignature(secretKey, method, url, ts, body);

      const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-App-Token": appToken,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": ts,
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error("Sumsub access token error:", response.status, responseText);
        return J({
          error: "Failed to create Sumsub access token",
          details: responseText,
          status: response.status,
        }, 500);
      }

      const tokenData = JSON.parse(responseText);

      // Create/update KYC record in pending state
      await withSession(sql, SERVICE, async (tx) => {
        await tx`DELETE FROM public.kyc_verifications WHERE user_id = ${userId} AND status IN ${tx(["pending", "rejected"])}`;

        // Get user's tenant
        const profiles = await tx`SELECT tenant_id FROM public.profiles WHERE user_id = ${userId} LIMIT 1`;
        const tenantId = profiles[0]?.tenant_id;

        if (tenantId) {
          await tx`INSERT INTO public.kyc_verifications ${tx({
            user_id: userId,
            tenant_id: tenantId,
            full_name: userEmail || "Sumsub User",
            document_type: "sumsub",
            document_number: `sumsub-${userId}`,
            status: "under_review",
          })}`;
        }
      });

      return J({
        token: tokenData.token,
        userId: tokenData.userId || userId,
        environment: isSandbox ? "sandbox" : "live",
      });
    }

    if (action === "check-status") {
      // Check applicant status from Sumsub
      const ts = Math.floor(Date.now() / 1000).toString();
      const method = "GET";
      const url = `/resources/applicants/-;externalUserId=${userId}/one`;
      const body = "";

      const signature = await createHmacSignature(secretKey, method, url, ts, body);

      const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
          Accept: "application/json",
          "X-App-Token": appToken,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": ts,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Sumsub status check error:", response.status, errText);
        return J({ error: "Failed to check status", details: errText }, 500);
      }

      const applicantData = await response.json() as any;
      const reviewStatus = applicantData?.review?.reviewResult?.reviewAnswer;

      // Map Sumsub status to our KYC status
      let kycStatus = "under_review";
      let rejectionReason: string | null = null;

      if (reviewStatus === "GREEN") {
        kycStatus = "approved";
      } else if (reviewStatus === "RED") {
        kycStatus = "rejected";
        rejectionReason =
          applicantData?.review?.reviewResult?.rejectLabels?.join(", ") ||
          "Verification failed";
      }

      // Update our KYC record
      if (kycStatus !== "under_review") {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.kyc_verifications SET status = ${kycStatus}, reviewed_at = ${new Date().toISOString()}, rejection_reason = ${rejectionReason} WHERE user_id = ${userId} AND status = 'under_review'`);
      }

      return J({
        sumsub_status: reviewStatus || "PENDING",
        kyc_status: kycStatus,
        applicant_id: applicantData?.id,
      });
    }

    if (action === "test-credentials") {
      // Test if Sumsub credentials work by listing levels
      const ts = Math.floor(Date.now() / 1000).toString();
      const method = "GET";
      const url = "/resources/applicants/-/levels";
      const body = "";

      const signature = await createHmacSignature(secretKey, method, url, ts, body);

      const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
          Accept: "application/json",
          "X-App-Token": appToken,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": ts,
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        return J({
          success: false,
          error: `Sumsub API returned ${response.status}`,
          details: responseText,
        });
      }

      let parsed: any = null;
      try {
        parsed = responseText ? JSON.parse(responseText) : null;
      } catch {
        parsed = null;
      }
      const levelNames = extractLevelNames(parsed);

      return J({
        success: true,
        environment: isSandbox ? "sandbox" : "live",
        levels_found: levelNames.length,
        level_names: levelNames,
        configured_level: levelName,
        configured_level_exists: levelNames.includes(levelName),
        message: `Successfully connected to Sumsub (${isSandbox ? "Sandbox" : "Live"})`,
      });
    }

    return J({ error: "Invalid action. Use: create-access-token, check-status, test-credentials" }, 400);
  } catch (e) {
    console.error("sumsub-access-token error:", e);
    return J({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
