// Phase 5 — send-auth-email ported to a Worker.
// Source: supabase/functions/send-auth-email/index.ts
//   - Deno.serve              -> export async function handler(req, env)
//   - createClient(SERVICE)   -> connect(env) + withSession(SERVICE) raw SQL
//   - createClient(ANON)/admin auth -> native auth.users access (no GoTrue admin API)
//   - npm:nodemailer          -> sendEmail() (Workers-incompatible transport replaced)
//
// REVIEW: the porting brief noted this function carried `@lovable.dev/email-js` and
// `@lovable.dev/webhooks-js` webhook-verify packages. Those actually live in the
// sibling `auth-email-hook` function; this one had no inbound-signature check at all.
// Per the brief we still add a simple HMAC gate (Web Crypto) over the raw request
// body using AUTH_EMAIL_WEBHOOK_SECRET so this endpoint is not callable unsigned.
// The Supabase admin `generateLink`/`signUp`/`resetPasswordForEmail` calls have no
// GoTrue equivalent here, so signup/recovery are implemented directly against
// auth.users (mirroring infra/workers/src/auth/index.ts) and the action links point
// at the Worker auth verify endpoints. The two email HTML templates are kept intact.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getPlatformSetting } from "../_shared/secrets";
import { sendEmail } from "../_shared/email";
import { hashPassword } from "../_shared/password";

type Sql = ReturnType<typeof connect>;

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  from_email: string;
  from_name: string;
  encryption: string;
}

interface RequestBody {
  email?: string;
  password?: string;
  full_name?: string;
  account_type?: string;
  action?: "signup" | "recovery";
  redirect_to?: string;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// REVIEW: simple HMAC-SHA256 gate replacing the (sibling) @lovable.dev webhook verify.
// Verifies hex signature in `x-signature` over the raw body using the shared secret.
async function verifyHmac(env: Env, rawBody: string, signature: string | null): Promise<boolean> {
  const secret = (env as any).AUTH_EMAIL_WEBHOOK_SECRET as string | undefined; // Worker secret
  if (!secret) return false;
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // constant-time-ish compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSmtpConfig(sql: Sql): Promise<SmtpConfig | null> {
  try {
    const config = await getPlatformSetting<SmtpConfig>(sql, "email_smtp_config");
    if (!config) return null;
    if (!config.host || !config.user || !config.port) return null;
    return config;
  } catch {
    return null;
  }
}

async function getTemplateConfig(sql: Sql): Promise<Record<string, any>> {
  return (await getPlatformSetting<Record<string, any>>(sql, "email_templates_config")) || {};
}

async function getBrandName(sql: Sql, fallback?: string) {
  const value = await getPlatformSetting<Record<string, any>>(sql, "app_info");
  return (value as any)?.app_name || fallback || "Dynime";
}

function buildSignupEmail(verifyUrl: string, brandName: string): string {
  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:24px;font-weight:700;color:#1a1a2e;margin:0;">${brandName}</h1>
      </div>
      <div style="background:#f8f9fc;border-radius:12px;padding:32px 24px;text-align:center;">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:24px;color:white;">✉</span>
        </div>
        <h2 style="font-size:20px;font-weight:600;color:#1a1a2e;margin:0 0 12px;">Verify your email</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
          Welcome to ${brandName}! Please verify your email address to get started.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
          Verify Email Address
        </a>
        <p style="font-size:12px;color:#9ca3af;margin-top:20px;line-height:1.5;">
          If the button doesn't work, copy and paste this link:<br/>
          <a href="${verifyUrl}" style="color:#6366f1;word-break:break-all;">${verifyUrl}</a>
        </p>
      </div>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  </body></html>`;
}

function buildResetEmail(resetUrl: string, brandName: string): string {
  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:24px;font-weight:700;color:#1a1a2e;margin:0;">${brandName}</h1>
      </div>
      <div style="background:#f8f9fc;border-radius:12px;padding:32px 24px;text-align:center;">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#f97316);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:24px;color:white;">🔒</span>
        </div>
        <h2 style="font-size:20px;font-weight:600;color:#1a1a2e;margin:0 0 12px;">Reset your password</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
          We received a request to reset your password. Click the button below to set a new one.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
          Reset Password
        </a>
        <p style="font-size:12px;color:#9ca3af;margin-top:20px;line-height:1.5;">
          If the button doesn't work, copy and paste this link:<br/>
          <a href="${resetUrl}" style="color:#6366f1;word-break:break-all;">${resetUrl}</a>
        </p>
      </div>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
        If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.
      </p>
    </div>
  </body></html>`;
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const rawBody = await req.text();

    // REVIEW: HMAC gate (see top-of-file note). Replaces the removed lovable verify.
    const verified = await verifyHmac(env, rawBody, req.headers.get("x-signature"));
    if (!verified) {
      return json({ error: "Invalid signature" }, 401);
    }

    const body = JSON.parse(rawBody || "{}") as RequestBody;
    const email = body.email?.trim()?.toLowerCase();
    const password = body.password;
    const action = body.action;
    const redirectTo = body.redirect_to;

    if (!email) return json({ error: "Email is required" }, 400);
    if (!action || !["signup", "recovery"].includes(action)) {
      return json({ error: "Invalid action. Use 'signup' or 'recovery'." }, 400);
    }
    if (action === "signup" && (!password || password.length < 8)) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }

    const smtpConfig = await getSmtpConfig(sql);
    const brandName = await getBrandName(sql, smtpConfig?.from_name);
    const appUrl = (env as any).APP_URL || ""; // Worker var

    if (action === "signup") {
      // Replaces adminClient.auth.admin.generateLink({ type: "signup" }):
      // create the user (or detect an existing one) and mint a confirmation token.
      const existing = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT id FROM auth.users WHERE email = ${email} AND deleted_at IS NULL LIMIT 1`);
      if (existing.length) {
        // Don't leak existence — mirror the original "already" handling.
        return json({ success: true, message: "If this email is not registered, a verification email has been sent." });
      }

      const hash = await hashPassword(password!);
      const meta = {
        full_name: body.full_name || "",
        account_type: body.account_type || "company",
      };
      const confirmationToken = newToken();
      const rows = await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, confirmation_token, confirmation_sent_at)
           VALUES (${email}, ${hash}, ${tx.json(meta)}, ${confirmationToken}, now())
           RETURNING id, email`);
      const user = rows[0] as any;

      const templates = await getTemplateConfig(sql);
      const verifyUrl = `${appUrl}/auth/verify?token=${confirmationToken}&type=signup${redirectTo ? `&redirect_to=${encodeURIComponent(redirectTo)}` : ""}`;
      const subject = templates.auth_signup?.subject || `Verify your email - ${brandName}`;

      // Map nodemailer transporter.sendMail to the Workers-compatible sender.
      const fromEmail = smtpConfig?.from_email || smtpConfig?.user || undefined;
      const result = await sendEmail(env, {
        to: email,
        subject,
        html: buildSignupEmail(verifyUrl, brandName),
        from: fromEmail,
        fromName: brandName,
      });
      if (!result.ok) throw new Error(result.error || "Failed to send verification email");

      return json({ success: true, user, message: "Verification email sent" });
    }

    // recovery — replaces generateLink({ type: "recovery" }) + resetPasswordForEmail.
    const user = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT id, email FROM auth.users WHERE email = ${email} AND deleted_at IS NULL LIMIT 1`);
    if (!user.length) {
      // Don't leak existence.
      return json({ success: true, message: "If this email is registered, a reset link has been sent." });
    }

    const recoveryToken = newToken();
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE auth.users SET recovery_token = ${recoveryToken}, recovery_sent_at = now()
         WHERE email = ${email}`);

    const templates = await getTemplateConfig(sql);
    const resetUrl = `${appUrl}/auth/verify?token=${recoveryToken}&type=recovery${redirectTo ? `&redirect_to=${encodeURIComponent(redirectTo)}` : ""}`;
    const subject = templates.auth_reset?.subject || `Reset your password - ${brandName}`;

    const fromEmail = smtpConfig?.from_email || smtpConfig?.user || undefined;
    const result = await sendEmail(env, {
      to: email,
      subject,
      html: buildResetEmail(resetUrl, brandName),
      from: fromEmail,
      fromName: brandName,
    });
    if (!result.ok) console.warn("Recovery email send error:", result.error);

    return json({ success: true, message: "If this email is registered, a reset link has been sent." });
  } catch (err: any) {
    console.error("Auth email error:", err);
    return json({ error: err?.message || "Unexpected auth email error." }, 500);
  }
}
