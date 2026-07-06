import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (name.length > 100 || email.length > 255 || subject.length > 200 || message.length > 5000) {
      return new Response(JSON.stringify({ error: "Input exceeds maximum length" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("contact_submissions")
      .insert({ name, email, subject, message })
      .select("id")
      .single();

    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to submit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fire-and-forget: notify admins in the background (don't block response)
    const notifyAdmins = async () => {
      try {
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin");

        if (adminRoles && adminRoles.length > 0) {
          for (const admin of adminRoles) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("tenant_id")
              .eq("user_id", admin.user_id)
              .maybeSingle();

            if (profile?.tenant_id) {
              await supabase.from("notifications").insert({
                user_id: admin.user_id,
                tenant_id: profile.tenant_id,
                title: "New Contact Form Submission",
                message: `${name} (${email}) submitted: "${subject}"`,
                type: "info",
                module: "contact",
              });
            }

            const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
            if (userData?.user?.email) {
              await supabase.functions.invoke("send-custom-email", {
                body: {
                  to: userData.user.email,
                  subject: `New Contact: ${subject}`,
                  html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <h2 style="color:#333;">📩 New Contact Form Submission</h2>
                    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td></tr>
                      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
                      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Subject</td><td style="padding:8px;border-bottom:1px solid #eee;">${subject}</td></tr>
                    </table>
                    <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:16px 0;">
                      <p style="color:#333;margin:0;">${message}</p>
                    </div>
                  </div>`,
                  email_type: "notification_contact",
                },
              });
            }
          }
        }
      } catch (e) {
        console.error("Background notify error:", e);
      }
    };

    // Don't await — let it run in background
    notifyAdmins();

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
