// Phase 5 — webhook-dispatch ported to a Worker.
// Source: supabase/functions/webhook-dispatch/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// Server-initiated outbound webhook fan-out (no user JWT -> SERVICE context).
// Active webhook lookup uses getWebhookConfigs(sql, tenantId, event). The outbound
// HMAC (Web Crypto, SHA-256) request signature is preserved EXACTLY.
//
// REVIEW: getWebhookConfigs reads webhook_configs by `active`/`ANY(events)`, while
// the source filtered on `is_active`/contains(events). Confirm the migrated column
// names match the helper.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getWebhookConfigs } from "../_shared/secrets";

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { event, tenant_id, payload } = await req.json() as any;
    if (!event || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing event or tenant_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find active webhooks for this tenant and event
    const webhooks = await getWebhookConfigs(sql, tenant_id, event);

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ message: "No matching webhooks" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = await Promise.all(
      webhooks.map(async (wh: any) => {
        const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (wh.secret) {
          // Simple HMAC signature
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey("raw", encoder.encode(wh.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
          const hexSig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
          headers["X-Webhook-Signature"] = `sha256=${hexSig}`;
        }

        let success = false;
        let status = 0;
        let responseBody = "";

        try {
          const resp = await fetch(wh.url, { method: "POST", headers, body });
          status = resp.status;
          responseBody = await resp.text();
          success = resp.ok;
        } catch (err: any) {
          responseBody = err.message;
        }

        // Log delivery
        await withSession(sql, SERVICE, (tx) =>
          tx`INSERT INTO public.webhook_deliveries ${tx({
            webhook_id: wh.id,
            tenant_id: tenant_id,
            event,
            payload,
            response_status: status || null,
            response_body: responseBody.slice(0, 500),
            success,
          } as any)}`);

        return { webhook_id: wh.id, success, status };
      })
    );

    return new Response(JSON.stringify({ delivered: results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}
