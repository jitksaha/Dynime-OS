import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  apple: "https://appleid.apple.com/auth/token",
};

const USERINFO_URLS: Record<string, string> = {
  google: "https://www.googleapis.com/oauth2/v2/userinfo",
};

function parseJwt(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, state: stateStr, callback_origin } = await req.json();

    if (!code || !stateStr) {
      return new Response(
        JSON.stringify({ error: "code and state are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let state: { provider_key: string; redirect_uri: string };
    try {
      state = JSON.parse(atob(stateStr));
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["google", "apple"].includes(state.provider_key)) {
      return new Response(
        JSON.stringify({ error: "Unsupported provider" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch provider config
    const { data: provider } = await supabase
      .from("social_signin_providers")
      .select("*")
      .eq("provider_key", state.provider_key)
      .eq("is_enabled", true)
      .maybeSingle();

    if (!provider?.client_id || !provider?.client_secret) {
      return new Response(
        JSON.stringify({ error: "Provider not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(tokenBody).toString(),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return new Response(
        JSON.stringify({ error: tokenData.error_description || tokenData.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      const userData = await userRes.json();
      email = userData.email;
      fullName = userData.name;
      avatarUrl = userData.picture;
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve email from provider" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email!.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      // Update metadata with social info
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: existingUser.user_metadata?.full_name || fullName,
          avatar_url: existingUser.user_metadata?.avatar_url || avatarUrl,
        },
      });
    } else {
      isNewUser = true;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          avatar_url: avatarUrl,
          account_type: "company",
          provider: state.provider_key,
        },
      });
      if (createError || !newUser.user) {
        console.error("User creation error:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = newUser.user.id;
    }

    // Upsert social linked account
    await supabase
      .from("social_linked_accounts")
      .upsert({
        user_id: userId,
        provider_key: state.provider_key,
        provider_email: email,
        provider_name: fullName,
        provider_avatar: avatarUrl,
        linked_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider_key" });

    // Generate magic link for session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email!,
    });

    if (linkError || !linkData) {
      console.error("Link generation error:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenHash = linkData.properties?.hashed_token;

    if (!tokenHash) {
      return new Response(
        JSON.stringify({ error: "Failed to generate authentication token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has completed onboarding (for existing users)
    let hasOnboarding = false;
    if (!isNewUser) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarding_completed, tenant_id")
        .eq("user_id", userId)
        .maybeSingle();
      hasOnboarding = profileData?.onboarding_completed === true;
    }

    // Check user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        token_hash: tokenHash,
        type: "magiclink",
        provider: state.provider_key,
        is_new_user: isNewUser,
        has_onboarding: hasOnboarding,
        user_role: roleData?.role || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
