// Ported from supabase/functions/admin-create-user/index.ts.
// Caller identity from Worker-issued token; super_admin check + writes go through
// the service-role session. User creation, which used the Supabase Auth admin API,
// is replaced with a direct INSERT into auth.users (bcrypt-hashed password).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { hashPassword } from "../_shared/password";

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
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

    const { email, password, full_name, role } = await req.json() as any;

    if (!email || !password || !role) {
      return J({ error: "Email, password, and role are required" }, 400);
    }

    // REVIEW: replaces supabase.auth.admin.createUser — direct insert into auth.users.
    // email_confirm:true → email_confirmed_at set to now. Semantics may differ from
    // GoTrue (no identities row, no audit event).
    const encryptedPassword = await hashPassword(password);

    let newUserId: string;
    try {
      newUserId = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`
          INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
          VALUES (gen_random_uuid(), ${email}, ${encryptedPassword}, now(), ${JSON.stringify({ full_name: full_name || "" })}::jsonb)
          RETURNING id`;
        return rows[0].id as string;
      });
    } catch (createError: any) {
      return J({ error: createError.message }, 400);
    }

    // Assign role (no tenant for platform-level roles)
    try {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.user_roles ${tx({ user_id: newUserId, role, tenant_id: null })}`);
    } catch (roleError) {
      console.error("Role assignment error:", roleError);
    }

    return J({ success: true, user_id: newUserId });
  } catch (err: any) {
    console.error("Admin create user error:", err);
    return J({ error: err.message || "Internal server error" }, 500);
  }
}
