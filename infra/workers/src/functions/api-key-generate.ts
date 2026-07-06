// Ported from supabase/functions/api-key-generate/index.ts.
// User identity from the Worker-issued token; insert runs under the user's RLS session.
// Key generation/hashing preserved verbatim (Web Crypto).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `bst_${key}`;
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) {
      return J({ error: "Unauthorized" }, 401);
    }
    const userId = ctx.userId;

    const { name, scopes, expires_in_days } = await req.json() as any;

    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
      : null;

    const data = await withSession(sql, ctx, async (tx) => {
      // Get tenant
      const profiles = await tx`SELECT tenant_id FROM public.profiles WHERE user_id = ${userId} LIMIT 1`;
      const tenantId = profiles[0]?.tenant_id;
      if (!tenantId) return null;

      const rows = await tx`INSERT INTO public.api_keys ${tx({
        tenant_id: tenantId,
        name: name || "Unnamed Key",
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: scopes || ["read"],
        created_by: userId,
        expires_at: expiresAt,
      })} RETURNING *`;
      return rows[0];
    });

    if (!data) {
      return J({ error: "No tenant found" }, 400);
    }

    // Return the raw key only on creation — it can never be retrieved again
    return J({ ...data, raw_key: rawKey }, 201);
  } catch (e: any) {
    console.error("api-key-generate error:", e);
    return J({ error: e.message }, 500);
  }
}
