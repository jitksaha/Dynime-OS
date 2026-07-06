import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, credentialId, publicKey, friendlyName, transports } = body;

    if (action === "generate-registration-challenge") {
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      await supabase.from("webauthn_challenges").delete().eq("user_id", user.id);
      await supabase.from("webauthn_challenges").insert({ user_id: user.id, challenge, type: "registration" });

      const { data: existing } = await supabase.from("user_passkeys").select("credential_id").eq("user_id", user.id);

      return new Response(JSON.stringify({
        challenge, userId: user.id, userEmail: user.email,
        excludeCredentials: (existing || []).map((c: any) => c.credential_id),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate-authentication-challenge") {
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      await supabase.from("webauthn_challenges").delete().eq("user_id", user.id);
      await supabase.from("webauthn_challenges").insert({ user_id: user.id, challenge, type: "authentication" });

      const { data: credentials } = await supabase.from("user_passkeys").select("credential_id, transports").eq("user_id", user.id);

      return new Response(JSON.stringify({
        challenge,
        allowCredentials: (credentials || []).map((c: any) => ({ id: c.credential_id, transports: c.transports || [] })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify-registration") {
      const { data: challengeData } = await supabase
        .from("webauthn_challenges").select("*")
        .eq("user_id", user.id).eq("type", "registration")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (!challengeData) throw new Error("No active challenge found");
      if (Date.now() - new Date(challengeData.created_at).getTime() > 5 * 60 * 1000) throw new Error("Challenge expired");

      const { error: insertErr } = await supabase.from("user_passkeys").insert({
        user_id: user.id, credential_id: credentialId, public_key: publicKey,
        friendly_name: friendlyName || "My Passkey", transports: transports || [],
      });
      if (insertErr) throw insertErr;

      await supabase.from("webauthn_challenges").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify-authentication") {
      const { data: cred } = await supabase.from("user_passkeys").select("*")
        .eq("credential_id", credentialId).eq("user_id", user.id).maybeSingle();
      if (!cred) throw new Error("Credential not found");

      await supabase.from("user_passkeys")
        .update({ sign_count: cred.sign_count + 1, last_used_at: new Date().toISOString() })
        .eq("id", cred.id);
      await supabase.from("webauthn_challenges").delete().eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true, friendlyName: cred.friendly_name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
