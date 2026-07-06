// Phase 4 — OAuth (Google / Apple). Replaces the social-oauth-init / social-oauth-callback
// edge functions and supabase.auth.signInWithOAuth.
//
// Flow:
//   GET /auth/authorize?provider=google&redirect_to=<app-url>
//     -> 302 to the provider consent screen (state nonce stored in KV)
//   GET /auth/callback?provider=google&code=...&state=...
//     -> exchanges code, upserts auth.users + auth.identities, then redirects to the
//        app with the session in the URL fragment (#access_token=...&refresh_token=...)
//        which the frontend adapter parses (same shape Supabase used).

import type { Env } from "../_shared/env";
import { error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { buildSession } from "./index";

interface ProviderCfg {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
  userInfo: (accessToken: string) => Promise<{ sub: string; email: string | null; name?: string }>;
}

function providers(env: Env): Record<string, ProviderCfg> {
  return {
    google: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      userInfo: async (tok) => {
        const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: { authorization: `Bearer ${tok}` },
        });
        const j = await r.json() as any;
        return { sub: j.sub, email: j.email ?? null, name: j.name };
      },
    },
    apple: {
      authUrl: "https://appleid.apple.com/auth/authorize",
      tokenUrl: "https://appleid.apple.com/auth/token",
      scope: "name email",
      clientId: env.APPLE_OAUTH_CLIENT_ID,
      clientSecret: env.APPLE_OAUTH_CLIENT_SECRET,
      // Apple returns identity in the id_token JWT; decode minimally.
      userInfo: async (idToken) => {
        const payload = JSON.parse(atob(idToken.split(".")[1] || "")) as any;
        return { sub: payload.sub, email: payload.email ?? null };
      },
    },
  };
}

function redirectUri(env: Env): string {
  return `${env.APP_URL.replace(/\/$/, "")}/auth/callback`;
}

export async function handleOAuthAuthorize(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const name = url.searchParams.get("provider") || "";
  const cfg = providers(env)[name];
  if (!cfg || !cfg.clientId) return error(`OAuth provider not configured: ${name}`, 400);

  const state = crypto.randomUUID();
  const redirectTo = url.searchParams.get("redirect_to") || env.APP_URL;
  await env.CACHE.put(`oauth:${state}`, JSON.stringify({ provider: name, redirectTo }), {
    expirationTtl: 600,
  });

  const auth = new URL(cfg.authUrl);
  auth.searchParams.set("client_id", cfg.clientId);
  auth.searchParams.set("redirect_uri", `${redirectUri(env)}?provider=${name}`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", cfg.scope);
  auth.searchParams.set("state", state);
  if (name === "apple") auth.searchParams.set("response_mode", "form_post");

  return Response.redirect(auth.toString(), 302);
}

export async function handleOAuthCallback(
  req: Request, env: Env, sql: ReturnType<typeof connect>,
): Promise<Response> {
  const url = new URL(req.url);
  const name = url.searchParams.get("provider") || "";
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const cfg = providers(env)[name];
  if (!cfg || !cfg.clientId || !cfg.clientSecret) return error("OAuth not configured", 400);

  const stored = await env.CACHE.get(`oauth:${state}`);
  if (!stored) return error("Invalid or expired OAuth state", 400);
  await env.CACHE.delete(`oauth:${state}`);
  const { redirectTo } = JSON.parse(stored) as { redirectTo: string };

  // Exchange code -> tokens.
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: `${redirectUri(env)}?provider=${name}`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return error(`Token exchange failed: ${await tokenRes.text()}`, 400);
  const tokens = await tokenRes.json() as any;

  const profile = await cfg.userInfo(name === "apple" ? tokens.id_token : tokens.access_token);
  if (!profile.email) return error("Provider did not return an email", 400);

  // Upsert user + identity.
  const user = await withSession(sql, SERVICE, async (tx) => {
    const existing = await tx`SELECT id, email, encrypted_password, raw_user_meta_data,
                                     raw_app_meta_data, banned_until, deleted_at
                              FROM auth.users WHERE email = ${profile.email!.toLowerCase()} LIMIT 1`;
    let row = existing[0];
    if (!row) {
      const inserted = await tx`INSERT INTO auth.users
          (email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
        VALUES (${profile.email!.toLowerCase()}, now(),
                ${tx.json({ full_name: profile.name ?? null, provider: name })},
                ${tx.json({ provider: name, providers: [name] })})
        RETURNING id, email, encrypted_password, raw_user_meta_data,
                  raw_app_meta_data, banned_until, deleted_at`;
      row = inserted[0];
    }
    await tx`INSERT INTO auth.identities (id, user_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
             VALUES (${profile.sub}, ${row.id}, ${name}, ${tx.json(profile)}, now(), now(), now())
             ON CONFLICT (provider, id) DO UPDATE
               SET identity_data = EXCLUDED.identity_data, last_sign_in_at = now()`
      .catch(() => { /* auth.identities optional; ignore if absent */ });
    return row;
  });

  const session = await buildSession(env, sql, user as any);
  // Hand the session to the SPA via fragment (parsed by the frontend adapter).
  const dest = new URL(redirectTo);
  dest.hash =
    `access_token=${session.access_token}` +
    `&refresh_token=${session.refresh_token}` +
    `&expires_in=${session.expires_in}&token_type=bearer`;
  return Response.redirect(dest.toString(), 302);
}
