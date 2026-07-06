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
    const [body, authResult, gwConfigRes] = await Promise.all([
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
        JSON.stringify({ error: "Stripe gateway is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawCreds = gwConfig.credentials as Record<string, any>;
    const creds: Record<string, string> = (rawCreds.sandbox || rawCreds.live)
      ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;
    const secretKey = creds.secret_key;
    const publishableKey = creds.publishable_key;

    if (!secretKey || !publishableKey) {
      return new Response(
        JSON.stringify({ error: "Stripe keys not configured in admin panel" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { purpose, plan_id, billing_cycle, addon_id, payment_type, amount: walletAmount, wallet_id, action, saved_method_id, checkout_currency } = body;

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SETUP INTENT (save card for future use) =====
    if (action === "setup_intent") {
      // Create or get Stripe Customer
      let customerId = "";

      // Check if we already have a Stripe customer for this user
      const { data: existingMethods } = await supabase
        .from("saved_payment_methods")
        .select("metadata")
        .eq("user_id", user.id)
        .eq("gateway_key", "stripe")
        .eq("is_active", true)
        .limit(1);

      if (existingMethods?.[0]?.metadata?.stripe_customer_id) {
        customerId = existingMethods[0].metadata.stripe_customer_id;
      } else {
        // Create Stripe customer
        const custParams = new URLSearchParams({
          email: user.email || "",
          name: profile.full_name || "",
          "metadata[user_id]": user.id,
          "metadata[tenant_id]": profile.tenant_id,
        });

        const custRes = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: custParams,
        });
        const custData = await custRes.json();
        if (custData.error) {
          return new Response(JSON.stringify({ error: custData.error.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        customerId = custData.id;
      }

      // Create SetupIntent
      const siParams = new URLSearchParams({
        customer: customerId,
        "payment_method_types[0]": "card",
        usage: "off_session",
        "metadata[user_id]": user.id,
        "metadata[tenant_id]": profile.tenant_id,
      });

      const siRes = await fetch("https://api.stripe.com/v1/setup_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: siParams,
      });
      const siData = await siRes.json();

      if (siData.error) {
        return new Response(JSON.stringify({ error: siData.error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        client_secret: siData.client_secret,
        publishable_key: publishableKey,
        setup_intent_id: siData.id,
        customer_id: customerId,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== CONFIRM SETUP (after card is saved on frontend) =====
    if (action === "confirm_setup") {
      const { setup_intent_id, customer_id } = body;

      // Retrieve the SetupIntent to get payment method details
      const siRes = await fetch(`https://api.stripe.com/v1/setup_intents/${setup_intent_id}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const siData = await siRes.json();

      if (siData.status !== "succeeded") {
        return new Response(JSON.stringify({ error: "Setup not completed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get payment method details
      const pmId = siData.payment_method;
      const pmRes = await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const pmData = await pmRes.json();

      const card = pmData.card || {};
      const brand = card.brand || "card";
      const last4 = card.last4 || "****";

      // Check if this is the first method (make it default)
      const { count } = await supabase
        .from("saved_payment_methods")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      await supabase.from("saved_payment_methods").insert({
        user_id: user.id,
        tenant_id: profile.tenant_id,
        gateway_key: "stripe",
        display_name: "Cards",
        method_label: `${brand.charAt(0).toUpperCase() + brand.slice(1)} ****${last4}`,
        card_brand: brand,
        card_last4: last4,
        token: pmId,
        is_default: (count || 0) === 0,
        metadata: { stripe_customer_id: customer_id },
      });

      return new Response(JSON.stringify({ saved: true, brand, last4 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== PAYMENT INTENT (existing flow) =====
    let amount = 0;
    let currency = "usd";
    let description = "Payment";
    let metadata: Record<string, string> = {
      user_id: user.id,
      tenant_id: profile.tenant_id,
      purpose,
    };

    if (purpose === "subscription") {
      const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", plan_id).single();
      if (!plan) {
        return new Response(JSON.stringify({ error: "Plan not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amount = billing_cycle === "yearly" ? plan.price_yearly : billing_cycle === "quarterly" ? plan.price_quarterly : plan.price_monthly;
      currency = (plan.currency || "usd").toLowerCase();
      description = `${plan.name} Plan - ${billing_cycle}`;
      metadata.plan_id = plan_id;
      metadata.billing_cycle = billing_cycle;
    } else if (purpose === "addon") {
      const { data: addon } = await supabase.from("module_addons").select("*").eq("id", addon_id).eq("is_active", true).single();
      if (!addon) {
        return new Response(JSON.stringify({ error: "Add-on not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (payment_type === "onetime") { amount = addon.price_onetime; }
      else { amount = billing_cycle === "quarterly" ? addon.price_quarterly : billing_cycle === "yearly" ? addon.price_yearly : addon.price_monthly; }
      currency = "usd";
      description = `${addon.display_name} Module Add-on`;
      metadata.addon_id = addon_id;
      metadata.module_name = addon.module_name;
      metadata.payment_type = payment_type;
      metadata.billing_cycle = billing_cycle || "";
    } else if (purpose === "wallet_topup") {
      amount = parseFloat(walletAmount);
      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid amount" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      currency = "usd";
      description = "Wallet Top-Up";
      metadata.wallet_id = wallet_id;
    } else {
      return new Response(JSON.stringify({ error: "Invalid purpose" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply checkout currency conversion from canonical server amount (prevents stale frontend totals)
    const requestedCheckoutCurrency = typeof checkout_currency === "string"
      ? checkout_currency.toUpperCase()
      : null;

    if (requestedCheckoutCurrency && /^[A-Z]{3}$/.test(requestedCheckoutCurrency)) {
      const sourceCurrency = currency.toUpperCase();
      if (requestedCheckoutCurrency !== sourceCurrency) {
        const { data: ratesRes } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "enabled_countries")
          .maybeSingle();

        const rates: Record<string, number> = { USD: 1 };
        const countries = (ratesRes?.value as any[]) || [];
        countries.forEach((c: any) => {
          if (c?.currency && c?.exchange_rate) {
            rates[String(c.currency).toUpperCase()] = Number(c.exchange_rate);
          }
        });

        const fromRate = rates[sourceCurrency] || 1;
        const toRate = rates[requestedCheckoutCurrency] || 1;
        const converted = (amount / fromRate) * toRate;

        amount = Math.round(converted * 100) / 100;
        currency = requestedCheckoutCurrency.toLowerCase();
      }
    }

    if (amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stripe minimum amounts per currency (in major units)
    const STRIPE_MINIMUMS: Record<string, number> = {
      usd: 0.50, eur: 0.50, gbp: 0.30, bdt: 50, inr: 50,
      aud: 0.50, cad: 0.50, jpy: 50, sgd: 0.50, myr: 2,
      brl: 0.50, aed: 2, pkr: 100, ngn: 100, zar: 5,
      mxn: 10, thb: 10, php: 25, idr: 7000, nzd: 0.50,
      sek: 3, nok: 3, dkk: 2.50, chf: 0.50, pln: 2,
    };
    const minAmount = STRIPE_MINIMUMS[currency] ?? 0.50;
    if (amount < minAmount) {
      return new Response(JSON.stringify({
        error: `Minimum payment amount is ${minAmount} ${currency.toUpperCase()}. Please increase the amount.`,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SAVED CARD OFF-SESSION CHARGE =====
    if (saved_method_id) {
      // Look up saved payment method to get token (Stripe payment_method ID) and customer
      const { data: savedMethod } = await supabase
        .from("saved_payment_methods")
        .select("token, metadata")
        .eq("id", saved_method_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!savedMethod?.token) {
        return new Response(JSON.stringify({ error: "Saved payment method not found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerId = (savedMethod.metadata as any)?.stripe_customer_id;

      const offSessionParams = new URLSearchParams({
        amount: Math.round(amount * 100).toString(),
        currency, description,
        payment_method: savedMethod.token,
        confirm: "true",
        off_session: "true",
        receipt_email: user.email || "",
      });
      if (customerId) offSessionParams.append("customer", customerId);

      for (const [key, value] of Object.entries(metadata)) {
        if (value) offSessionParams.append(`metadata[${key}]`, value);
      }

      const offRes = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: offSessionParams,
      });
      const offIntent = await offRes.json();

      if (offIntent.error) {
        // If requires authentication (SCA), return client_secret for frontend 3DS
        if (offIntent.error.code === "authentication_required" && offIntent.error.payment_intent) {
          const pi = offIntent.error.payment_intent;
          // Create pending records
          const tranId = pi.id;
          if (purpose === "subscription") {
            await supabase.from("tenant_subscriptions").insert({
              tenant_id: profile.tenant_id, plan_id, billing_cycle, amount,
              status: "pending", transaction_id: tranId, payment_method: "stripe",
              current_period_start: new Date().toISOString(),
            });
          } else if (purpose === "addon") {
            const { data: addon } = await supabase.from("module_addons").select("module_name").eq("id", addon_id).single();
            await supabase.from("tenant_addon_modules").insert({
              tenant_id: profile.tenant_id, module_name: addon?.module_name || "",
              payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
              amount, status: "pending", transaction_id: tranId,
            });
          } else if (purpose === "wallet_topup") {
            await supabase.from("company_wallet_transactions").insert({
              wallet_id, tenant_id: profile.tenant_id, transaction_type: "credit", amount,
              description: "Wallet top-up via Stripe (pending)",
              payment_method: "stripe", status: "pending", reference_id: tranId,
            });
          }

          return new Response(JSON.stringify({
            client_secret: pi.client_secret,
            publishable_key: publishableKey,
            payment_intent_id: pi.id,
            amount, currency,
            requires_action: true,
          }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ error: offIntent.error.message || "Payment failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Off-session succeeded! Create records as completed
      const tranId = offIntent.id;
      if (purpose === "subscription") {
        await supabase.from("tenant_subscriptions").insert({
          tenant_id: profile.tenant_id, plan_id, billing_cycle, amount,
          status: "active", transaction_id: tranId, payment_method: "stripe",
          current_period_start: new Date().toISOString(),
        });
      } else if (purpose === "addon") {
        const { data: addon } = await supabase.from("module_addons").select("module_name").eq("id", addon_id).single();
        await supabase.from("tenant_addon_modules").insert({
          tenant_id: profile.tenant_id, module_name: addon?.module_name || "",
          payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
          amount, status: "active", transaction_id: tranId,
        });
      } else if (purpose === "wallet_topup") {
        await supabase.from("company_wallet_transactions").insert({
          wallet_id, tenant_id: profile.tenant_id, transaction_type: "credit", amount,
          description: "Wallet top-up via Stripe",
          payment_method: "stripe", status: "completed", reference_id: tranId,
        });
        // Also credit the wallet balance
        const { data: wallet } = await supabase.from("company_wallets").select("balance").eq("id", wallet_id).single();
        if (wallet) {
          await supabase.from("company_wallets").update({ balance: wallet.balance + amount }).eq("id", wallet_id);
        }
      }

      return new Response(JSON.stringify({
        off_session_success: true,
        payment_intent_id: tranId,
        amount, currency,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== REGULAR PAYMENT INTENT (new card) =====
    const params = new URLSearchParams({
      amount: Math.round(amount * 100).toString(),
      currency, description,
      "automatic_payment_methods[enabled]": "true",
      receipt_email: user.email || "",
    });

    for (const [key, value] of Object.entries(metadata)) {
      if (value) params.append(`metadata[${key}]`, value);
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const intent = await stripeRes.json();

    if (intent.error) {
      console.error("Stripe error:", JSON.stringify(intent.error));
      return new Response(
        JSON.stringify({ error: intent.error.message || "Failed to create payment intent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tranId = intent.id;

    if (purpose === "subscription") {
      await supabase.from("tenant_subscriptions").insert({
        tenant_id: profile.tenant_id, plan_id, billing_cycle, amount,
        status: "pending", transaction_id: tranId, payment_method: "stripe",
        current_period_start: new Date().toISOString(),
      });
    } else if (purpose === "addon") {
      const { data: addon } = await supabase.from("module_addons").select("module_name").eq("id", addon_id).single();
      await supabase.from("tenant_addon_modules").insert({
        tenant_id: profile.tenant_id, module_name: addon?.module_name || "",
        payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
        amount, status: "pending", transaction_id: tranId,
      });
    } else if (purpose === "wallet_topup") {
      await supabase.from("company_wallet_transactions").insert({
        wallet_id, tenant_id: profile.tenant_id, transaction_type: "credit", amount,
        description: "Wallet top-up via Stripe (pending)",
        payment_method: "stripe", status: "pending", reference_id: tranId,
      });
    }

    return new Response(
      JSON.stringify({
        client_secret: intent.client_secret, publishable_key: publishableKey,
        payment_intent_id: intent.id, amount, currency,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
