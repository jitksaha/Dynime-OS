import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  action: "upgrade" | "downgrade" | "cancel" | "cancel_scheduled";
  tenant_id: string;
  user_email: string;
  user_name: string;
  previous_plan?: string;
  new_plan?: string;
  effective_date?: string;
  amount?: number;
  billing_cycle?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const payload: NotificationPayload = await req.json();
    const { action, tenant_id, user_email, user_name, previous_plan, new_plan, effective_date, amount, billing_cycle } = payload;

    // Get SMTP settings
    const { data: smtpSettings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name", "smtp_encryption"]);

    const smtp: Record<string, string> = {};
    (smtpSettings || []).forEach((s: any) => { smtp[s.key] = s.value; });

    if (!smtp.smtp_host || !smtp.smtp_user) {
      console.log("SMTP not configured, skipping email notification");
      return new Response(JSON.stringify({ sent: false, reason: "smtp_not_configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let subject = "";
    let body = "";

    const planDisplay = (slug?: string) => {
      if (!slug) return "Unknown";
      return slug.charAt(0).toUpperCase() + slug.slice(1);
    };

    switch (action) {
      case "upgrade":
        subject = `Plan Upgraded to ${planDisplay(new_plan)}`;
        body = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:40px 30px;">
            <h2 style="color:#10b981;margin-bottom:16px;">🎉 Plan Upgraded Successfully!</h2>
            <p>Hi ${user_name || "there"},</p>
            <p>Your subscription has been upgraded.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr><td style="padding:8px 0;color:#6b7280;">Previous Plan</td><td style="padding:8px 0;font-weight:600;">${planDisplay(previous_plan)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">New Plan</td><td style="padding:8px 0;font-weight:600;color:#10b981;">${planDisplay(new_plan)}</td></tr>
              ${amount ? `<tr><td style="padding:8px 0;color:#6b7280;">Amount Charged</td><td style="padding:8px 0;font-weight:600;">$${amount.toFixed(2)} USD</td></tr>` : ""}
              ${billing_cycle ? `<tr><td style="padding:8px 0;color:#6b7280;">Billing Cycle</td><td style="padding:8px 0;font-weight:600;text-transform:capitalize;">${billing_cycle}</td></tr>` : ""}
            </table>
            <p style="color:#6b7280;font-size:14px;">You now have access to all features included in your new plan. Thank you for upgrading!</p>
          </div>`;
        break;

      case "downgrade":
        subject = `Plan Downgrade to ${planDisplay(new_plan)}`;
        body = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:40px 30px;">
            <h2 style="color:#f59e0b;margin-bottom:16px;">Plan Downgraded</h2>
            <p>Hi ${user_name || "there"},</p>
            <p>Your subscription has been downgraded.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr><td style="padding:8px 0;color:#6b7280;">Previous Plan</td><td style="padding:8px 0;font-weight:600;">${planDisplay(previous_plan)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">New Plan</td><td style="padding:8px 0;font-weight:600;">${planDisplay(new_plan)}</td></tr>
              ${effective_date ? `<tr><td style="padding:8px 0;color:#6b7280;">Effective Date</td><td style="padding:8px 0;font-weight:600;">${effective_date}</td></tr>` : ""}
            </table>
            <p style="color:#6b7280;font-size:14px;">If you change your mind, you can upgrade again anytime from your subscription page.</p>
          </div>`;
        break;

      case "cancel":
        subject = "Subscription Cancelled";
        body = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:40px 30px;">
            <h2 style="color:#ef4444;margin-bottom:16px;">Subscription Cancelled</h2>
            <p>Hi ${user_name || "there"},</p>
            <p>Your subscription has been cancelled and your plan has been changed to <strong>${planDisplay(new_plan || "free")}</strong>.</p>
            <p style="color:#6b7280;font-size:14px;">We're sorry to see you go. You can resubscribe anytime from your subscription page.</p>
          </div>`;
        break;

      case "cancel_scheduled":
        subject = "Subscription Cancellation Scheduled";
        body = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:40px 30px;">
            <h2 style="color:#f59e0b;margin-bottom:16px;">Cancellation Scheduled</h2>
            <p>Hi ${user_name || "there"},</p>
            <p>Your subscription cancellation has been scheduled. You will continue to have access to your current <strong>${planDisplay(previous_plan)}</strong> plan features until <strong>${effective_date}</strong>.</p>
            <p>After that date, your plan will automatically change to <strong>${planDisplay(new_plan || "free")}</strong>.</p>
            <p style="color:#6b7280;font-size:14px;">You can reactivate your plan anytime before the cancellation date from your subscription page.</p>
          </div>`;
        break;
    }

    // Send email via SMTP
    const smtpPassword = smtp.smtp_password || Deno.env.get("SMTP_PASSWORD") || "";
    const encryption = smtp.smtp_encryption || "tls";
    const port = parseInt(smtp.smtp_port || "587");

    // Use fetch to send via SMTP relay or fallback log
    // For now, log the notification and create an in-app notification
    console.log(`Subscription notification: ${action} for ${user_email}`);

    // Create in-app notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("tenant_id", tenant_id)
      .limit(5);

    if (profile && profile.length > 0) {
      const notifications = profile.map((p: any) => ({
        user_id: p.user_id,
        tenant_id,
        title: subject,
        message: `${action === "upgrade" ? "🎉 " : action === "cancel" || action === "cancel_scheduled" ? "⚠️ " : ""}${subject}`,
        type: "subscription",
        priority: action === "cancel" ? "high" : "normal",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    // Try sending email via edge function
    try {
      await supabase.functions.invoke("send-custom-email", {
        body: {
          to: user_email,
          subject,
          html: body,
        },
      });
    } catch (emailErr) {
      console.error("Email send failed (non-critical):", emailErr);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Subscription notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
