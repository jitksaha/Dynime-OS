// Ported from supabase/functions/admin-delete/index.ts.
// Caller identity from Worker-issued token; super_admin check + all writes go
// through the service-role session. supabase.auth.admin.deleteUser is replaced
// with a direct DELETE from auth.users.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    // Verify caller is super_admin
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) {
      return J({ error: "Invalid auth token" }, 401);
    }
    const caller = ctx.userId;

    // Verify super_admin role
    const roleData = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT role FROM public.user_roles WHERE user_id = ${caller} AND role = 'super_admin' LIMIT 1`;
      return rows[0];
    });

    if (!roleData) {
      return J({ error: "Forbidden: Super admin only" }, 403);
    }

    const { type, id } = await req.json() as any;

    if (type === "user") {
      // Prevent self-deletion
      if (id === caller) {
        return J({ error: "Cannot delete yourself" }, 400);
      }

      // Prevent deletion of any super_admin user
      const targetRole = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT role FROM public.user_roles WHERE user_id = ${id} AND role = 'super_admin' LIMIT 1`;
        return rows[0];
      });

      if (targetRole) {
        return J({ error: "Super Admin accounts cannot be deleted" }, 403);
      }

      await withSession(sql, SERVICE, async (tx) => {
        await tx`DELETE FROM public.user_roles WHERE user_id = ${id}`;
        await tx`DELETE FROM public.profiles WHERE user_id = ${id}`;
        await tx`DELETE FROM public.active_sessions WHERE user_id = ${id}`;
        await tx`DELETE FROM public.notifications WHERE user_id = ${id}`;
      });

      // REVIEW: replaces supabase.auth.admin.deleteUser — direct DELETE from
      // auth.users. GoTrue side-effects (identities cleanup, audit event) not replicated.
      try {
        await withSession(sql, SERVICE, (tx) => tx`DELETE FROM auth.users WHERE id = ${id}`);
      } catch (deleteError: any) {
        return J({ error: deleteError.message }, 500);
      }

      return J({ success: true });
    }

    if (type === "tenant") {
      // Delete tenant and all related data
      // Get all users in this tenant
      const tenantProfiles = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT user_id FROM public.profiles WHERE tenant_id = ${id}`);

      // Clean up tenant-scoped tables
      const tenantTables = [
        "tenant_addon_modules", "tenant_subscriptions", "tenant_modules",
        "employees", "deals", "invoices", "payments", "expenses",
        "documents", "projects", "campaigns", "email_templates",
        "attendance_records", "leave_requests", "payroll_records",
        "performance_reviews", "job_postings", "departments",
        "approval_workflows", "notifications", "lead_follow_ups",
        "company_wallet_transactions", "payment_links", "payout_requests",
      ];

      await withSession(sql, SERVICE, async (tx) => {
        for (const table of tenantTables) {
          await tx`DELETE FROM public.${tx(table)} WHERE tenant_id = ${id}`;
        }

        // Delete company wallets
        await tx`DELETE FROM public.company_wallets WHERE tenant_id = ${id}`;

        // Unlink profiles from tenant (don't delete users, just unlink)
        await tx`UPDATE public.profiles SET tenant_id = null WHERE tenant_id = ${id}`;

        // Delete user roles for tenant users
        for (const p of tenantProfiles) {
          await tx`DELETE FROM public.user_roles WHERE user_id = ${p.user_id} AND role <> 'super_admin'`;
        }
      });

      // Delete the tenant
      try {
        await withSession(sql, SERVICE, (tx) => tx`DELETE FROM public.tenants WHERE id = ${id}`);
      } catch (tenantError: any) {
        return J({ error: tenantError.message }, 500);
      }

      return J({ success: true });
    }

    return J({ error: "Invalid type" }, 400);
  } catch (err: any) {
    console.error("Admin delete error:", err);
    return J({ error: err.message || "Internal server error" }, 500);
  }
}
