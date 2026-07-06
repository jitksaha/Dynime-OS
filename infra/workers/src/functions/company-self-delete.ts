// Ported from supabase/functions/company-self-delete/index.ts.
// Caller identity from Worker-issued token; the original used the service-role
// client for everything (including reading the caller's own profile), so all
// reads/writes here go through the service-role session and identity comes from
// the verified token instead of supabase.auth.getUser.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    // Get the calling user from the verified token
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) {
      return J({ error: "Not authenticated" }, 401);
    }
    const user = { id: ctx.userId, email: ctx.email ?? null };

    const { tenant_id, confirmation_text } = await req.json() as any;

    if (!tenant_id) {
      return J({ error: "tenant_id is required" }, 400);
    }

    // Verify user is the owner of this tenant
    const profile = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT tenant_id, is_owner FROM public.profiles WHERE user_id = ${user.id} LIMIT 1`;
      return rows[0];
    });

    if (!profile || profile.tenant_id !== tenant_id || !profile.is_owner) {
      return J({ error: "Only the company owner can delete this company" }, 403);
    }

    // Get tenant info for confirmation
    const tenant = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT name FROM public.tenants WHERE id = ${tenant_id} LIMIT 1`;
      return rows[0];
    });

    if (!tenant) {
      return J({ error: "Company not found" }, 404);
    }

    // Verify confirmation text
    if (confirmation_text !== tenant.name) {
      return J({ error: "Confirmation text does not match company name" }, 400);
    }

    // ---- Begin deletion process ----
    // 1. Delete tables that don't have ON DELETE CASCADE
    const nonCascadeTables = [
      "attendance_records", "audit_logs", "blog_posts", "budgets",
      "communication_logs", "communication_templates", "company_holidays",
      "company_wallet_transactions", "company_wallets", "coupon_redemptions",
      "coupons", "document_requests", "documents", "employee_loans",
      "employee_warnings", "invoice_items", "notification_event_types",
      "payroll_records", "performance_reviews", "probation_records",
      "recurring_payment_logs", "recurring_payment_schedules",
      "salary_scaleup_history", "saved_payment_methods",
      "shift_assignments", "shift_definitions", "sms_logs",
      "tenant_addon_modules", "tenant_branding", "tenant_modules",
      "tenant_notification_preferences", "tenant_sms_balances",
      "tenant_sms_gateway_configs", "tenant_subscriptions",
      "tenant_usage_counters", "training_records",
      "usage_reset_logs", "webhook_configs",
    ];

    for (const table of nonCascadeTables) {
      try {
        // REVIEW: each delete runs in its own transaction so one failing table
        // (missing table/column) doesn't abort the others — matches the original's
        // per-iteration try/catch (Postgres aborts the whole tx on error otherwise).
        await withSession(sql, SERVICE, (tx) => tx`DELETE FROM public.${tx(table)} WHERE tenant_id = ${tenant_id}`);
      } catch (e: any) {
        // Table might not exist or column might not exist — continue
        console.log(`Skipped ${table}: ${e.message}`);
      }
    }

    // 2. Unlink all user profiles from this tenant
    const linkedProfiles = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT user_id FROM public.profiles WHERE tenant_id = ${tenant_id}`);

    if (linkedProfiles && linkedProfiles.length > 0) {
      await withSession(sql, SERVICE, async (tx) => {
        // Check if users have other companies
        for (const p of linkedProfiles) {
          const otherRoles = await tx`SELECT tenant_id FROM public.user_roles WHERE user_id = ${p.user_id} AND tenant_id <> ${tenant_id}`;

          if (otherRoles && otherRoles.length > 0) {
            // Switch user to their next company
            await tx`UPDATE public.profiles SET tenant_id = ${otherRoles[0].tenant_id}, is_owner = false WHERE user_id = ${p.user_id}`;
          } else {
            // User has no other companies — clear tenant_id, mark onboarding incomplete
            await tx`UPDATE public.profiles SET tenant_id = null, is_owner = false, onboarding_completed = false WHERE user_id = ${p.user_id}`;
          }
        }
      });
    }

    // 3. Delete user_roles for this tenant
    await withSession(sql, SERVICE, (tx) => tx`DELETE FROM public.user_roles WHERE tenant_id = ${tenant_id}`);

    // 4. Finally delete the tenant (CASCADE will handle remaining FK tables)
    try {
      await withSession(sql, SERVICE, (tx) => tx`DELETE FROM public.tenants WHERE id = ${tenant_id}`);
    } catch (deleteErr: any) {
      console.error("Tenant delete error:", deleteErr);
      return J({ error: "Failed to delete company: " + deleteErr.message }, 500);
    }

    // 5. Log the deletion in audit
    await withSession(sql, SERVICE, (tx) => tx`INSERT INTO public.audit_logs ${tx({
      action: "COMPANY_DELETED",
      module: "settings",
      resource_type: "tenant",
      resource_id: tenant_id,
      user_id: user.id,
      details: JSON.stringify({ company_name: tenant.name, deleted_by: user.email }),
    })}`);

    return J({ success: true, message: `Company "${tenant.name}" has been permanently deleted.` });
  } catch (err: any) {
    console.error("Company delete error:", err);
    return J({ error: err.message }, 500);
  }
}
