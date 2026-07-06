import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, applicant_name, applicant_email } = await req.json();

    if (!job_id || !applicant_name || !applicant_email) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: job } = await supabase
      .from("job_postings")
      .select("title, department, tenant_id")
      .eq("id", job_id)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("tenant_id", job.tenant_id)
      .eq("role", "company_admin");

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ message: "No admins to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", job.tenant_id)
      .single();

    // In-app notifications
    const notifications = adminRoles.map((role: any) => ({
      user_id: role.user_id,
      tenant_id: job.tenant_id,
      title: "New Job Application",
      message: `${applicant_name} (${applicant_email}) applied for "${job.title}" in ${job.department}.`,
      type: "info",
      module: "recruitment",
    }));

    const { error: notifError } = await supabase.from("notifications").insert(notifications);
    if (notifError) console.error("Failed to insert notifications:", notifError);

    // Email notifications to admins
    const adminUserIds = adminRoles.map((r: any) => r.user_id);
    const { data: adminUsers } = await supabase.auth.admin.listUsers();
    const adminEmails = adminUsers?.users
      ?.filter((u: any) => adminUserIds.includes(u.id))
      ?.map((u: any) => u.email)
      ?.filter(Boolean) || [];

    if (adminEmails.length > 0) {
      await supabase.functions.invoke("send-custom-email", {
        body: {
          to: adminEmails,
          subject: `New Application: ${job.title}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#333;">👤 New Job Application</h2>
            <p>A new application has been received for <strong>${job.title}</strong> at <strong>${tenant?.name || "your company"}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Applicant</td><td style="padding:8px;border-bottom:1px solid #eee;">${applicant_name}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${applicant_email}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Position</td><td style="padding:8px;border-bottom:1px solid #eee;">${job.title}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Department</td><td style="padding:8px;border-bottom:1px solid #eee;">${job.department}</td></tr>
            </table>
            <p style="color:#666;">Log in to your dashboard to review this application.</p>
          </div>`,
          email_type: "notification_job",
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified_admins: adminEmails.length,
        message: `Notifications sent to ${adminEmails.length} admin(s)`,
        admin_emails: adminEmails,
        job_title: job.title,
        company: tenant?.name || "Unknown",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
