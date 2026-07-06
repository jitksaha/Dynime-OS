// Phase 5 — phone-verify ported to a Worker.
// Source: supabase/functions/phone-verify/index.ts
//   - serve()                       -> export async function handler(req, env)
//   - anonClient.auth.getUser(jwt)  -> contextFromRequest(req, env) (Worker JWT)
//   - createClient(SERVICE)         -> connect(env) + withSession(SERVICE) raw SQL
//   - supabase.rpc(...)             -> SELECT of the same Postgres function
//   - sibling sms-send call         -> ${APP_URL}/functions/v1/sms-send with the
//                                      service-role token (replaces SUPABASE_URL).
// OTP generation, rate-limit, expiry, attempts, and credit deduct/refund preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { getPlatformSetting } from "../_shared/secrets";

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

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  const functionsBase = `${(env as any).APP_URL}/functions/v1`; // sibling dispatch base
  const serviceKey = (env as any).SERVICE_ROLE_TOKEN; // Worker secret

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) return json({ error: "Invalid auth token" }, 401);
    const user = { id: ctx.userId, email: ctx.email };

    const body = await req.json() as Record<string, any>;
    const { action, phone, otp_code } = body;

    // Get user profile for tenant_id
    const profile = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT tenant_id, full_name FROM public.profiles
        WHERE user_id = ${user.id} LIMIT 1`;
      return rows[0] as any;
    });

    const tenantId = profile?.tenant_id;

    // ===== SEND OTP =====
    if (action === "send_otp") {
      if (!phone || phone.length < 10) {
        return json({ error: "Please enter a valid phone number" }, 400);
      }

      // Rate limit: max 3 OTPs in last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const count = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT COUNT(*)::int AS c FROM public.phone_otp_codes
          WHERE user_id = ${user.id} AND created_at >= ${tenMinAgo}`;
        return (rows[0] as any)?.c as number;
      });

      if ((count || 0) >= 3) {
        return json({ error: "Too many OTP requests. Please wait 10 minutes." }, 429);
      }

      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

      // Save OTP
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.phone_otp_codes ${tx({
          user_id: user.id,
          phone,
          otp_code: otpCode,
          expires_at: expiresAt,
        } as any)}`);

      // Get SMS template
      const template = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT template_body FROM public.sms_templates
          WHERE event_key = ${"phone_verification"} AND is_active = true LIMIT 1`;
        return rows[0] as any;
      });

      // Get app name
      const appNameSetting = await getPlatformSetting<any>(sql, "app_name");
      const appName = (appNameSetting as string) || "Dynime";

      const defaultTemplate = `Your ${appName} verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`;
      const message = template
        ? renderTemplate(template.template_body, {
            app_name: appName,
            otp_code: otpCode,
            expiry_minutes: "5",
          })
        : defaultTemplate;

      // Determine gateway config (mirrors sms-send resolution to handle credit deduct)
      let isOwnGateway = false;

      // Check tenant's own gateway first
      if (tenantId) {
        const tenantConfig = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT * FROM public.tenant_sms_gateway_configs
            WHERE tenant_id = ${tenantId} AND is_enabled = true LIMIT 1`;
          return rows[0] as any;
        });

        if (tenantConfig?.use_own_gateway && tenantConfig.gateway_key) {
          isOwnGateway = true;
        }
      }

      // Fallback to shared platform gateway
      if (!isOwnGateway) {
        const sharedGw = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT * FROM public.sms_gateway_configs
            WHERE is_enabled = true LIMIT 1`;
          return rows[0] as any;
        });

        if (!sharedGw) {
          return json({ error: "No SMS gateway configured. Contact admin." }, 404);
        }

        // Deduct credit for shared gateway
        if (tenantId) {
          const credited = await withSession(sql, SERVICE, async (tx) => {
            const rows = await tx`SELECT public.deduct_sms_credit(_tenant_id => ${tenantId}) AS result`;
            return (rows[0] as any)?.result;
          });
          if (!credited) {
            return json({ error: "Insufficient SMS credits. Please top up your balance." }, 402);
          }
        }
      }

      // Dispatch SMS via the ported sms-send through the functions gateway.
      let smsSuccess = false;
      let smsResponse: any = null;

      try {
        const smsRes = await fetch(`${functionsBase}/sms-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
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
          await withSession(sql, SERVICE, (tx) =>
            tx`SELECT public.add_sms_credits(_tenant_id => ${tenantId}, _count => 1, _amount => 0, _description => ${"Refund: Phone verification SMS failed"})`);
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
      const otpRecord = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT * FROM public.phone_otp_codes
          WHERE user_id = ${user.id} AND phone = ${phone} AND verified = false
          ORDER BY created_at DESC LIMIT 1`;
        return rows[0] as any;
      });

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
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.phone_otp_codes SET attempts = ${otpRecord.attempts + 1}
           WHERE id = ${otpRecord.id}`);

      // Verify code
      if (otpRecord.otp_code !== otp_code) {
        return json({ error: "Invalid verification code. Please try again." }, 400);
      }

      // Mark as verified
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.phone_otp_codes SET verified = true WHERE id = ${otpRecord.id}`);

      // Update profile
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.profiles SET
             phone = ${phone},
             phone_verified = true,
             phone_verified_at = ${new Date().toISOString()}
           WHERE user_id = ${user.id}`);

      return json({ success: true, message: "Phone number verified successfully!" });
    }

    return json({ error: "Invalid action. Use 'send_otp' or 'verify_otp'." }, 400);
  } catch (err) {
    console.error("Phone verify error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
}
