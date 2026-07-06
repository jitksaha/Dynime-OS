// Port of `supabase/functions/social-oauth-init/index.ts`.
// Starts the OAuth flow for social media account linking (not login).
// NOTE: overlaps with auth/oauth.ts for the core OAuth logic; this port preserves
// the function-specific social-linking behavior (social_signin_providers table,
// callback URL shape, state encoding).

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

const PROVIDER_AUTH_URLS: Record<string, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  apple: "https://appleid.apple.com/auth/authorize",
};

const PROVIDER_SCOPES: Record<string, string> = {
  google: "openid email profile",
  apple: "name email",
};

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { provider_key, redirect_uri } = await req.json() as Record<string, string>;

    if (!provider_key || !redirect_uri) {
      return error("provider_key and redirect_uri are required", 400);
    }

    if (!PROVIDER_AUTH_URLS[provider_key]) {
      return error(`Unsupported provider: ${provider_key}. Only Google and Apple are supported.`, 400);
    }

    const rows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT * FROM public.social_signin_providers
         WHERE provider_key = ${provider_key} AND is_enabled = true LIMIT 1`);
    const provider = (rows[0] as any);

    if (!provider?.client_id) {
      return error(`Provider "${provider_key}" is not enabled or not found`, 404);
    }

    const origin = new URL(redirect_uri).origin;
    const callbackUrl = `${origin}/auth/oauth-callback`;

    const state = btoa(
      JSON.stringify({ provider_key, redirect_uri, timestamp: Date.now() }),
    );

    const params = new URLSearchParams({
      client_id: provider.client_id,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: PROVIDER_SCOPES[provider_key],
      state,
    });

    if (provider_key === "google") {
      params.set("access_type", "offline");
      params.set("prompt", "select_account");
    } else if (provider_key === "apple") {
      params.set("response_mode", "query");
    }

    const oauthUrl = `${PROVIDER_AUTH_URLS[provider_key]}?${params.toString()}`;

    return json({ url: oauthUrl });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
