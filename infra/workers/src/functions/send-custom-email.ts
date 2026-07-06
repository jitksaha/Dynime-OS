// Phase 5 — send-custom-email ported to a Worker.
// Source: supabase/functions/send-custom-email/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - npm:nodemailer        -> sendEmail() (Workers-incompatible transport replaced)
// The nodemailer transport/sendMail call is mapped to sendEmail(); SMTP host/port/
// auth are no longer used (the shared email provider handles delivery), but the
// DB-driven from_name/from_email and per-type enable/disable checks are preserved.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getPlatformSetting } from "../_shared/secrets";
import { sendEmail } from "../_shared/email";

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

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  email_type?: string; // auth | notification | payment | test
  from_name_override?: string;
  from_email_override?: string;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getSmtpConfig(sql: Sql): Promise<SmtpConfig> {
  const value = await getPlatformSetting<SmtpConfig>(sql, "email_smtp_config");
  if (!value) {
    throw new Error("SMTP not configured. Please configure SMTP settings in Admin Panel.");
  }
  return value;
}

async function getEmailTemplateConfig(sql: Sql): Promise<Record<string, any>> {
  return (await getPlatformSetting<Record<string, any>>(sql, "email_templates_config")) || {};
}

async function getNotificationConfig(sql: Sql): Promise<Record<string, any>> {
  return (await getPlatformSetting<Record<string, any>>(sql, "email_notification_config")) || {};
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const body: EmailRequest = await req.json();
    const { to, subject, html, email_type, from_name_override, from_email_override } = body;

    if (!to || !subject || !html) {
      return json({ error: "Missing required fields: to, subject, html" }, 400);
    }

    // Get SMTP config from database (includes password)
    const smtpConfig = await getSmtpConfig(sql);

    // Use password from DB config, fall back to secret
    const smtpPassword = smtpConfig.password || (env as any).SMTP_PASSWORD; // Worker secret
    if (!smtpPassword) {
      throw new Error("SMTP password not configured. Set it in Admin Panel → Email Settings → SMTP.");
    }

    // Check notification config for enabled/disabled per type
    if (email_type && email_type !== "test") {
      const notifConfig = await getNotificationConfig(sql);
      const templateConfig = await getEmailTemplateConfig(sql);

      // Check if this email type is enabled
      const allConfigs = { ...templateConfig, ...notifConfig };
      const typeConfig = allConfigs[email_type];
      if (typeConfig && typeConfig.enabled === false) {
        return json({ success: true, skipped: true, reason: `Email type '${email_type}' is disabled` });
      }
    }

    // Fetch dynamic app name for fallback
    const appInfo = await getPlatformSetting<Record<string, any>>(sql, "app_info");
    const dynamicAppName = (appInfo as any)?.app_name || "Dynime";
    const fromName = from_name_override || smtpConfig.from_name || dynamicAppName;
    const fromEmail = from_email_override || smtpConfig.from_email || smtpConfig.user;

    const recipients = Array.isArray(to) ? to : [to];

    // Map the nodemailer transporter.sendMail call to the Workers-compatible sender.
    const result = await sendEmail(env, {
      to: recipients,
      subject,
      html,
      from: fromEmail,
      fromName,
    });

    if (!result.ok) {
      throw new Error(result.error || "Email send failed");
    }

    console.log("Email sent to:", recipients.join(", "));

    return json({
      success: true,
      accepted: recipients,
      rejected: [],
    });
  } catch (err: any) {
    console.error("Send email error:", err);
    return json({ error: err.message }, 500);
  }
}
