// Ported from supabase/functions/contact-submit/index.ts.
// Service-role DB access via connect()+withSession(SERVICE). Admin email goes
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
    const { name, email, subject, message } = await req.json() as any;

    if (!name || !email || !subject || !message) {
      return J({ error: "All fields are required" }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return J({ error: "Invalid email address" }, 400);
    }

    if (name.length > 100 || email.length > 255 || subject.length > 200 || message.length > 5000) {
      return J({ error: "Input exceeds maximum length" }, 400);
    }

    let insertedId: string;
    try {
      const rows = await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.contact_submissions ${tx({ name, email, subject, message })} RETURNING id`);
      insertedId = rows[0]?.id;
    } catch (e) {
      console.error("DB insert error:", e);
      return J({ error: "Failed to submit" }, 500);
    }

    // Fire-and-forget: notify admins in the background (don't block response)
    const notifyAdmins = async () => {
      try {
        const adminRoles = await withSession(sql, SERVICE, (tx) =>
          tx`SELECT user_id FROM public.user_roles WHERE role = 'super_admin'`);

        if (adminRoles && adminRoles.length > 0) {
          for (const admin of adminRoles) {
            const adminInfo = await withSession(sql, SERVICE, async (tx) => {
              const profiles = await tx`SELECT tenant_id FROM public.profiles WHERE user_id = ${admin.user_id} LIMIT 1`;
              const tenantId = profiles[0]?.tenant_id;

              if (tenantId) {
                await tx`INSERT INTO public.notifications ${tx({
                  user_id: admin.user_id,
                  tenant_id: tenantId,
                  title: "New Contact Form Submission",
                  message: `${name} (${email}) submitted: "${subject}"`,
                  type: "info",
                  module: "contact",
                })}`;
              }

              // REVIEW: Supabase auth.admin.getUserById replaced with direct auth.users read.
              const users = await tx`SELECT email FROM auth.users WHERE id = ${admin.user_id} LIMIT 1`;
              return { email: users[0]?.email as string | undefined };
            });

            if (adminInfo.email) {
              await sendEmail(env, {
                to: adminInfo.email,
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

    return J({ success: true, id: insertedId }, 200);
  } catch (err) {
    console.error("Contact form error:", err);
    return J({ error: "Internal server error" }, 500);
  }
}
