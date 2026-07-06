// Ported from supabase/functions/invite-user/index.ts.
// Caller identity from Worker-issued token; super_admin check (was the has_role
// RPC) and all writes go through the service-role session. User creation, which
// used the Supabase Auth admin API, is replaced with a direct INSERT into
// auth.users (bcrypt-hashed password).

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
    // Verify the caller is a super_admin
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) throw new Error("Unauthorized");
    const user = { id: ctx.userId };

    // REVIEW: replaces the has_role(_user_id, _role) RPC with a direct lookup.
    const isAdmin = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT 1 FROM public.user_roles WHERE user_id = ${user.id} AND role = 'super_admin' LIMIT 1`;
      return rows.length > 0;
    });
    if (!isAdmin) throw new Error("Forbidden: super_admin only");

    const { email, role, tenant_id, full_name } = await req.json() as any;
    if (!email || !tenant_id) throw new Error("email and tenant_id required");

    // Generate a temp password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";

    // REVIEW: replaces supabase.auth.admin.createUser — direct insert into auth.users.
    // email_confirm:true → email_confirmed_at set to now. Semantics may differ from
    // GoTrue (no identities row, no audit event).
    const encryptedPassword = await hashPassword(tempPassword);

    const userId = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (gen_random_uuid(), ${email}, ${encryptedPassword}, now(), ${JSON.stringify({ full_name: full_name || email.split("@")[0] })}::jsonb)
        RETURNING id`;
      return rows[0].id as string;
    });

    await withSession(sql, SERVICE, async (tx) => {
      // Create profile
      await tx`INSERT INTO public.profiles ${tx({
        user_id: userId,
        full_name: full_name || email.split("@")[0],
        tenant_id,
        onboarding_completed: true,
      })}`;

      // Assign role
      await tx`INSERT INTO public.user_roles ${tx({
        user_id: userId,
        role: role || "employee",
        tenant_id,
      })}`;

      // Record invitation
      await tx`INSERT INTO public.user_invitations ${tx({
        email,
        role: role || "employee",
        tenant_id,
        invited_by: user.id,
        status: "completed",
      })}`;
    });

    return J({
      success: true,
      user_id: userId,
      email,
      temp_password: tempPassword,
      message: "User created. Share the temporary password securely.",
    });
  } catch (error: any) {
    return J({ error: error.message }, 400);
  }
}
