import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

async function getSmtpConfig(supabase: any): Promise<SmtpConfig> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "email_smtp_config")
    .maybeSingle();

  if (error || !data?.value) {
    throw new Error("SMTP not configured. Please configure SMTP settings in Admin Panel.");
  }

  return data.value as SmtpConfig;
}

async function getEmailTemplateConfig(supabase: any): Promise<Record<string, any>> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "email_templates_config")
    .maybeSingle();

  return (data?.value as Record<string, any>) || {};
}

async function getNotificationConfig(supabase: any): Promise<Record<string, any>> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "email_notification_config")
    .maybeSingle();

  return (data?.value as Record<string, any>) || {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: EmailRequest = await req.json();

    const { to, subject, html, email_type, from_name_override, from_email_override } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SMTP config from database (includes password)
    const smtpConfig = await getSmtpConfig(supabase);

    // Use password from DB config, fall back to secret
    const smtpPassword = smtpConfig.password || Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) {
      throw new Error("SMTP password not configured. Set it in Admin Panel → Email Settings → SMTP.");
    }

    // Check notification config for enabled/disabled per type
    if (email_type && email_type !== "test") {
      const notifConfig = await getNotificationConfig(supabase);
      const templateConfig = await getEmailTemplateConfig(supabase);

      // Check if this email type is enabled
      const allConfigs = { ...templateConfig, ...notifConfig };
      const typeConfig = allConfigs[email_type];
      if (typeConfig && typeConfig.enabled === false) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: `Email type '${email_type}' is disabled` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Determine encryption/security
    const isSecure = smtpConfig.encryption === "ssl" || smtpConfig.secure === true || smtpConfig.port === 465;
    const useTls = smtpConfig.encryption === "tls" || smtpConfig.port === 587;

    const transportConfig: any = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: isSecure,
      auth: {
        user: smtpConfig.user,
        pass: smtpPassword,
      },
    };

    if (useTls && !isSecure) {
      transportConfig.requireTLS = true;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Fetch dynamic app name for fallback
    const { data: appInfoRow } = await supabase.from("platform_settings").select("value").eq("key", "app_info").maybeSingle();
    const dynamicAppName = (appInfoRow?.value as any)?.app_name || "Dynime";
    const fromName = from_name_override || smtpConfig.from_name || dynamicAppName;
    const fromEmail = from_email_override || smtpConfig.from_email || smtpConfig.user;

    const recipients = Array.isArray(to) ? to : [to];

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipients.join(", "),
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Send email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
