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

    // Parallel: parse body + authenticate
    const [bodyData, authResult] = await Promise.all([
      req.json(),
      anonClient.auth.getUser(authHeader.replace("Bearer ", "")),
    ]);

    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { addon_id, payment_type, billing_cycle } = bodyData;

    // Parallel: fetch gateway config + addon + profile
    const [gwConfigRes, addonRes, profileRes] = await Promise.all([
      supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox, is_enabled")
        .eq("gateway_key", "sslcommerz")
        .single(),
      supabase
        .from("module_addons")
        .select("*")
        .eq("id", addon_id)
        .eq("is_active", true)
        .single(),
      supabase
        .from("profiles")
        .select("tenant_id, full_name")
        .eq("user_id", user.id)
        .single(),
    ]);

    const gwConfig = gwConfigRes.data;
    if (!gwConfig || !gwConfig.is_enabled) {
      return new Response(
        JSON.stringify({ error: "SSLCommerz gateway is not enabled. Contact Super Admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gwCreds = gwConfig.credentials as Record<string, string>;
    const STORE_ID = gwCreds.store_id;
    const STORE_PASS = gwCreds.store_password;
    if (!STORE_ID || !STORE_PASS) {
      return new Response(
        JSON.stringify({ error: "SSLCommerz credentials not configured in admin panel" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const addon = addonRes.data;
    if (addonRes.error || !addon) {
      return new Response(JSON.stringify({ error: "Add-on not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = profileRes.data;
    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parallel: check active sub + check duplicate addon
    const [activeSubRes, existingRes] = await Promise.all([
      supabase
        .from("tenant_subscriptions")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tenant_addon_modules")
        .select("id, status")
        .eq("tenant_id", profile.tenant_id)
        .eq("module_name", addon.module_name)
        .in("status", ["active", "pending"])
        .maybeSingle(),
    ]);

    if (!activeSubRes.data) {
      return new Response(JSON.stringify({ error: "An active subscription is required to purchase add-ons" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingRes.data) {
      return new Response(JSON.stringify({ error: "You already have this module" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let amount: number;
    if (payment_type === "onetime") {
      amount = addon.price_onetime;
    } else {
      switch (billing_cycle) {
        case "quarterly": amount = addon.price_quarterly; break;
        case "yearly": amount = addon.price_yearly; break;
        default: amount = addon.price_monthly;
      }
    }

    const tranId = `ADDON_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const sslBaseUrl = gwConfig.is_sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    const siteUrl = req.headers.get("origin") || "https://dynime.com";
    const functionsUrl = `${SUPABASE_URL}/functions/v1`;

    const formData = new URLSearchParams({
      store_id: STORE_ID, store_passwd: STORE_PASS,
      total_amount: amount.toString(), currency: "BDT", tran_id: tranId,
      success_url: `${functionsUrl}/addon-payment-callback`,
      fail_url: `${functionsUrl}/addon-payment-callback`,
      cancel_url: `${functionsUrl}/addon-payment-callback`,
      ipn_url: `${functionsUrl}/addon-payment-callback`,
      cus_name: profile.full_name || "Customer",
      cus_email: user.email || "customer@example.com",
      cus_phone: "01700000000", cus_add1: "Dhaka", cus_city: "Dhaka", cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: `${addon.display_name} Module Add-on`,
      product_category: "SaaS Module Add-on",
      product_profile: "non-physical-goods",
      value_a: profile.tenant_id, value_b: addon.module_name,
      value_c: payment_type, value_d: siteUrl,
    });

    // Fire SSLCommerz API call
    const response = await fetch(`${sslBaseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const contentType = response.headers.get("content-type") || "";
    let result;
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      try { result = JSON.parse(text); } catch {
        console.error("SSLCommerz returned non-JSON:", text.substring(0, 500));
        return new Response(
          JSON.stringify({ error: "Payment gateway returned an invalid response" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (result.status === "SUCCESS" && result.GatewayPageURL) {
      await supabase.from("tenant_addon_modules").insert({
        tenant_id: profile.tenant_id, module_name: addon.module_name,
        payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
        amount, status: "pending", transaction_id: tranId,
      });

      return new Response(
        JSON.stringify({ url: result.GatewayPageURL }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("SSLCommerz session failed:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: result.failedreason || "Failed to create payment session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
