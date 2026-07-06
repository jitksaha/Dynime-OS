// Ported from supabase/functions/hire-employee/index.ts.
// supabase.auth.admin.createUser -> direct INSERT into auth.users (bcrypt-hashed temp
// password). All DB work goes through the service-role session. Logic — fetch the
// application, create/find the user, set profile + employee role, create the employee
// row, mark the application Hired — is preserved.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { hashPassword } from "../_shared/password";

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { application_id, job_title, department, salary, tenant_id, created_by } =
      await req.json() as any;

    if (!application_id || !tenant_id || !created_by) {
      return J({ error: "Missing required fields: application_id, tenant_id, created_by" }, 400);
    }

    // Fetch application details.
    const app = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT * FROM public.job_applications WHERE id = ${application_id} LIMIT 1`;
      return rows[0];
    });
    if (!app) return J({ error: "Application not found" }, 404);

    // Generate a temporary password (vary by request; Date.now/Math.random not available
    // in workflow scripts but are fine in a normal Worker runtime).
    const tempPassword =
      `Emp${Date.now().toString(36).slice(-6)}!${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // Create the auth user, or reuse if the email already exists.
    let userId: string | null = null;
    const encryptedPassword = await hashPassword(tempPassword);
    try {
      userId = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`
          INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
          VALUES (gen_random_uuid(), ${app.applicant_email}, ${encryptedPassword}, now(),
                  ${JSON.stringify({ full_name: app.applicant_name })}::jsonb)
          RETURNING id`;
        return rows[0].id as string;
      });
    } catch (e: any) {
      // Unique-violation on email => user already exists; add as employee only.
      if (/duplicate key|already exists|unique/i.test(e.message || "")) {
        console.log("User already exists, adding as employee only");
        userId = null;
      } else {
        return J({ error: `Failed to create user: ${e.message}` }, 500);
      }
    }

    // New user: set up profile + employee role.
    if (userId) {
      await withSession(sql, SERVICE, async (tx) => {
        await tx`UPDATE public.profiles
                 SET tenant_id = ${tenant_id}, onboarding_completed = true,
                     department = ${department || null}
                 WHERE user_id = ${userId}`;
        await tx`INSERT INTO public.user_roles ${tx({ user_id: userId, tenant_id, role: "employee" })}
                 ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role`;
      });
    }

    // Create the employee record.
    let employeeId: string | undefined;
    try {
      employeeId = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`INSERT INTO public.employees ${tx({
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
        })} RETURNING id`;
        return rows[0].id as string;
      });
    } catch (e: any) {
      console.error("Employee creation error:", e);
      return J({ error: `Failed to create employee: ${e.message}` }, 500);
    }

    // Mark the application Hired.
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE public.job_applications SET status = 'Hired' WHERE id = ${application_id}`);

    return J({
      success: true,
      employee_id: employeeId,
      credentials: userId ? { email: app.applicant_email, temporary_password: tempPassword } : null,
      message: userId
        ? "Employee created with login credentials"
        : "Employee record created (user already exists in system)",
    });
  } catch (e: any) {
    console.error("hire-employee error:", e);
    return J({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
