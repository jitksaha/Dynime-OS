// Phase 5 — exchange-rates-sync ported to a Worker.
// Source: supabase/functions/exchange-rates-sync/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// Also a cron target; only the HTTP handler is ported here — the cron wiring
// (scheduled() / wrangler triggers) is configured separately. No user JWT
// (cron/server-initiated) -> SERVICE context. Fetches live rates from
// frankfurter.app, caches them, updates enabled_countries, and prunes old cache.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

export async function handler(_req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    // 1. Fetch live rates from frankfurter.app (ECB data, free, no API key)
    const baseCurrency = "USD";
    const rateRes = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
    if (!rateRes.ok) {
      const text = await rateRes.text();
      throw new Error(`Rate API error: ${rateRes.status} — ${text}`);
    }
    const rateData = await rateRes.json() as any;
    const liveRates: Record<string, number> = { USD: 1, ...rateData.rates };

    console.log(`Fetched ${Object.keys(liveRates).length} exchange rates from frankfurter.app`);

    // 2. Store in exchange_rate_cache
    await withSession(sql, SERVICE, (tx) =>
      tx`INSERT INTO public.exchange_rate_cache ${tx({
        base_currency: baseCurrency,
        rates: liveRates,
        source: "frankfurter.app",
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      } as any)}`);

    // 3. Update enabled_countries exchange rates in platform_settings
    const countriesRow = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT value FROM public.platform_settings WHERE key = 'enabled_countries' LIMIT 1`;
      return rows[0] as any;
    });

    let updatedCount = 0;
    if (countriesRow?.value) {
      const countries: any[] = countriesRow.value as any;
      const updated = countries.map((c: any) => {
        const cur = c.currency?.toUpperCase();
        if (cur && liveRates[cur] !== undefined) {
          updatedCount++;
          return { ...c, exchange_rate: liveRates[cur] };
        }
        return c;
      });

      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.platform_settings SET value = ${tx.json(updated)}
           WHERE key = 'enabled_countries'`);
    }

    // 4. Clean old cache entries (keep last 48 hours)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await withSession(sql, SERVICE, (tx) =>
      tx`DELETE FROM public.exchange_rate_cache WHERE fetched_at < ${cutoff}`);

    return new Response(
      JSON.stringify({
        success: true,
        rates_count: Object.keys(liveRates).length,
        countries_updated: updatedCount,
        source: "frankfurter.app",
        base: baseCurrency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Exchange rate sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
