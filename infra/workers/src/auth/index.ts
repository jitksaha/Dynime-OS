// Phase 4 — Auth service. Replaces Supabase Auth. Mounted at /auth/* by the router.
//
// Endpoints (kept close to supabase.auth.* so the frontend adapter is thin):
//   POST /auth/token?grant_type=password     { email, password }   -> session
//   POST /auth/token?grant_type=refresh_token { refresh_token }    -> session
//   POST /auth/signup                         { email, password }   -> session
//   POST /auth/logout                         (Bearer)              -> {}
//   GET  /auth/user                           (Bearer)              -> { user }
//   PUT  /auth/user                           (Bearer) { ... }      -> { user }
//   POST /auth/recover                        { email }             -> {} (sends email)
//   GET  /auth/authorize?provider=google      -> 302 to provider    (OAuth start)
//   GET  /auth/callback?provider=google&code= -> session            (OAuth finish)
//
// A "session" response mirrors Supabase: { access_token, refresh_token, token_type,
// expires_in, user }.

import type { Env } from "../_shared/env";
import { json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { verifyPassword, hashPassword } from "../_shared/password";
import {
  signAccessToken, newRefreshToken, storeRefreshToken, consumeRefreshToken,
  verifyAccessToken,
} from "../_shared/jwt";
import { handleOAuthAuthorize, handleOAuthCallback } from "./oauth";

interface DbUser {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  raw_user_meta_data: Record<string, unknown>;
  raw_app_meta_data: Record<string, unknown>;
  banned_until: string | null;
  deleted_at: string | null;
}

export function publicUser(u: DbUser) {
  return {
    id: u.id,
    email: u.email,
    user_metadata: u.raw_user_meta_data ?? {},
    app_metadata: u.raw_app_meta_data ?? {},
    aud: "authenticated",
    role: "authenticated",
  };
}

async function tenantIdFor(sql: ReturnType<typeof connect>, userId: string): Promise<string | null> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    tx`SELECT tenant_id FROM public.profiles WHERE user_id = ${userId} LIMIT 1`);
  return (rows[0]?.tenant_id as string) ?? null;
}

export async function buildSession(env: Env, sql: ReturnType<typeof connect>, u: DbUser) {
  const tenant_id = await tenantIdFor(sql, u.id);
  const access_token = await signAccessToken(env, {
    sub: u.id, email: u.email, role: "authenticated", tenant_id,
  });
  const refresh_token = newRefreshToken();
  await storeRefreshToken(env, refresh_token, u.id);
  return {
    access_token,
    refresh_token,
    token_type: "bearer",
    expires_in: parseInt(env.JWT_ACCESS_TTL || "3600", 10),
    user: publicUser(u),
  };
}

async function findUserByEmail(sql: ReturnType<typeof connect>, email: string): Promise<DbUser | null> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    tx`SELECT id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data,
              banned_until, deleted_at
       FROM auth.users WHERE email = ${email} AND deleted_at IS NULL LIMIT 1`);
  return (rows[0] as DbUser) ?? null;
}

export async function findUserById(sql: ReturnType<typeof connect>, id: string): Promise<DbUser | null> {
  const rows = await withSession(sql, SERVICE, (tx) =>
    tx`SELECT id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data,
              banned_until, deleted_at
       FROM auth.users WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`);
  return (rows[0] as DbUser) ?? null;
}

export async function handleAuth(req: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(req.url);
  const sql = connect(env);

  try {
    // --- password / refresh token grant ---
    if (path === "/auth/token" && req.method === "POST") {
      const grant = url.searchParams.get("grant_type");
      const body = await req.json().catch(() => ({})) as Record<string, string>;

      if (grant === "password") {
        const user = await findUserByEmail(sql, (body.email || "").toLowerCase());
        if (!user || !(await verifyPassword(body.password || "", user.encrypted_password || ""))) {
          return error("Invalid login credentials", 400, { error_code: "invalid_credentials" });
        }
        if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
          return error("User is banned", 403);
        }
        await touchLastSignIn(sql, user.id);
        return json(await buildSession(env, sql, user));
      }

      if (grant === "refresh_token") {
        const userId = await consumeRefreshToken(env, body.refresh_token || "");
        if (!userId) return error("Invalid refresh token", 400);
        const user = await findUserById(sql, userId);
        if (!user) return error("User not found", 400);
        return json(await buildSession(env, sql, user));
      }

      return error("Unsupported grant_type", 400);
    }

    // --- signup ---
    if (path === "/auth/signup" && req.method === "POST") {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const email = String(body.email || "").toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return error("Email and password required", 400);
      if (await findUserByEmail(sql, email)) return error("User already registered", 400, { error_code: "user_already_exists" });

      const hash = await hashPassword(password);
      const meta = (body.data as Record<string, unknown>) || {};
      const rows = await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
           VALUES (${email}, ${hash}, ${tx.json(meta as any)}, now())
           RETURNING id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data,
                     banned_until, deleted_at`);
      return json(await buildSession(env, sql, rows[0] as DbUser));
    }

    // --- logout ---
    if (path === "/auth/logout" && req.method === "POST") {
      const body = await req.json().catch(() => ({})) as Record<string, string>;
      if (body.refresh_token) await consumeRefreshToken(env, body.refresh_token);
      return json({});
    }

    // --- get / update current user ---
    if (path === "/auth/user") {
      const claims = await verifyAccessToken(env, bearer(req));
      if (!claims) return error("Unauthorized", 401);
      const user = await findUserById(sql, claims.sub);
      if (!user) return error("User not found", 404);

      if (req.method === "GET") return json({ user: publicUser(user) });

      if (req.method === "PUT") {
        const body = await req.json().catch(() => ({})) as Record<string, unknown>;
        let newHash: string | null = null;
        if (body.password) newHash = await hashPassword(String(body.password));
        const newEmail = body.email ? String(body.email).toLowerCase() : user.email;
        const newMeta = body.data
          ? { ...(user.raw_user_meta_data || {}), ...(body.data as Record<string, unknown>) }
          : user.raw_user_meta_data;
        const rows = await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE auth.users SET
               email = ${newEmail},
               encrypted_password = COALESCE(${newHash}, encrypted_password),
               raw_user_meta_data = ${tx.json(newMeta as any)},
               updated_at = now()
             WHERE id = ${user.id}
             RETURNING id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data,
                       banned_until, deleted_at`);
        return json({ user: publicUser(rows[0] as DbUser) });
      }
    }

    // --- password recovery (sends reset email via Phase 5 email path) ---
    if (path === "/auth/recover" && req.method === "POST") {
      const body = await req.json().catch(() => ({})) as Record<string, string>;
      // Always 200 to avoid leaking which emails exist.
      const user = await findUserByEmail(sql, (body.email || "").toLowerCase());
      if (user) {
        // TODO(Phase 5): mint a recovery token and send via send-auth-email Worker.
      }
      return json({});
    }

    // --- OAuth ---
    if (path === "/auth/authorize" && req.method === "GET") {
      return handleOAuthAuthorize(req, env);
    }
    if (path === "/auth/callback" && req.method === "GET") {
      return handleOAuthCallback(req, env, sql);
    }

    return error("Not found", 404);
  } catch (e) {
    return error(`Auth error: ${(e as Error).message}`, 500);
  }
}

function bearer(req: Request): string {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

async function touchLastSignIn(sql: ReturnType<typeof connect>, userId: string) {
  await withSession(sql, SERVICE, (tx) =>
    tx`UPDATE auth.users SET last_sign_in_at = now() WHERE id = ${userId}`);
}
