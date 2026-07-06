import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Exchange Rates Sync — fetches live rates from frankfurter.app (free, no key needed)
 * and updates:
 *   1. exchange_rate_cache table (for real-time lookups)
 *   2. enabled_countries in platform_settings (for checkout conversions)
 *
 * Can be called manually or via cron.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Fetch live rates from frankfurter.app (ECB data, free, no API key)
    const baseCurrency = "USD";
    const rateRes = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
    if (!rateRes.ok) {
      const text = await rateRes.text();
      throw new Error(`Rate API error: ${rateRes.status} — ${text}`);
    }
    const rateData = await rateRes.json();
    const liveRates: Record<string, number> = { USD: 1, ...rateData.rates };

    console.log(`Fetched ${Object.keys(liveRates).length} exchange rates from frankfurter.app`);

    // 2. Store in exchange_rate_cache
    await supabase.from("exchange_rate_cache").insert({
      base_currency: baseCurrency,
      rates: liveRates,
      source: "frankfurter.app",
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    });

    // 3. Update enabled_countries exchange rates in platform_settings
    const { data: countriesRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "enabled_countries")
      .maybeSingle();

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

      await supabase
        .from("platform_settings")
        .update({ value: updated })
        .eq("key", "enabled_countries");
    }

    // 4. Clean old cache entries (keep last 48 hours)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await supabase.from("exchange_rate_cache").delete().lt("fetched_at", cutoff);

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
});
