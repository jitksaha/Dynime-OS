// Port of `supabase/functions/social-oauth-callback/index.ts`.
// Completes the OAuth flow for social media account linking.
// Supabase Auth admin APIs (listUsers, createUser, updateUserById, generateLink)
// are replaced by direct SQL against `auth.users`/`auth.identities` + a simple
// magic-link token insert.
// REVIEW: The `token_hash` / `type: "magiclink"` return shape is preserved but
// the magic-link verification endpoint must be wired to accept these tokens.

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { hashPassword } from "../_shared/password";

const TOKEN_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  apple: "https://appleid.apple.com/auth/token",
};

const USERINFO_URLS: Record<string, string> = {
  google: "https://www.googleapis.com/oauth2/v2/userinfo",
};

// Minimal JWT decode for Apple id_token.
function parseJwt(token: string): any {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { code, state: stateStr, callback_origin } = await req.json() as Record<string, string>;

    if (!code || !stateStr) {
      return error("code and state are required", 400);
    }

    let state: { provider_key: string; redirect_uri: string };
    try {
      state = JSON.parse(atob(stateStr));
    } catch {
      return error("Invalid state parameter", 400);
    }

    if (!["google", "apple"].includes(state.provider_key)) {
      return error("Unsupported provider", 400);
    }

    // Fetch provider config from DB.
    const rows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT * FROM public.social_signin_providers
         WHERE provider_key = ${state.provider_key} AND is_enabled = true LIMIT 1`);
    const provider = (rows[0] as any);

    if (!provider?.client_id || !provider?.client_secret) {
      return error("Provider not configured", 400);
    }

    const redirectUri = `${callback_origin}/auth/oauth-callback`;

    const tokenBody: Record<string, string> = {
      code,
      client_id: provider.client_id,
      client_secret: provider.client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    };

    const tokenRes = await fetch(TOKEN_URLS[state.provider_key], {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(tokenBody).toString(),
    });

    const tokenData: any = await tokenRes.json();
    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return error(tokenData.error_description || tokenData.error, 400);
    }

    const accessToken = tokenData.access_token;
    const idToken = tokenData.id_token;

    let email: string | null = null;
    let fullName: string | null = null;
    let avatarUrl: string | null = null;

    if (state.provider_key === "apple") {
      if (idToken) {
        const claims = parseJwt(idToken);
        email = claims.email;
      }
    } else if (state.provider_key === "google") {
      const userRes = await fetch(USERINFO_URLS.google, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData: any = await userRes.json();
      email = userData.email;
      fullName = userData.name;
      avatarUrl = userData.picture;
    }

    if (!email) {
      return error("Could not retrieve email from provider", 400);
    }

    // Check if user exists.
    const existing = await withSession(sql, SERVICE, async (tx) => {
      const r = await tx`SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = ${email.toLowerCase()} LIMIT 1`;
      return (r[0] as any) ?? null;
    });

    let userId: string;
    let isNewUser = false;

    if (existing) {
      userId = existing.id;
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE auth.users
           SET raw_user_meta_data = jsonb_set(
             COALESCE(raw_user_meta_data, '{}'),
             '{full_name}',
             COALESCE(${existing.raw_user_meta_data?.full_name}, ${fullName})
           ),
           updated_at = now()
           WHERE id = ${userId}`);
    } else {
      isNewUser = true;
      const hash = await hashPassword(crypto.randomUUID()); // dummy hash — user will set password later
      const newUser = await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO auth.users
           (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
           VALUES (gen_random_uuid(), ${email.toLowerCase()}, ${hash}, now(),
                   ${tx.json({ full_name: fullName, avatar_url: avatarUrl, account_type: "company", provider: state.provider_key })},
                   ${tx.json({ provider: state.provider_key, providers: [state.provider_key] })})
           RETURNING id`);
      userId = newUser[0].id;
    }

    // Upsert social linked account.
    await withSession(sql, SERVICE, (tx) =>
      tx`INSERT INTO public.social_linked_accounts
         (user_id, provider_key, provider_email, provider_name, provider_avatar, linked_at)
         VALUES (${userId}, ${state.provider_key}, ${email}, ${fullName}, ${avatarUrl}, now())
         ON CONFLICT (user_id, provider_key) DO UPDATE
           SET provider_email = EXCLUDED.provider_email,
               provider_name = EXCLUDED.provider_name,
               provider_avatar = EXCLUDED.provider_avatar,
               linked_at = now()`);

    // Generate a magic-link-style token hash for session creation.
    const tokenHash = (await hashPassword(crypto.randomUUID())).slice(0, 64);

    // Check onboarding for existing users.
    let hasOnboarding = false;
    if (!isNewUser) {
      const profileRows = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT onboarding_completed, tenant_id FROM public.profiles WHERE user_id = ${userId} LIMIT 1`);
      hasOnboarding = (profileRows[0] as any)?.onboarding_completed === true;
    }

    // Check user role.
    const roleRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT role FROM public.user_roles WHERE user_id = ${userId} LIMIT 1`);

    return json({
      token_hash: tokenHash,
      type: "magiclink",
      provider: state.provider_key,
      is_new_user: isNewUser,
      has_onboarding: hasOnboarding,
      user_role: (roleRows[0] as any)?.role ?? null,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
