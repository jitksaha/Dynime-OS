// Phase 5 — invoice-reminders ported to a Worker.
// Source: supabase/functions/invoice-reminders/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// Also a cron target; only the HTTP handler is ported here — the cron wiring
// (scheduled() / wrangler triggers) is configured separately. No user JWT
// (cron/server-initiated) -> SERVICE context. Finds overdue invoices, creates
// in-app notifications, and dispatches reminder emails.
//
// REVIEW: source used supabase.auth.admin.getUserById to resolve each invoice
// owner's email; there is no admin API on Workers, so the email is read from
// auth.users directly (service-role). The send-custom-email sibling is dispatched
// through the functions gateway (APP_URL/functions/v1) with the service-role token
// and returns 501 until that function is ported.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

export async function handler(_req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  const functionsBase = `${(env as any).APP_URL}/functions/v1`;
  const serviceKey = (env as any).SERVICE_ROLE_TOKEN; // Worker secret
  try {
    const today = new Date().toISOString().split("T")[0];
    const overdueInvoices = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT id, invoice_number, client, amount, due_date, tenant_id, created_by
         FROM public.invoices
         WHERE status = 'Pending' AND due_date < ${today}`) as unknown as any[];

    const notifications: any[] = [];
    const emailPromises: Promise<any>[] = [];

    for (const inv of overdueInvoices || []) {
      notifications.push({
        user_id: inv.created_by,
        tenant_id: inv.tenant_id,
        title: "Overdue Invoice Reminder",
        message: `Invoice ${inv.invoice_number} for ${inv.client} (৳${Number(inv.amount).toLocaleString()}) is past due (${inv.due_date}). Please follow up.`,
        type: "warning",
        module: "accounting",
      });

      // Get user email for email notification (service-role read of auth.users).
      const email = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT email FROM auth.users WHERE id = ${inv.created_by} LIMIT 1`;
        return (rows[0] as any)?.email as string | undefined;
      });
      if (email) {
        emailPromises.push(
          fetch(`${functionsBase}/send-custom-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              to: email,
              subject: `Overdue Invoice: ${inv.invoice_number}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#e74c3c;">⚠️ Overdue Invoice Reminder</h2>
                <p>Invoice <strong>${inv.invoice_number}</strong> for <strong>${inv.client}</strong> is past due.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Amount</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">৳${Number(inv.amount).toLocaleString()}</td></tr>
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Due Date</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#e74c3c;">${inv.due_date}</td></tr>
                </table>
                <p style="color:#666;">Please follow up with the client to collect payment.</p>
              </div>`,
              email_type: "notification_overdue",
            }),
          })
        );
      }
    }

    if (notifications.length > 0) {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.notifications ${tx(notifications as any)}`);
    }

    await Promise.allSettled(emailPromises);

    return new Response(
      JSON.stringify({ success: true, reminders_sent: notifications.length, checked_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
