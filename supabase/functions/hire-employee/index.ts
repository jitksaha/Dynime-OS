import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id, job_title, department, salary, tenant_id, created_by } = await req.json();

    if (!application_id || !tenant_id || !created_by) {
      throw new Error("Missing required fields: application_id, tenant_id, created_by");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch application details
    const { data: app, error: appErr } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appErr || !app) throw new Error("Application not found");

    // Generate a temporary password
    const tempPassword = `Emp${Date.now().toString(36).slice(-6)}!${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: app.applicant_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: app.applicant_name,
      },
    });

    if (authError) {
      // If user already exists, just add as employee
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        console.log("User already exists, adding as employee only");
      } else {
        throw new Error(`Failed to create user: ${authError.message}`);
      }
    }

    const userId = authData?.user?.id;

    // If new user created, set up profile and role
    if (userId) {
      // Update profile with tenant
      await supabase
        .from("profiles")
        .update({
          tenant_id,
          onboarding_completed: true,
          department: department || null,
        })
        .eq("user_id", userId);

      // Assign employee role
      await supabase
        .from("user_roles")
        .upsert({
          user_id: userId,
          tenant_id,
          role: "employee",
        }, { onConflict: "user_id,tenant_id" });
    }

    // Create employee record
    const { data: employee, error: empErr } = await supabase
      .from("employees")
      .insert({
        full_name: app.applicant_name,
        email: app.applicant_email,
        phone: app.applicant_phone || null,
        department: department || "General",
        job_title: job_title || "New Hire",
        salary: salary ? parseFloat(salary) : null,
        status: "Active",
        hire_date: new Date().toISOString().split("T")[0],
        tenant_id,
        created_by,
      })
      .select("id")
      .single();

    if (empErr) {
      console.error("Employee creation error:", empErr);
      throw new Error(`Failed to create employee: ${empErr.message}`);
    }

    // Update application status to Hired
    await supabase
      .from("job_applications")
      .update({ status: "Hired" })
      .eq("id", application_id);

    return new Response(
      JSON.stringify({
        success: true,
        employee_id: employee?.id,
        credentials: userId ? {
          email: app.applicant_email,
          temporary_password: tempPassword,
        } : null,
        message: userId
          ? "Employee created with login credentials"
          : "Employee record created (user already exists in system)",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("hire-employee error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
