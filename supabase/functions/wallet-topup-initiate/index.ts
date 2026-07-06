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

    // Parse body and auth in parallel
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

    const { amount, payment_method, wallet_id, tenant_id } = bodyData;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch gateway config and profile in parallel
    const [gwConfigRes, profileRes] = await Promise.all([
      supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox, is_enabled")
        .eq("gateway_key", "sslcommerz")
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
        JSON.stringify({ error: "Payment gateway credentials not configured in admin panel" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profile = profileRes.data;
    if (!profile?.tenant_id || profile.tenant_id !== tenant_id) {
      return new Response(JSON.stringify({ error: "Unauthorized tenant" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tranId = `TOPUP_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const sslBaseUrl = gwConfig.is_sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    const siteUrl = req.headers.get("origin") || "https://dynime.com";
    const functionsUrl = `${SUPABASE_URL}/functions/v1`;

    const formData = new URLSearchParams({
      store_id: STORE_ID,
      store_passwd: STORE_PASS,
      total_amount: amount.toString(),
      currency: "BDT",
      tran_id: tranId,
      success_url: `${functionsUrl}/wallet-topup-callback`,
      fail_url: `${functionsUrl}/wallet-topup-callback`,
      cancel_url: `${functionsUrl}/wallet-topup-callback`,
      ipn_url: `${functionsUrl}/wallet-topup-callback`,
      cus_name: profile.full_name || "Customer",
      cus_email: user.email || "customer@example.com",
      cus_phone: "01700000000",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: "Wallet Top-Up",
      product_category: "Wallet",
      product_profile: "non-physical-goods",
      value_a: tenant_id,
      value_b: wallet_id,
      value_c: amount.toString(),
      value_d: siteUrl,
    });

    // Fire SSLCommerz API and DB insert in parallel
    const [sslResponse] = await Promise.all([
      fetch(`${sslBaseUrl}/gwprocess/v4/api.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      }),
      supabase.from("company_wallet_transactions").insert({
        wallet_id,
        tenant_id,
        transaction_type: "credit",
        amount,
        description: `Wallet top-up via ${payment_method} (pending)`,
        payment_method,
        status: "pending",
        reference_id: tranId,
      }),
    ]);

    const contentType = sslResponse.headers.get("content-type") || "";
    let result;
    if (contentType.includes("application/json")) {
      result = await sslResponse.json();
    } else {
      const text = await sslResponse.text();
      try { result = JSON.parse(text); } catch {
        return new Response(
          JSON.stringify({ error: "Payment gateway returned an invalid response" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (result.status === "SUCCESS" && result.GatewayPageURL) {
      return new Response(
        JSON.stringify({ url: result.GatewayPageURL, transaction_id: tranId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await supabase.from("company_wallet_transactions")
        .delete()
        .eq("reference_id", tranId)
        .eq("status", "pending");

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
