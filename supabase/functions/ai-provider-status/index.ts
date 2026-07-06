import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProviderStatus {
  provider: string;
  ok: boolean;
  message: string;
  detail?: string;
  // Optional balance/quota info when the provider exposes it
  balance_usd?: number;
  total_granted_usd?: number;
  total_used_usd?: number;
  rate_limit_per_min?: number;
}

async function checkOpenAI(apiKey: string): Promise<ProviderStatus> {
  // OpenAI no longer exposes a stable public balance endpoint, so we do a cheap auth/model check
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (r.ok) {
      return {
        provider: "openai",
        ok: true,
        message: "API key valid. Live balance is not exposed by OpenAI's public API — check usage at platform.openai.com/usage.",
      };
    }
    const txt = await r.text();
    if (r.status === 401) return { provider: "openai", ok: false, message: "Invalid API key", detail: txt.slice(0, 300) };
    if (r.status === 429) return { provider: "openai", ok: false, message: "Rate limited / quota exceeded", detail: txt.slice(0, 300) };
    return { provider: "openai", ok: false, message: `HTTP ${r.status}`, detail: txt.slice(0, 300) };
  } catch (e) {
    return { provider: "openai", ok: false, message: "Network error", detail: String(e) };
  }
}

async function checkAnthropic(apiKey: string): Promise<ProviderStatus> {
  try {
    // Lightweight ping: tiny message to claude haiku
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    if (r.ok) {
      return { provider: "anthropic", ok: true, message: "API key valid. Anthropic does not expose a balance endpoint — check usage at console.anthropic.com." };
    }
    const txt = await r.text();
    if (r.status === 401) return { provider: "anthropic", ok: false, message: "Invalid API key", detail: txt.slice(0, 300) };
    if (r.status === 429) return { provider: "anthropic", ok: false, message: "Rate limited", detail: txt.slice(0, 300) };
    if (r.status === 402 || r.status === 400) return { provider: "anthropic", ok: false, message: "Quota / billing issue", detail: txt.slice(0, 300) };
    return { provider: "anthropic", ok: false, message: `HTTP ${r.status}`, detail: txt.slice(0, 300) };
  } catch (e) {
    return { provider: "anthropic", ok: false, message: "Network error", detail: String(e) };
  }
}

async function checkGoogle(apiKey: string): Promise<ProviderStatus> {
  try {
    // List models endpoint — validates the key and project access
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    const txt = await r.text();
    if (r.ok) {
      let modelCount = 0;
      try { modelCount = (JSON.parse(txt).models || []).length; } catch {}
      return {
        provider: "google",
        ok: true,
        message: `API key valid. ${modelCount} models accessible. Free-tier quota resets daily — check aistudio.google.com.`,
      };
    }
    if (r.status === 400 || r.status === 403) return { provider: "google", ok: false, message: "Invalid key or Generative Language API not enabled in your Google Cloud project", detail: txt.slice(0, 300) };
    if (r.status === 429) return { provider: "google", ok: false, message: "Quota exceeded (limit: 0 usually means free-tier disabled for the key's project)", detail: txt.slice(0, 300) };
    return { provider: "google", ok: false, message: `HTTP ${r.status}`, detail: txt.slice(0, 300) };
  } catch (e) {
    return { provider: "google", ok: false, message: "Network error", detail: String(e) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super admin role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Super admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load configured keys
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await supa.from("platform_settings").select("value").eq("key", "ai_config").maybeSingle();
    const apiKeys = (cfg?.value as any)?.api_keys || {};

    const checks: ProviderStatus[] = [];
    if (apiKeys.openai) checks.push(await checkOpenAI(apiKeys.openai));
    else checks.push({ provider: "openai", ok: false, message: "No API key configured" });

    if (apiKeys.anthropic) checks.push(await checkAnthropic(apiKeys.anthropic));
    else checks.push({ provider: "anthropic", ok: false, message: "No API key configured" });

    if (apiKeys.google) checks.push(await checkGoogle(apiKeys.google));
    else checks.push({ provider: "google", ok: false, message: "No API key configured" });

    return new Response(JSON.stringify({ statuses: checks, checked_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-provider-status error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
