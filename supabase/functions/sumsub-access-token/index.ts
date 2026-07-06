import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const { action } = await req.json();

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get Sumsub config from platform_settings
    const { data: configRow } = await adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", "kyc_verification_config")
      .maybeSingle();

    const config: SumsubConfig = configRow?.value as any || {};

    if (config.method !== "sumsub") {
      return new Response(
        JSON.stringify({ error: "Sumsub verification is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({
          error: `Sumsub ${isSandbox ? "sandbox" : "live"} credentials are not configured`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        return new Response(
          JSON.stringify({
            error: "Failed to fetch Sumsub verification levels",
            status: levelsResp.status,
            details: levelsText,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let parsedLevels: any = null;
      try {
        parsedLevels = levelsText ? JSON.parse(levelsText) : null;
      } catch {
        parsedLevels = null;
      }

      const levelNames = extractLevelNames(parsedLevels);

      if (levelNames.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No verification levels found in your Sumsub account",
            details: "Create at least one level in Sumsub Dashboard → Verification Levels, then retry.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
        return new Response(
          JSON.stringify({
            error: "Failed to create Sumsub access token",
            details: responseText,
            status: response.status,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData = JSON.parse(responseText);

      // Create/update KYC record in pending state
      await adminClient.from("kyc_verifications").delete()
        .eq("user_id", userId)
        .in("status", ["pending", "rejected"]);

      // Get user's tenant
      const { data: profile } = await adminClient
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", userId)
        .single();

      if (profile?.tenant_id) {
        await adminClient.from("kyc_verifications").insert({
          user_id: userId,
          tenant_id: profile.tenant_id,
          full_name: claimsData.user.email || "Sumsub User",
          document_type: "sumsub",
          document_number: `sumsub-${userId}`,
          status: "under_review",
        } as any);
      }

      return new Response(
        JSON.stringify({
          token: tokenData.token,
          userId: tokenData.userId || userId,
          environment: isSandbox ? "sandbox" : "live",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        return new Response(
          JSON.stringify({ error: "Failed to check status", details: errText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const applicantData = await response.json();
      const reviewStatus = applicantData?.review?.reviewResult?.reviewAnswer;

      // Map Sumsub status to our KYC status
      let kycStatus = "under_review";
      let rejectionReason = null;

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
        await adminClient
          .from("kyc_verifications")
          .update({
            status: kycStatus,
            reviewed_at: new Date().toISOString(),
            rejection_reason: rejectionReason,
          } as any)
          .eq("user_id", userId)
          .eq("status", "under_review");
      }

      return new Response(
        JSON.stringify({
          sumsub_status: reviewStatus || "PENDING",
          kyc_status: kycStatus,
          applicant_id: applicantData?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        return new Response(
          JSON.stringify({
            success: false,
            error: `Sumsub API returned ${response.status}`,
            details: responseText,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let parsed: any = null;
      try {
        parsed = responseText ? JSON.parse(responseText) : null;
      } catch {
        parsed = null;
      }
      const levelNames = extractLevelNames(parsed);

      return new Response(
        JSON.stringify({
          success: true,
          environment: isSandbox ? "sandbox" : "live",
          levels_found: levelNames.length,
          level_names: levelNames,
          configured_level: levelName,
          configured_level_exists: levelNames.includes(levelName),
          message: `Successfully connected to Sumsub (${isSandbox ? "Sandbox" : "Live"})`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: create-access-token, check-status, test-credentials" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sumsub-access-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
