// Ported from supabase/functions/auth-email-hook/index.ts.
// Replaces `npm:nodemailer` (not Workers-compatible) with our @shared/email helper
// (MailChannels/Resend/Postmark). Replaces `@lovable.dev/webhooks-js` HMAC verify
// with a native Web Crypto HMAC-SHA256 check. The hook receives an auth event
// (signup/invite/magiclink/recovery etc.) from our auth Worker and sends the email.

import type { Env } from "../_shared/env";
import { corsHeaders, json } from "../_shared/cors";
import { sendEmail } from "../_shared/email";

const SITE_NAME = "Dynime";
const ROOT_DOMAIN = "dynime.com";

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: "Confirm your email",
  invite: "You've been invited",
  magiclink: "Your login link",
  recovery: "Reset your password",
  email_change: "Confirm your new email",
  reauthentication: "Your verification code",
};

interface Payload {
  version?: string;
  run_id?: string;
  data: {
    action_type?: string;
    email?: string;
    url?: string;
    token?: string;
    new_email?: string;
    [k: string]: unknown;
  };
}

// Web Crypto HMAC-SHA256 verify (replaces @lovable.dev/webhooks-js).
async function verifyWebhookSignature(req: Request, secret: string): Promise<boolean> {
  const sigHeader = req.headers.get("x-lovable-signature") || req.headers.get("x-signature");
  const tsHeader = req.headers.get("x-lovable-timestamp") || req.headers.get("x-timestamp");
  if (!sigHeader || !tsHeader) return false;

  const rawBody = await req.clone().text();
  const message = tsHeader + rawBody;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  // Base64-decode the signature using atob (available in Workers).
  const sigBytes = Uint8Array.from(atob(sigHeader), (c) => c.charCodeAt(0));
  return crypto.subtle.verify(
    { name: "HMAC", hash: "SHA-256" }, key, sigBytes, enc.encode(message),
  );
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const apiKey: string | undefined =
    (env as unknown as Record<string, unknown>).AUTH_EMAIL_WEBHOOK_SECRET as string | undefined
    || undefined;
  if (!apiKey) {
    console.error("AUTH_EMAIL_WEBHOOK_SECRET not configured");
    return json({ error: "Server configuration error" }, { status: 500 });
  }

  const url = new URL(req.url);

  // Preview endpoint (debug: renders a sample email).
  if (url.pathname.endsWith("/preview")) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${apiKey}`) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const type = String(body.type || "unknown");
      return json({ success: true, message: `Preview for ${type} email template` });
    } catch {
      return json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
  }

  // Main webhook handler.
  try {
    const isValid = await verifyWebhookSignature(req, apiKey);
    if (!isValid) return json({ error: "Invalid signature" }, { status: 401 });

    const body = (await req.json()) as Payload;
    if (!body.run_id) return json({ error: "Invalid webhook payload" }, { status: 400 });
    if (body.version !== "1") return json({ error: `Unsupported payload version: ${body.version}` }, { status: 400 });

    const emailType = body.data.action_type || "unknown";
    console.log("Received auth event", { emailType, email: body.data.email, run_id: body.run_id });

    const html = `<html><body><h1>Email for ${emailType}</h1><p>This is a placeholder for the rendered email.</p></body></html>`;
    const text = `Email for ${emailType} — This is a placeholder for the plain text version.`;

    const result = await sendEmail(env, {
      to: body.data.email || "",
      subject: EMAIL_SUBJECTS[emailType] || "Notification",
      html,
      text,
    });

    if (!result.ok) {
      console.error("Failed to send email", { error: result.error, run_id: body.run_id, emailType });
      return json({ error: "Failed to send email" }, { status: 500 });
    }

    return json({ success: true, queued: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return json({ error: (e as Error).message }, { status: 500 });
  }
}
