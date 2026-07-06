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

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify super_admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Super admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, id } = await req.json();

    if (type === "user") {
      // Prevent self-deletion
      if (id === user.id) {
        return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent deletion of any super_admin user
      const { data: targetRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (targetRole) {
        return new Response(JSON.stringify({ error: "Super Admin accounts cannot be deleted" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("user_roles").delete().eq("user_id", id);
      await supabase.from("profiles").delete().eq("user_id", id);
      await supabase.from("active_sessions").delete().eq("user_id", id);
      await supabase.from("notifications").delete().eq("user_id", id);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "tenant") {
      // Delete tenant and all related data
      // Get all users in this tenant
      const { data: tenantProfiles } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("tenant_id", id);

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

      for (const table of tenantTables) {
        await supabase.from(table).delete().eq("tenant_id", id);
      }

      // Delete company wallets
      await supabase.from("company_wallets").delete().eq("tenant_id", id);

      // Unlink profiles from tenant (don't delete users, just unlink)
      await supabase
        .from("profiles")
        .update({ tenant_id: null })
        .eq("tenant_id", id);

      // Delete user roles for tenant users
      if (tenantProfiles) {
        for (const p of tenantProfiles) {
          await supabase.from("user_roles").delete().eq("user_id", p.user_id).neq("role", "super_admin");
        }
      }

      // Delete the tenant
      const { error: tenantError } = await supabase.from("tenants").delete().eq("id", id);
      if (tenantError) {
        return new Response(JSON.stringify({ error: tenantError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Admin delete error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
