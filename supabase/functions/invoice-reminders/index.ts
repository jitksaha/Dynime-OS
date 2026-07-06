import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    const { data: overdueInvoices, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, client, amount, due_date, tenant_id, created_by")
      .eq("status", "Pending")
      .lt("due_date", today);

    if (error) throw error;

    const notifications = [];
    const emailPromises = [];

    for (const inv of overdueInvoices || []) {
      notifications.push({
        user_id: inv.created_by,
        tenant_id: inv.tenant_id,
        title: "Overdue Invoice Reminder",
        message: `Invoice ${inv.invoice_number} for ${inv.client} (৳${Number(inv.amount).toLocaleString()}) is past due (${inv.due_date}). Please follow up.`,
        type: "warning",
        module: "accounting",
      });

      // Get user email for email notification
      const { data: userData } = await supabase.auth.admin.getUserById(inv.created_by);
      if (userData?.user?.email) {
        emailPromises.push(
          supabase.functions.invoke("send-custom-email", {
            body: {
              to: userData.user.email,
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
            },
          })
        );
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase.from("notifications").insert(notifications);
      if (insertError) throw insertError;
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
});
