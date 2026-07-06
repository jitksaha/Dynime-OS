import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_AUTH_URLS: Record<string, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  apple: "https://appleid.apple.com/auth/authorize",
};

const PROVIDER_SCOPES: Record<string, string> = {
  google: "openid email profile",
  apple: "name email",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { provider_key, redirect_uri } = await req.json();

    if (!provider_key || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "provider_key and redirect_uri are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!PROVIDER_AUTH_URLS[provider_key]) {
      return new Response(
        JSON.stringify({ error: `Unsupported provider: ${provider_key}. Only Google and Apple are supported.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: provider, error } = await supabase
      .from("social_signin_providers")
      .select("*")
      .eq("provider_key", provider_key)
      .eq("is_enabled", true)
      .maybeSingle();

    if (error || !provider) {
      return new Response(
        JSON.stringify({ error: `Provider "${provider_key}" is not enabled or not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!provider.client_id) {
      return new Response(
        JSON.stringify({ error: `Provider "${provider_key}" is not configured (missing Client ID)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the frontend's own domain as the OAuth callback URL
    // Extract origin from redirect_uri (e.g. https://dynime.com/auth/social-callback → https://dynime.com)
    const origin = new URL(redirect_uri).origin;
    const callbackUrl = `${origin}/auth/oauth-callback`;

    const state = btoa(
      JSON.stringify({
        provider_key,
        redirect_uri,
        timestamp: Date.now(),
      })
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
      // Use query response mode so Apple redirects via GET (SPA-compatible)
      params.set("response_mode", "query");
    }

    const oauthUrl = `${PROVIDER_AUTH_URLS[provider_key]}?${params.toString()}`;

    return new Response(JSON.stringify({ url: oauthUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
