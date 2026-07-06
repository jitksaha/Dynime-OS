import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get the calling user from the authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const { tenant_id, confirmation_text } = await req.json();

    if (!tenant_id) {
      return json({ error: "tenant_id is required" }, 400);
    }

    // Verify user is the owner of this tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, is_owner")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.tenant_id !== tenant_id || !profile.is_owner) {
      return json({ error: "Only the company owner can delete this company" }, 403);
    }

    // Get tenant info for confirmation
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    if (!tenant) {
      return json({ error: "Company not found" }, 404);
    }

    // Verify confirmation text
    if (confirmation_text !== tenant.name) {
      return json({ error: "Confirmation text does not match company name" }, 400);
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
        await supabase.from(table).delete().eq("tenant_id", tenant_id);
      } catch (e) {
        // Table might not exist or column might not exist — continue
        console.log(`Skipped ${table}: ${e.message}`);
      }
    }

    // 2. Unlink all user profiles from this tenant
    const { data: linkedProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("tenant_id", tenant_id);

    if (linkedProfiles && linkedProfiles.length > 0) {
      // Check if users have other companies
      for (const p of linkedProfiles) {
        const { data: otherRoles } = await supabase
          .from("user_roles")
          .select("tenant_id")
          .eq("user_id", p.user_id)
          .neq("tenant_id", tenant_id);

        if (otherRoles && otherRoles.length > 0) {
          // Switch user to their next company
          await supabase.from("profiles")
            .update({ tenant_id: otherRoles[0].tenant_id, is_owner: false })
            .eq("user_id", p.user_id);
        } else {
          // User has no other companies — clear tenant_id, mark onboarding incomplete
          await supabase.from("profiles")
            .update({ tenant_id: null, is_owner: false, onboarding_completed: false })
            .eq("user_id", p.user_id);
        }
      }
    }

    // 3. Delete user_roles for this tenant
    await supabase.from("user_roles").delete().eq("tenant_id", tenant_id);

    // 4. Finally delete the tenant (CASCADE will handle remaining FK tables)
    const { error: deleteErr } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenant_id);

    if (deleteErr) {
      console.error("Tenant delete error:", deleteErr);
      return json({ error: "Failed to delete company: " + deleteErr.message }, 500);
    }

    // 5. Log the deletion in audit
    await supabase.from("audit_logs").insert({
      action: "COMPANY_DELETED",
      module: "settings",
      resource_type: "tenant",
      resource_id: tenant_id,
      user_id: user.id,
      details: { company_name: tenant.name, deleted_by: user.email },
    });

    return json({ success: true, message: `Company "${tenant.name}" has been permanently deleted.` });
  } catch (err) {
    console.error("Company delete error:", err);
    return json({ error: err.message }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
