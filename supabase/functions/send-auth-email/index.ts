import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface RequestBody {
  email?: string;
  password?: string;
  full_name?: string;
  account_type?: string;
  action?: "signup" | "recovery";
  redirect_to?: string;
}

async function getSmtpConfig(supabase: ReturnType<typeof createClient>): Promise<SmtpConfig | null> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "email_smtp_config")
      .maybeSingle();

    if (error || !data?.value) return null;

    const config = data.value as SmtpConfig;
    if (!config.host || !config.user || !config.port) return null;

    return config;
  } catch {
    return null;
  }
}

async function getTemplateConfig(supabase: ReturnType<typeof createClient>): Promise<Record<string, any>> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "email_templates_config")
    .maybeSingle();

  return (data?.value as Record<string, any>) || {};
}

async function getBrandName(supabase: ReturnType<typeof createClient>, fallback?: string) {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "app_info")
    .maybeSingle();

  return (data?.value as any)?.app_name || fallback || "Dynime";
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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Supabase environment is not configured." }, 500);
    }

    const body = (await req.json()) as RequestBody;
    const email = body.email?.trim();
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const publicClient = createClient(supabaseUrl, anonKey);

    const smtpConfig = await getSmtpConfig(adminClient);
    const smtpPassword = smtpConfig?.password || Deno.env.get("SMTP_PASSWORD");
    const canUseSmtp = Boolean(smtpConfig && smtpPassword);
    const brandName = await getBrandName(adminClient, smtpConfig?.from_name);

    if (action === "signup") {
      if (canUseSmtp && smtpConfig) {
        const { default: nodemailer } = await import("npm:nodemailer@6.9.12");
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: "signup",
          email,
          password,
          options: {
            data: {
              full_name: body.full_name || "",
              account_type: body.account_type || "company",
            },
            redirectTo: redirectTo || undefined,
          },
        });

        if (linkError) {
          if (linkError.message?.includes("already")) {
            return json({ success: true, message: "If this email is not registered, a verification email has been sent." });
          }
          throw linkError;
        }

        const templates = await getTemplateConfig(adminClient);
        const verifyUrl = linkData?.properties?.action_link || "";
        const subject = templates.auth_signup?.subject || `Verify your email - ${brandName}`;
        const fromEmail = smtpConfig.from_email || smtpConfig.user;
        const isSecure = smtpConfig.encryption === "ssl" || smtpConfig.secure === true || smtpConfig.port === 465;
        const useTls = smtpConfig.encryption === "tls" || smtpConfig.port === 587;
        const transportConfig: Record<string, unknown> = {
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: isSecure,
          auth: { user: smtpConfig.user, pass: smtpPassword },
        };
        if (useTls && !isSecure) transportConfig.requireTLS = true;

        const transporter = nodemailer.createTransport(transportConfig);
        await transporter.sendMail({
          from: `"${brandName}" <${fromEmail}>`,
          to: email,
          subject,
          html: buildSignupEmail(verifyUrl, brandName),
        });

        return json({ success: true, user: linkData?.user, message: "Verification email sent via custom SMTP" });
      }

      const { data, error } = await publicClient.auth.signUp({
        email,
        password: password!,
        options: {
          emailRedirectTo: redirectTo || undefined,
          data: {
            full_name: body.full_name || "",
            account_type: body.account_type || "company",
          },
        },
      });

      if (error) {
        if (error.message?.toLowerCase().includes("already") || error.message?.toLowerCase().includes("exists")) {
          return json({ success: true, message: "If this email is not registered, a verification email has been sent." });
        }
        throw error;
      }

      return json({ success: true, user: data.user, message: "Verification email sent" });
    }

    if (canUseSmtp && smtpConfig) {
      const { default: nodemailer } = await import("npm:nodemailer@6.9.12");
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectTo || undefined },
      });

      if (linkError) {
        return json({ success: true, message: "If this email is registered, a reset link has been sent." });
      }

      const templates = await getTemplateConfig(adminClient);
      const resetUrl = linkData?.properties?.action_link || "";
      const subject = templates.auth_reset?.subject || `Reset your password - ${brandName}`;
      const fromEmail = smtpConfig.from_email || smtpConfig.user;
      const isSecure = smtpConfig.encryption === "ssl" || smtpConfig.secure === true || smtpConfig.port === 465;
      const useTls = smtpConfig.encryption === "tls" || smtpConfig.port === 587;
      const transportConfig: Record<string, unknown> = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: isSecure,
        auth: { user: smtpConfig.user, pass: smtpPassword },
      };
      if (useTls && !isSecure) transportConfig.requireTLS = true;

      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.sendMail({
        from: `"${brandName}" <${fromEmail}>`,
        to: email,
        subject,
        html: buildResetEmail(resetUrl, brandName),
      });

      return json({ success: true, message: "Reset email sent via custom SMTP" });
    }

    const { error } = await publicClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || undefined,
    });

    if (error) {
      console.warn("Fallback recovery email error:", error.message);
    }

    return json({ success: true, message: "If this email is registered, a reset link has been sent." });
  } catch (err: any) {
    console.error("Auth email error:", err);
    return json({ error: err?.message || "Unexpected auth email error." }, 500);
  }
});