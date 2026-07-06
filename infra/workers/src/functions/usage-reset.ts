// Phase 5 — usage-reset ported to a Worker.
// Source: supabase/functions/usage-reset/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// Also a cron target; only the HTTP handler is ported here — the cron wiring
// (scheduled() / wrangler triggers) is configured separately. No user JWT
// (cron/server-initiated) -> SERVICE context. Calls the bulk reset DB function.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

export async function handler(_req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    // Call the bulk reset function (Supabase .rpc -> SELECT FROM the function).
    const rows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT public.reset_all_expired_usage_counters() AS result`);
    const data = (rows[0] as any)?.result;

    return new Response(
      JSON.stringify({ success: true, counters_reset: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Usage reset error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
