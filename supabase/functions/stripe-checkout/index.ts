import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

    // Parallel: parse body + authenticate + fetch gateway config
    const [bodyData, authResult, gwConfigRes] = await Promise.all([
      req.json(),
      anonClient.auth.getUser(authHeader.replace("Bearer ", "")),
      supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox, is_enabled")
        .eq("gateway_key", "stripe")
        .single(),
    ]);

    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gwConfig = gwConfigRes.data;
    if (!gwConfig || !gwConfig.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Stripe gateway is not enabled. Contact Super Admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawCreds = gwConfig.credentials as Record<string, any>;
    const creds: Record<string, string> = (rawCreds.sandbox || rawCreds.live)
      ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;
    const STRIPE_SECRET = creds.secret_key;

    if (!STRIPE_SECRET) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key not configured in admin panel" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, currency, product_name, description, success_url, cancel_url } = bodyData;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile (needed for metadata)
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("user_id", user.id)
      .single();

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": currency || "usd",
        "line_items[0][price_data][product_data][name]": product_name || "Payment",
        "line_items[0][price_data][product_data][description]": description || "",
        "line_items[0][price_data][unit_amount]": Math.round(amount * 100).toString(),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: success_url || `${req.headers.get("origin") || "https://dynime.com"}/dashboard?payment=success`,
        cancel_url: cancel_url || `${req.headers.get("origin") || "https://dynime.com"}/dashboard?payment=cancelled`,
        "metadata[user_id]": user.id,
        "metadata[tenant_id]": profile?.tenant_id || "",
        customer_email: user.email || "",
      }),
    });

    const session = await stripeRes.json();

    if (session.error) {
      console.error("Stripe error:", JSON.stringify(session.error));
      return new Response(
        JSON.stringify({ error: session.error.message || "Failed to create Stripe checkout session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
