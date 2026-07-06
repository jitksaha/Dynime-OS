import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event, tenant_id, payload } = await req.json();
    if (!event || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing event or tenant_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find active webhooks for this tenant and event
    const { data: webhooks } = await supabase
      .from("webhook_configs")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .contains("events", [event]);

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
        await supabase.from("webhook_deliveries").insert({
          webhook_id: wh.id,
          tenant_id: tenant_id,
          event,
          payload,
          response_status: status || null,
          response_body: responseBody.slice(0, 500),
          success,
        });

        return { webhook_id: wh.id, success, status };
      })
    );

    return new Response(JSON.stringify({ delivered: results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
