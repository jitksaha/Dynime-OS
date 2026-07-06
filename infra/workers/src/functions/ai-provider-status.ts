// Ported from supabase/functions/ai-provider-status/index.ts — super-admin-only
// health check for configured AI providers (openai/anthropic/google). Already
// de-branded. Provider HTTP checks preserved 1:1.
//   - createClient(user, getUser)      becomes  contextFromRequest (auth)
//   - user_roles RLS check (userClient) becomes  withSession(ctx) raw SQL
//   - createClient(SERVICE_ROLE) config becomes  getPlatformSetting("ai_config")

import type { Env } from "../_shared/env";
import { json, error } from "../_shared/cors";
import { connect, withSession } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { getPlatformSetting } from "../_shared/secrets";

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

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Unauthorized", 401);
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId && ctx.role !== "service_role") return error("Invalid token", 401);

    const sql = connect(env);

    // Check super admin role (user-scoped, like the original userClient query under RLS)
    const roleRows = await withSession(sql, ctx, (tx) =>
      tx`SELECT role FROM user_roles WHERE user_id = ${ctx.userId} AND role = 'super_admin' LIMIT 1`);
    if (!roleRows[0]) return error("Super admin only", 403);

    // Load configured keys
    const cfg = await getPlatformSetting<Record<string, any>>(sql, "ai_config");
    const apiKeys = (cfg as any)?.api_keys || {};

    const checks: ProviderStatus[] = [];
    if (apiKeys.openai) checks.push(await checkOpenAI(apiKeys.openai));
    else checks.push({ provider: "openai", ok: false, message: "No API key configured" });

    if (apiKeys.anthropic) checks.push(await checkAnthropic(apiKeys.anthropic));
    else checks.push({ provider: "anthropic", ok: false, message: "No API key configured" });

    if (apiKeys.google) checks.push(await checkGoogle(apiKeys.google));
    else checks.push({ provider: "google", ok: false, message: "No API key configured" });

    return json({ statuses: checks, checked_at: new Date().toISOString() });
  } catch (e) {
    console.error("ai-provider-status error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
