import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Curated fallback model lists (used when provider API doesn't expose /models or key missing)
const FALLBACK_MODELS: Record<string, { id: string; label: string }[]> = {
  openai: [
    { id: "gpt-4o", label: "GPT-4o (Flagship)" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { id: "o1", label: "o1 (Reasoning)" },
    { id: "o1-mini", label: "o1 Mini" },
    { id: "o3-mini", label: "o3 Mini" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  ],
  google: [
    { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

// Heuristic: detect chat-capable models (filter embeddings/audio/vision-only)
function filterChatModels(provider: string, ids: string[]): string[] {
  const exclude = /(embedding|whisper|tts|audio|moderation|davinci|babbage|curie|ada|dall-e|search|realtime|transcribe|instruct|image|vision-preview)/i;
  let list = ids.filter((id) => !exclude.test(id));
  if (provider === "openai") {
    list = list.filter((id) => /^(gpt-|o1|o3|o4|chatgpt-)/i.test(id));
  } else if (provider === "google") {
    list = list.filter((id) => /gemini/i.test(id));
  } else if (provider === "anthropic") {
    list = list.filter((id) => /claude/i.test(id));
  }
  return list;
}

// Sort newest-first using version/date heuristics
function sortNewestFirst(provider: string, ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    // Date-suffixed (claude-...-20250514) → bigger date wins
    const dateA = (a.match(/(\d{8})/) || [])[1];
    const dateB = (b.match(/(\d{8})/) || [])[1];
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;
    // Version numbers (gpt-4o, gpt-4-turbo, gemini-2.5)
    const numA = parseFloat((a.match(/(\d+(?:\.\d+)?)/) || [])[1] || "0");
    const numB = parseFloat((b.match(/(\d+(?:\.\d+)?)/) || [])[1] || "0");
    if (numA !== numB) return numB - numA;
    return b.localeCompare(a);
  });
}

function prettifyLabel(provider: string, id: string): string {
  if (provider === "anthropic") {
    return id
      .replace(/-(\d{8})$/, " ($1)")
      .replace(/claude-/i, "Claude ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (provider === "google") {
    return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // openai
  return id.toUpperCase().replace(/-/g, " ");
}

async function fetchOpenAIModels(apiKey: string): Promise<{ id: string; label: string }[]> {
  const r = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) throw new Error(`OpenAI: ${r.status}`);
  const json = await r.json();
  const ids = (json.data || []).map((m: any) => m.id);
  const filtered = filterChatModels("openai", ids);
  const sorted = sortNewestFirst("openai", filtered);
  return sorted.map((id) => ({ id, label: prettifyLabel("openai", id) }));
}

async function fetchGoogleModels(apiKey: string): Promise<{ id: string; label: string }[]> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!r.ok) throw new Error(`Google: ${r.status}`);
  const json = await r.json();
  const ids = (json.models || [])
    .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m: any) => (m.name || "").replace(/^models\//, ""));
  const filtered = filterChatModels("google", ids);
  const sorted = sortNewestFirst("google", filtered);
  return sorted.map((id) => ({ id, label: prettifyLabel("google", id) }));
}

async function fetchAnthropicModels(apiKey: string): Promise<{ id: string; label: string }[]> {
  const r = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!r.ok) throw new Error(`Anthropic: ${r.status}`);
  const json = await r.json();
  const ids = (json.data || []).map((m: any) => m.id);
  const filtered = filterChatModels("anthropic", ids);
  const sorted = sortNewestFirst("anthropic", filtered);
  return sorted.map((id) => ({ id, label: prettifyLabel("anthropic", id) }));
}

async function getApiKey(provider: string): Promise<string | null> {
  // 1. Try DB (platform_settings.ai_config.api_keys)
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_config")
      .maybeSingle();
    const k = (data?.value as any)?.api_keys?.[provider];
    if (k) return k;
  } catch (_) {}
  // 2. Fallback to env var
  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_AI_API_KEY",
  };
  return Deno.env.get(envMap[provider]) || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "openai";

    if (!["openai", "anthropic", "google"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = await getApiKey(provider);
    if (!apiKey) {
      return new Response(JSON.stringify({
        models: FALLBACK_MODELS[provider],
        source: "fallback",
        message: "No API key configured — using curated list. Add a key to fetch latest models live.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let models: { id: string; label: string }[] = [];
    try {
      if (provider === "openai") models = await fetchOpenAIModels(apiKey);
      else if (provider === "anthropic") models = await fetchAnthropicModels(apiKey);
      else if (provider === "google") models = await fetchGoogleModels(apiKey);
    } catch (e: any) {
      console.error(`Failed to fetch ${provider} models:`, e.message);
      return new Response(JSON.stringify({
        models: FALLBACK_MODELS[provider],
        source: "fallback",
        message: `Could not reach ${provider} API (${e.message}). Showing cached list.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!models.length) models = FALLBACK_MODELS[provider];

    return new Response(JSON.stringify({
      models,
      source: "live",
      latest: models[0]?.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-models-list error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
