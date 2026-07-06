import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Invalid auth token" }, 401);

    const body = await req.json();
    const { action, phone, otp_code } = body;

    // Get user profile for tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("user_id", user.id)
      .single();

    const tenantId = profile?.tenant_id;

    // ===== SEND OTP =====
    if (action === "send_otp") {
      if (!phone || phone.length < 10) {
        return json({ error: "Please enter a valid phone number" }, 400);
      }

      // Rate limit: max 3 OTPs in last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("phone_otp_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", tenMinAgo);

      if ((count || 0) >= 3) {
        return json({ error: "Too many OTP requests. Please wait 10 minutes." }, 429);
      }

      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

      // Save OTP
      await supabase.from("phone_otp_codes").insert({
        user_id: user.id,
        phone,
        otp_code: otpCode,
        expires_at: expiresAt,
      });

      // Get SMS template
      const { data: template } = await supabase
        .from("sms_templates")
        .select("template_body")
        .eq("event_key", "phone_verification")
        .eq("is_active", true)
        .single();

      // Get app name
      const { data: appInfo } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "app_name")
        .maybeSingle();

      const appName = (appInfo?.value as string) || "Dynime";

      const defaultTemplate = `Your ${appName} verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`;
      const message = template
        ? renderTemplate(template.template_body, {
            app_name: appName,
            otp_code: otpCode,
            expiry_minutes: "5",
          })
        : defaultTemplate;

      // Send SMS via sms-send function internally
      // Determine gateway config
      let gatewayKey = "";
      let apiUrl = "";
      let creds: Record<string, any> = {};
      let isOwnGateway = false;

      // Check tenant's own gateway first
      if (tenantId) {
        const { data: tenantConfig } = await supabase
          .from("tenant_sms_gateway_configs")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("is_enabled", true)
          .maybeSingle();

        if (tenantConfig?.use_own_gateway && tenantConfig.gateway_key) {
          gatewayKey = tenantConfig.gateway_key;
          apiUrl = tenantConfig.api_url || "";
          creds = (tenantConfig.credentials as Record<string, any>) || {};
          isOwnGateway = true;
        }
      }

      // Fallback to shared platform gateway
      if (!isOwnGateway) {
        const { data: sharedGw } = await supabase
          .from("sms_gateway_configs")
          .select("*")
          .eq("is_enabled", true)
          .limit(1)
          .maybeSingle();

        if (!sharedGw) {
          return json({ error: "No SMS gateway configured. Contact admin." }, 404);
        }
        gatewayKey = sharedGw.gateway_key;
        apiUrl = sharedGw.api_url;
        creds = (sharedGw.credentials as Record<string, any>) || {};

        // Deduct credit for shared gateway
        if (tenantId) {
          const { data: credited } = await supabase.rpc("deduct_sms_credit", { _tenant_id: tenantId });
          if (!credited) {
            return json({ error: "Insufficient SMS credits. Please top up your balance." }, 402);
          }
        }
      }

      // Dispatch SMS directly using same gateway logic as sms-send
      let smsSuccess = false;
      let smsResponse: any = null;

      try {
        // Use the SUPABASE_URL to call sms-send function
        const smsRes = await fetch(`${SUPABASE_URL}/functions/v1/sms-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            phone,
            message,
            tenant_id: tenantId,
            event_key: "phone_verification",
            sent_by: user.id,
          }),
        });
        smsResponse = await smsRes.json();
        smsSuccess = smsResponse?.success === true;
      } catch (e) {
        console.error("SMS dispatch error:", e);
      }

      if (!smsSuccess) {
        // Refund credit if shared gateway failed
        if (!isOwnGateway && tenantId) {
          await supabase.rpc("add_sms_credits", {
            _tenant_id: tenantId,
            _count: 1,
            _amount: 0,
            _description: "Refund: Phone verification SMS failed",
          });
        }
        return json({
          error: smsResponse?.error || "Failed to send verification SMS. Please try again.",
          failure_code: smsResponse?.failure_code,
        }, 200);
      }

      return json({
        success: true,
        message: "Verification code sent to your phone",
        expires_in_seconds: 300,
      });
    }

    // ===== VERIFY OTP =====
    if (action === "verify_otp") {
      if (!otp_code || !phone) {
        return json({ error: "OTP code and phone are required" }, 400);
      }

      // Get latest non-verified OTP for this user + phone
      const { data: otpRecord } = await supabase
        .from("phone_otp_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("phone", phone)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return json({ error: "No pending verification found. Please request a new code." }, 400);
      }

      // Check expiry
      if (new Date(otpRecord.expires_at) < new Date()) {
        return json({ error: "Verification code has expired. Please request a new one." }, 400);
      }

      // Check attempts (max 5)
      if (otpRecord.attempts >= 5) {
        return json({ error: "Too many failed attempts. Please request a new code." }, 400);
      }

      // Increment attempts
      await supabase
        .from("phone_otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      // Verify code
      if (otpRecord.otp_code !== otp_code) {
        return json({ error: "Invalid verification code. Please try again." }, 400);
      }

      // Mark as verified
      await supabase
        .from("phone_otp_codes")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // Update profile
      await supabase
        .from("profiles")
        .update({
          phone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return json({ success: true, message: "Phone number verified successfully!" });
    }

    return json({ error: "Invalid action. Use 'send_otp' or 'verify_otp'." }, 400);
  } catch (err) {
    console.error("Phone verify error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
