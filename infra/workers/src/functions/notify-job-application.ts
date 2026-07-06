// Ported from supabase/functions/notify-job-application/index.ts.
// Service-role DB access via connect()+withSession(SERVICE). Admin emails go
// through sendEmail() (replacing the send-custom-email invocation).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { sendEmail } from "../_shared/email";

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { job_id, applicant_name, applicant_email } = await req.json() as any;

    if (!job_id || !applicant_name || !applicant_email) {
      return J({ error: "Missing fields" }, 400);
    }

    const job = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT title, department, tenant_id FROM public.job_postings WHERE id = ${job_id} LIMIT 1`;
      return rows[0];
    });

    if (!job) {
      return J({ error: "Job not found" }, 404);
    }

    const adminRoles = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT user_id FROM public.user_roles WHERE tenant_id = ${job.tenant_id} AND role = 'company_admin'`);

    if (!adminRoles || adminRoles.length === 0) {
      return J({ message: "No admins to notify" });
    }

    const tenant = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT name FROM public.tenants WHERE id = ${job.tenant_id} LIMIT 1`;
      return rows[0];
    });

    // In-app notifications
    const notifications = adminRoles.map((role: any) => ({
      user_id: role.user_id,
      tenant_id: job.tenant_id,
      title: "New Job Application",
      message: `${applicant_name} (${applicant_email}) applied for "${job.title}" in ${job.department}.`,
      type: "info",
      module: "recruitment",
    }));

    try {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.notifications ${tx(notifications as any)}`);
    } catch (notifError) {
      console.error("Failed to insert notifications:", notifError);
    }

    // Email notifications to admins
    const adminUserIds = adminRoles.map((r: any) => r.user_id);
    // REVIEW: Supabase auth.admin.listUsers replaced with direct auth.users read.
    const adminUsers = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT id, email FROM auth.users WHERE id IN ${tx(adminUserIds)}`);
    const adminEmails: string[] = adminUsers
      ?.map((u: any) => u.email)
      ?.filter(Boolean) || [];

    if (adminEmails.length > 0) {
      await sendEmail(env, {
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
      });
    }

    return J({
      success: true,
      notified_admins: adminEmails.length,
      message: `Notifications sent to ${adminEmails.length} admin(s)`,
      admin_emails: adminEmails,
      job_title: job.title,
      company: tenant?.name || "Unknown",
    });
  } catch (err) {
    console.error("Error:", err);
    return J({ error: "Internal error" }, 500);
  }
}
