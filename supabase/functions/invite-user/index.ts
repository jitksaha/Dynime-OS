import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is a super_admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Forbidden: super_admin only");

    const { email, role, tenant_id, full_name } = await req.json();
    if (!email || !tenant_id) throw new Error("email and tenant_id required");

    // Generate a temp password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";

    // Create user via admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split("@")[0] },
    });

    if (createError) throw createError;

    const userId = newUser.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      full_name: full_name || email.split("@")[0],
      tenant_id,
      onboarding_completed: true,
    });

    // Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: role || "employee",
      tenant_id,
    });

    // Record invitation
    await supabaseAdmin.from("user_invitations").insert({
      email,
      role: role || "employee",
      tenant_id,
      invited_by: user.id,
      status: "completed",
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        temp_password: tempPassword,
        message: "User created. Share the temporary password securely.",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
