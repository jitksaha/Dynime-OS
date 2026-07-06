import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_GATEWAY_CURRENCIES: Record<string, string | null> = {
  bkash: "BDT",
  sslcommerz: "BDT",
  stripe: null,
  paypal: "USD",
  paddle: "USD",
  dodo: "USD",
  
  razorpay: "INR",
  twocheckout: "USD",
};

async function convertForGateway(
  supabase: any,
  planAmount: number,
  planCurrency: string,
  gateway: string,
  processingCurrency?: string | null,
): Promise<{ amount: number; currency: string }> {
  const gwCurrency = processingCurrency !== undefined ? processingCurrency : (FALLBACK_GATEWAY_CURRENCIES[gateway] ?? null);
  const targetCurrency = gwCurrency || planCurrency;

  if (targetCurrency.toUpperCase() === planCurrency.toUpperCase()) {
    return { amount: planAmount, currency: planCurrency };
  }

  // Try fresh rates from exchange_rate_cache first
  const rates: Record<string, number> = { USD: 1 };
  let gotCacheRates = false;

  const { data: cacheRow } = await supabase
    .from("exchange_rate_cache")
    .select("rates")
    .eq("base_currency", "USD")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cacheRow?.rates) {
    const cached = cacheRow.rates as Record<string, number>;
    Object.entries(cached).forEach(([k, v]) => { rates[k.toUpperCase()] = Number(v); });
    gotCacheRates = Object.keys(cached).length > 5;
  }

  // Fallback: enabled_countries rates (always merge so we cover more currencies)
  const { data: countriesRow } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "enabled_countries")
    .maybeSingle();

  if (countriesRow?.value) {
    (countriesRow.value as any[]).forEach((c: any) => {
      if (c.currency && c.exchange_rate) {
        const key = c.currency.toUpperCase();
        // Only fill if not already from cache (cache is fresher)
        if (!gotCacheRates || !rates[key]) {
          rates[key] = Number(c.exchange_rate);
        }
      }
    });
  }

  const fromRate = rates[planCurrency.toUpperCase()] || 1;
  const toRate = rates[targetCurrency.toUpperCase()] || 1;
  const converted = (planAmount / fromRate) * toRate;

  return { amount: Math.round(converted * 100) / 100, currency: targetCurrency };
}

// Gateway health logging helper
async function logGatewayHealth(
  supabase: any,
  gatewayKey: string,
  eventType: string,
  status: string,
  startTime: number,
  opts?: { errorMessage?: string; transactionId?: string; amount?: number; currency?: string; tenantId?: string; metadata?: any },
) {
  try {
    await supabase.from("gateway_health_logs").insert({
      gateway_key: gatewayKey,
      event_type: eventType,
      status,
      response_time_ms: Date.now() - startTime,
      error_message: opts?.errorMessage || null,
      transaction_id: opts?.transactionId || null,
      amount: opts?.amount || null,
      currency: opts?.currency || null,
      tenant_id: opts?.tenantId || null,
      metadata: opts?.metadata || null,
    });
  } catch (e) {
    console.error("Failed to log gateway health:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

    const [body, authResult] = await Promise.all([
      req.json(),
      anonClient.auth.getUser(authHeader.replace("Bearer ", "")),
    ]);

    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return jsonResp({ error: "Invalid auth token" }, 401);
    }

    const { gateway, purpose } = body;
    if (!gateway || !purpose) {
      return jsonResp({ error: "gateway and purpose are required" }, 400);
    }

    const [gwConfigRes, profileRes] = await Promise.all([
      supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox, is_enabled, processing_currency")
        .eq("gateway_key", gateway)
        .single(),
      supabase
        .from("profiles")
        .select("tenant_id, full_name")
        .eq("user_id", user.id)
        .single(),
    ]);

    const gwConfig = gwConfigRes.data;
    if (!gwConfig || !gwConfig.is_enabled) {
      return jsonResp({ error: `${gateway} gateway is not enabled` }, 400);
    }

    const rawCreds = gwConfig.credentials as Record<string, any>;
    const creds: Record<string, string> = (rawCreds.sandbox || rawCreds.live)
      ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;

    const profile = profileRes.data;
    if (!profile?.tenant_id) {
      return jsonResp({ error: "No tenant found" }, 400);
    }

    const siteUrl = req.headers.get("origin") || "https://dynime.com";
    const functionsUrl = `${SUPABASE_URL}/functions/v1`;

    // ===== Check for saved_method_id — use saved token flow =====
    if (body.saved_method_id) {
      const { data: savedMethod } = await supabase
        .from("saved_payment_methods")
        .select("*")
        .eq("id", body.saved_method_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!savedMethod) {
        return jsonResp({ error: "Saved payment method not found or inactive" }, 404);
      }

      // bKash agreement-based payment — redirect flow (user must authorize with PIN)
      if (savedMethod.gateway_key === "bkash" && savedMethod.agreement_id) {
        const bkashCreds = (rawCreds.sandbox || rawCreds.live)
          ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
          : rawCreds;
        const bkashBase = gwConfig.is_sandbox
          ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout"
          : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout";

        let chargeAmount = body.checkout_amount || body.amount || 0;
        let chargeCurrency = body.checkout_currency || "BDT";

        if (!chargeAmount || chargeAmount <= 0) {
          return jsonResp({ error: "Invalid amount for payment" }, 400);
        }

        const tokenRes = await fetch(`${bkashBase}/token/grant`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", username: bkashCreds.username, password: bkashCreds.password },
          body: JSON.stringify({ app_key: bkashCreds.app_key, app_secret: bkashCreds.app_secret }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.id_token) {
          return jsonResp({ error: "bKash authentication failed" }, 502);
        }

        const tranId = `SAVED_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

        const callbackMeta = new URLSearchParams({
          action: "payment_callback",
          user_id: user.id,
          tenant_id: profile.tenant_id,
          purpose: body.purpose,
          tran_id: tranId,
          redirect: siteUrl + (body.purpose === "wallet_topup" ? "/wallet" : "/subscription"),
        });
        if (body.plan_id) callbackMeta.set("plan_id", body.plan_id);
        if (body.billing_cycle) callbackMeta.set("billing_cycle", body.billing_cycle);
        if (body.addon_id) callbackMeta.set("addon_id", body.addon_id);
        if (body.payment_type) callbackMeta.set("payment_type", body.payment_type);
        if (body.wallet_id) callbackMeta.set("wallet_id", body.wallet_id);
        if (body.amount) callbackMeta.set("raw_amount", String(body.amount));

        const callbackUrl = `${SUPABASE_URL}/functions/v1/bkash-tokenize?${callbackMeta.toString()}`;

        const createRes = await fetch(`${bkashBase}/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json", Accept: "application/json",
            Authorization: tokenData.id_token, "X-APP-Key": bkashCreds.app_key,
          },
          body: JSON.stringify({
            mode: "0001",
            payerReference: savedMethod.phone_last4 ? `****${savedMethod.phone_last4}` : " ",
            callbackURL: callbackUrl,
            agreementID: savedMethod.agreement_id,
            amount: String(chargeAmount),
            currency: chargeCurrency.toUpperCase(),
            intent: "sale",
            merchantInvoiceNumber: tranId,
          }),
        });
        const createData = await createRes.json();

        if (createData.bkashURL) {
          if (body.purpose === "subscription" && body.plan_id) {
            await supabase.from("tenant_subscriptions").insert({
              tenant_id: profile.tenant_id, plan_id: body.plan_id, billing_cycle: body.billing_cycle,
              amount: chargeAmount, status: "pending", transaction_id: tranId,
              payment_method: "bkash", current_period_start: new Date().toISOString(),
            });
          }
          return jsonResp({ url: createData.bkashURL, paymentID: createData.paymentID });
        }

        console.error("bKash create with agreement failed:", createData);
        return jsonResp({ error: createData.statusMessage || "bKash payment creation failed" }, 400);
      }

      // For Stripe saved methods — use off-session charge
      if (savedMethod.gateway_key === "stripe" && savedMethod.token) {
        const secretKey = creds.secret_key;
        if (!secretKey) return jsonResp({ error: "Stripe secret key not configured" }, 500);

        const customerId = (savedMethod.metadata as any)?.stripe_customer_id;
        if (!customerId) return jsonResp({ error: "No Stripe customer linked to saved method" }, 400);

        let chargeAmount = body.checkout_amount || body.amount || 0;
        let chargeCurrency = (body.checkout_currency || body.currency || "usd").toLowerCase();

        const piRes = await fetch("https://api.stripe.com/v1/payment_intents", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            amount: String(Math.round(chargeAmount * 100)),
            currency: chargeCurrency,
            customer: customerId,
            payment_method: savedMethod.token,
            confirm: "true",
            off_session: "true",
            "metadata[user_id]": user.id,
            "metadata[tenant_id]": profile.tenant_id,
            "metadata[purpose]": body.purpose,
          }),
        });
        const piData = await piRes.json();

        if (piData.status === "succeeded") {
          return jsonResp({ status: "paid", transaction_id: piData.id });
        }
        return jsonResp({ error: piData.error?.message || "Stripe off-session charge failed" }, 400);
      }

      console.log(`Using saved method: ${savedMethod.method_label} (${savedMethod.gateway_key})`);
    }

    // ===== SUBSCRIPTION PAYMENT =====
    if (purpose === "subscription") {
      const { plan_id, billing_cycle } = body;
      const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", plan_id).single();
      if (!plan) return jsonResp({ error: "Plan not found" }, 404);

      const rawAmount = billing_cycle === "yearly" ? plan.price_yearly
        : billing_cycle === "quarterly" ? plan.price_quarterly
        : billing_cycle === "lifetime" ? (plan.price_lifetime || plan.price_yearly)
        : plan.price_monthly;
      const planCurrency = (plan.currency || "USD").toUpperCase();

      const { amount, currency: chargeCurrency } = await convertForGateway(supabase, rawAmount, planCurrency, gateway, gwConfig.processing_currency);
      const tranId = `TXN_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      if (gateway === "sslcommerz") {
        return await handleSSLCommerz(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          callbackUrl: `${functionsUrl}/sslcommerz-callback`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          productName: `${plan.name} Plan - ${billing_cycle}`,
          productCategory: "SaaS Subscription",
          valueA: profile.tenant_id, valueB: plan_id, valueC: billing_cycle, valueD: siteUrl,
        }, async () => {
          await supabase.from("tenant_subscriptions").insert({
            tenant_id: profile.tenant_id, plan_id, billing_cycle, amount: rawAmount,
            status: "pending", transaction_id: tranId, payment_method: "sslcommerz",
            current_period_start: new Date().toISOString(),
          });
        });
      } else if (gateway === "stripe") {
        // Use Stripe Subscription mode for recurring, one-time for lifetime
        if (billing_cycle === "lifetime") {
          return await handleStripeOneTime(creds, gwConfig.is_sandbox, {
            amount, currency: chargeCurrency,
            productName: `${plan.name} Plan - Lifetime`,
            successUrl: `${siteUrl}/subscription?payment=success`,
            cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
            userId: user.id, tenantId: profile.tenant_id, email: user.email || "",
            metadata: { plan_id, billing_cycle, purpose: "subscription" },
          }, async (sessionId: string) => {
            await supabase.from("tenant_subscriptions").insert({
              tenant_id: profile.tenant_id, plan_id, billing_cycle, amount: rawAmount,
              status: "pending", transaction_id: sessionId, payment_method: "stripe",
              current_period_start: new Date().toISOString(),
            });
          });
        }
        // Recurring subscription via Stripe
        return await handleStripeSubscription(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, billingCycle: billing_cycle,
          productName: `${plan.name} Plan`,
          successUrl: `${siteUrl}/subscription?payment=success`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          userId: user.id, tenantId: profile.tenant_id, email: user.email || "",
          metadata: { plan_id, billing_cycle, purpose: "subscription" },
        }, async (sessionId: string) => {
          await supabase.from("tenant_subscriptions").insert({
            tenant_id: profile.tenant_id, plan_id, billing_cycle, amount: rawAmount,
            status: "pending", transaction_id: sessionId, payment_method: "stripe",
            current_period_start: new Date().toISOString(),
          });
        });
      } else if (gateway === "bkash") {
        const bkashCallbackMeta = new URLSearchParams({
          action: "payment_callback",
          user_id: user.id,
          tenant_id: profile.tenant_id,
          purpose: "subscription",
          tran_id: tranId,
          plan_id: plan_id,
          billing_cycle: billing_cycle,
          redirect: `${siteUrl}/subscription`,
        });
        const bkashCallbackUrl = `${functionsUrl}/bkash-tokenize?${bkashCallbackMeta.toString()}`;
        return await handleBkash(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          callbackUrl: bkashCallbackUrl,
          payerReference: user.email || profile.full_name || "customer",
          valueA: profile.tenant_id, valueB: plan_id, valueC: billing_cycle, valueD: siteUrl,
        }, async () => {
          await supabase.from("tenant_subscriptions").insert({
            tenant_id: profile.tenant_id, plan_id, billing_cycle, amount: rawAmount,
            status: "pending", transaction_id: tranId, payment_method: "bkash",
            current_period_start: new Date().toISOString(),
          });
        });
      } else if (gateway === "dodo") {
        return await handleDodo(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: `${plan.name} Plan - ${billing_cycle}`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/subscription?payment=success`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          userId: user.id, tenantId: profile.tenant_id,
          metadata: { plan_id, billing_cycle, purpose: "subscription" },
        }, async (paymentId: string) => {
          await supabase.from("tenant_subscriptions").insert({
            tenant_id: profile.tenant_id, plan_id, billing_cycle, amount: rawAmount,
            status: "pending", transaction_id: paymentId, payment_method: "dodo",
            current_period_start: new Date().toISOString(),
          });
        });
      }
      else if (gateway === "razorpay") {
        return await handleRazorpay(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: `${plan.name} Plan - ${billing_cycle}`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/subscription?payment=success`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          callbackUrl: `${functionsUrl}/razorpay-payment-callback`,
          userId: user.id, tenantId: profile.tenant_id,
          metadata: { plan_id, billing_cycle, purpose: "subscription" },
        }, async (orderId: string) => {
          await supabase.from("tenant_subscriptions").insert({
            tenant_id: profile.tenant_id, plan_id, billing_cycle, amount: rawAmount,
            status: "pending", transaction_id: orderId, payment_method: "razorpay",
            current_period_start: new Date().toISOString(),
          });
        });
      } else if (gateway === "twocheckout") {
        return await handle2Checkout(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: `${plan.name} Plan - ${billing_cycle}`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/subscription?payment=success`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          callbackUrl: `${functionsUrl}/twocheckout-payment-callback`,
          userId: user.id, tenantId: profile.tenant_id,
          metadata: { plan_id, billing_cycle, purpose: "subscription" },
        }, async (refNo: string) => {
          await supabase.from("tenant_subscriptions").insert({
            tenant_id: profile.tenant_id, plan_id, billing_cycle, amount: rawAmount,
            status: "pending", transaction_id: refNo, payment_method: "twocheckout",
            current_period_start: new Date().toISOString(),
          });
        });
      }
      return jsonResp({ error: `Gateway '${gateway}' is not supported for subscriptions` }, 400);
    }

    // ===== ADDON PAYMENT =====
    if (purpose === "addon") {
      const { addon_id, payment_type, billing_cycle } = body;

      const [addonRes, activeSubRes] = await Promise.all([
        supabase.from("module_addons").select("*").eq("id", addon_id).eq("is_active", true).single(),
        supabase.from("tenant_subscriptions").select("id").eq("tenant_id", profile.tenant_id).eq("status", "active").limit(1).maybeSingle(),
      ]);

      const addon = addonRes.data;
      if (!addon) return jsonResp({ error: "Add-on not found" }, 404);
      if (!activeSubRes.data) return jsonResp({ error: "An active subscription is required" }, 400);

      const { data: existing } = await supabase.from("tenant_addon_modules").select("id").eq("tenant_id", profile.tenant_id).eq("module_name", addon.module_name).in("status", ["active", "pending"]).maybeSingle();
      if (existing) return jsonResp({ error: "You already have this module" }, 400);

      let rawAmount: number;
      if (payment_type === "onetime") { rawAmount = addon.price_onetime; }
      else { rawAmount = billing_cycle === "quarterly" ? addon.price_quarterly : billing_cycle === "yearly" ? addon.price_yearly : addon.price_monthly; }

      const { amount, currency: chargeCurrency } = await convertForGateway(supabase, rawAmount, "USD", gateway, gwConfig.processing_currency);
      const tranId = `ADDON_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const onSuccess = async () => {
        await supabase.from("tenant_addon_modules").insert({
          tenant_id: profile.tenant_id, module_name: addon.module_name,
          payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
          amount: rawAmount, status: "pending", transaction_id: tranId,
        });
      };

      if (gateway === "sslcommerz") {
        return await handleSSLCommerz(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          callbackUrl: `${functionsUrl}/addon-payment-callback`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          productName: `${addon.display_name} Module Add-on`,
          productCategory: "SaaS Module Add-on",
          valueA: profile.tenant_id, valueB: addon.module_name, valueC: payment_type, valueD: siteUrl,
        }, onSuccess);
      } else if (gateway === "stripe") {
        return await handleStripeOneTime(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency,
          productName: `${addon.display_name} Module Add-on`,
          successUrl: `${siteUrl}/subscription?payment=success&addon=${addon.module_name}`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          userId: user.id, tenantId: profile.tenant_id, email: user.email || "",
          metadata: { addon_id, payment_type, billing_cycle: billing_cycle || "monthly", purpose: "addon", module_name: addon.module_name },
        }, async (sessionId: string) => {
          await supabase.from("tenant_addon_modules").insert({
            tenant_id: profile.tenant_id, module_name: addon.module_name,
            payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
            amount: rawAmount, status: "pending", transaction_id: sessionId,
          });
        });
      } else if (gateway === "bkash") {
        const bkashAddonMeta = new URLSearchParams({
          action: "payment_callback",
          user_id: user.id,
          tenant_id: profile.tenant_id,
          purpose: "addon",
          tran_id: tranId,
          addon_id: addon_id,
          payment_type: payment_type,
          billing_cycle: billing_cycle || "monthly",
          redirect: `${siteUrl}/subscription`,
        });
        const bkashAddonCallbackUrl = `${functionsUrl}/bkash-tokenize?${bkashAddonMeta.toString()}`;
        return await handleBkash(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          callbackUrl: bkashAddonCallbackUrl,
          payerReference: user.email || "customer",
          valueA: profile.tenant_id, valueB: addon.module_name, valueC: payment_type, valueD: siteUrl,
        }, onSuccess);
      } else if (gateway === "dodo") {
        return await handleDodo(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: `${addon.display_name} Module Add-on`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/subscription?payment=success&addon=${addon.module_name}`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          userId: user.id, tenantId: profile.tenant_id,
          metadata: { addon_id, payment_type, purpose: "addon", module_name: addon.module_name },
        }, async (paymentId: string) => {
          await supabase.from("tenant_addon_modules").insert({
            tenant_id: profile.tenant_id, module_name: addon.module_name,
            payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
            amount: rawAmount, status: "pending", transaction_id: paymentId,
          });
        });
      } else if (gateway === "razorpay") {
        return await handleRazorpay(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: `${addon.display_name} Module Add-on`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/subscription?payment=success&addon=${addon.module_name}`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          callbackUrl: `${functionsUrl}/razorpay-payment-callback`,
          userId: user.id, tenantId: profile.tenant_id,
          metadata: { addon_id, payment_type, purpose: "addon", module_name: addon.module_name },
        }, async (orderId: string) => {
          await supabase.from("tenant_addon_modules").insert({
            tenant_id: profile.tenant_id, module_name: addon.module_name,
            payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
            amount: rawAmount, status: "pending", transaction_id: orderId,
          });
        });
      } else if (gateway === "twocheckout") {
        return await handle2Checkout(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: `${addon.display_name} Module Add-on`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/subscription?payment=success&addon=${addon.module_name}`,
          cancelUrl: `${siteUrl}/subscription?payment=cancelled`,
          callbackUrl: `${functionsUrl}/twocheckout-payment-callback`,
          userId: user.id, tenantId: profile.tenant_id,
          metadata: { addon_id, payment_type, purpose: "addon", module_name: addon.module_name },
        }, async (refNo: string) => {
          await supabase.from("tenant_addon_modules").insert({
            tenant_id: profile.tenant_id, module_name: addon.module_name,
            payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
            amount: rawAmount, status: "pending", transaction_id: refNo,
          });
        });
      }
      return jsonResp({ error: `Gateway '${gateway}' is not supported for add-ons` }, 400);
    }

    // ===== WALLET TOP-UP =====
    if (purpose === "wallet_topup") {
      const { amount: rawAmount, wallet_id, tenant_id } = body;
      const parsedAmount = parseFloat(rawAmount);
      if (!parsedAmount || parsedAmount <= 0) return jsonResp({ error: "Invalid amount" }, 400);
      if (profile.tenant_id !== tenant_id) return jsonResp({ error: "Unauthorized tenant" }, 403);

      const { amount, currency: chargeCurrency } = await convertForGateway(supabase, parsedAmount, "USD", gateway, gwConfig.processing_currency);
      const tranId = `TOPUP_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const onSuccess = async () => {
        await supabase.from("company_wallet_transactions").insert({
          wallet_id, tenant_id, transaction_type: "credit", amount: parsedAmount,
          description: `Wallet top-up via ${gateway} (pending)`,
          payment_method: gateway, status: "pending", reference_id: tranId,
        });
      };

      if (gateway === "sslcommerz") {
        return await handleSSLCommerz(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          callbackUrl: `${functionsUrl}/wallet-topup-callback`,
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          productName: "Wallet Top-Up",
          productCategory: "Wallet",
          valueA: tenant_id, valueB: wallet_id, valueC: parsedAmount.toString(), valueD: siteUrl,
        }, onSuccess);
      } else if (gateway === "stripe") {
        return await handleStripeOneTime(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency,
          productName: "Wallet Top-Up",
          successUrl: `${siteUrl}/wallet?topup=success&amount=${parsedAmount}`,
          cancelUrl: `${siteUrl}/wallet?topup=cancelled`,
          userId: user.id, tenantId: tenant_id, email: user.email || "",
          metadata: { wallet_id, purpose: "wallet_topup", raw_amount: parsedAmount.toString() },
        }, async (sessionId: string) => {
          await supabase.from("company_wallet_transactions").insert({
            wallet_id, tenant_id, transaction_type: "credit", amount: parsedAmount,
            description: `Wallet top-up via stripe (pending)`,
            payment_method: "stripe", status: "pending", reference_id: sessionId,
          });
        });
      } else if (gateway === "bkash") {
        const bkashWalletMeta = new URLSearchParams({
          action: "payment_callback",
          user_id: user.id,
          tenant_id: profile.tenant_id,
          purpose: "wallet_topup",
          tran_id: tranId,
          wallet_id: wallet_id,
          raw_amount: parsedAmount.toString(),
          redirect: `${siteUrl}/wallet`,
        });
        const bkashWalletCallbackUrl = `${functionsUrl}/bkash-tokenize?${bkashWalletMeta.toString()}`;
        return await handleBkash(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          callbackUrl: bkashWalletCallbackUrl,
          payerReference: user.email || "customer",
          valueA: tenant_id, valueB: wallet_id, valueC: parsedAmount.toString(), valueD: siteUrl,
        }, onSuccess);
      } else if (gateway === "dodo") {
        return await handleDodo(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: "Wallet Top-Up",
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/wallet?topup=success&amount=${parsedAmount}`,
          cancelUrl: `${siteUrl}/wallet?topup=cancelled`,
          userId: user.id, tenantId: tenant_id,
          metadata: { wallet_id, purpose: "wallet_topup", raw_amount: parsedAmount.toString() },
        }, async (paymentId: string) => {
          await supabase.from("company_wallet_transactions").insert({
            wallet_id, tenant_id, transaction_type: "credit", amount: parsedAmount,
            description: `Wallet top-up via dodo (pending)`,
            payment_method: "dodo", status: "pending", reference_id: paymentId,
          });
        });
      } else if (gateway === "razorpay") {
        return await handleRazorpay(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: "Wallet Top-Up",
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/wallet?topup=success&amount=${parsedAmount}`,
          cancelUrl: `${siteUrl}/wallet?topup=cancelled`,
          callbackUrl: `${functionsUrl}/razorpay-payment-callback`,
          userId: user.id, tenantId: tenant_id,
          metadata: { wallet_id, purpose: "wallet_topup", raw_amount: parsedAmount.toString() },
        }, async (orderId: string) => {
          await supabase.from("company_wallet_transactions").insert({
            wallet_id, tenant_id, transaction_type: "credit", amount: parsedAmount,
            description: `Wallet top-up via razorpay (pending)`,
            payment_method: "razorpay", status: "pending", reference_id: orderId,
          });
        });
      } else if (gateway === "twocheckout") {
        return await handle2Checkout(creds, gwConfig.is_sandbox, {
          amount, currency: chargeCurrency, tranId,
          productName: "Wallet Top-Up",
          customerName: profile.full_name || "Customer",
          customerEmail: user.email || "customer@example.com",
          successUrl: `${siteUrl}/wallet?topup=success&amount=${parsedAmount}`,
          cancelUrl: `${siteUrl}/wallet?topup=cancelled`,
          callbackUrl: `${functionsUrl}/twocheckout-payment-callback`,
          userId: user.id, tenantId: tenant_id,
          metadata: { wallet_id, purpose: "wallet_topup", raw_amount: parsedAmount.toString() },
        }, async (refNo: string) => {
          await supabase.from("company_wallet_transactions").insert({
            wallet_id, tenant_id, transaction_type: "credit", amount: parsedAmount,
            description: `Wallet top-up via 2checkout (pending)`,
            payment_method: "twocheckout", status: "pending", reference_id: refNo,
          });
        });
      }
      return jsonResp({ error: `Gateway '${gateway}' is not supported for wallet top-up` }, 400);
    }

    return jsonResp({ error: "Invalid purpose" }, 400);
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== SSLCommerz =====
async function handleSSLCommerz(
  creds: Record<string, string>, isSandbox: boolean,
  opts: {
    amount: number; currency: string; tranId: string; callbackUrl: string;
    customerName: string; customerEmail: string; productName: string;
    productCategory: string; valueA: string; valueB: string; valueC: string; valueD: string;
  },
  onSuccess: () => Promise<void>,
) {
  const STORE_ID = creds.store_id;
  const STORE_PASS = creds.store_password;
  if (!STORE_ID || !STORE_PASS) return jsonResp({ error: "SSLCommerz credentials not configured" }, 500);

  const baseUrl = isSandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";

  const formData = new URLSearchParams({
    store_id: STORE_ID, store_passwd: STORE_PASS,
    total_amount: opts.amount.toString(), currency: opts.currency, tran_id: opts.tranId,
    success_url: opts.callbackUrl, fail_url: opts.callbackUrl,
    cancel_url: opts.callbackUrl, ipn_url: opts.callbackUrl,
    cus_name: opts.customerName, cus_email: opts.customerEmail,
    cus_phone: "01700000000", cus_add1: "Dhaka", cus_city: "Dhaka", cus_country: "Bangladesh",
    shipping_method: "NO", product_name: opts.productName,
    product_category: opts.productCategory, product_profile: "non-physical-goods",
    value_a: opts.valueA, value_b: opts.valueB, value_c: opts.valueC, value_d: opts.valueD,
  });

  const [response] = await Promise.all([
    fetch(`${baseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    }),
    onSuccess(),
  ]);

  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch {
    return jsonResp({ error: "Payment gateway returned an invalid response" }, 502);
  }

  if (result.status === "SUCCESS" && result.GatewayPageURL) {
    return jsonResp({ url: result.GatewayPageURL });
  }
  return jsonResp({ error: result.failedreason || "Failed to create payment session" }, 400);
}

// ===== Stripe One-Time (for lifetime, addons, wallet) =====
async function handleStripeOneTime(
  creds: Record<string, string>,
  _isSandbox: boolean,
  opts: {
    amount: number; currency: string; productName: string;
    successUrl: string; cancelUrl: string;
    userId: string; tenantId: string; email: string;
    metadata?: Record<string, string>;
  },
  onSuccess: (sessionId: string) => Promise<void>,
) {
  const secretKey = creds.secret_key;
  if (!secretKey) return jsonResp({ error: "Stripe secret key not configured" }, 500);
  if (secretKey.startsWith("pk_")) return jsonResp({ error: "Invalid Stripe key: publishable key provided instead of secret key" }, 500);

  const cur = opts.currency.toLowerCase();
  const minAmounts: Record<string, number> = { usd: 0.50, eur: 0.50, gbp: 0.30, jpy: 50, bdt: 50, inr: 1 };
  if (opts.amount < (minAmounts[cur] || 0.50)) return jsonResp({ error: `Amount below Stripe minimum for ${cur.toUpperCase()}` }, 400);

  const params: Record<string, string> = {
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": cur,
    "line_items[0][price_data][product_data][name]": opts.productName,
    "line_items[0][price_data][unit_amount]": Math.round(opts.amount * 100).toString(),
    "line_items[0][quantity]": "1",
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer_email: opts.email,
    // Save card for future use
    "payment_intent_data[setup_future_usage]": "off_session",
  };

  // Add metadata
  params["metadata[user_id]"] = opts.userId;
  params["metadata[tenant_id]"] = opts.tenantId;
  if (opts.metadata) {
    for (const [k, v] of Object.entries(opts.metadata)) {
      params[`metadata[${k}]`] = v;
    }
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const session = await stripeRes.json();
  if (!stripeRes.ok || session.error) {
    const errorMsg = session.error?.message || `Stripe error (HTTP ${stripeRes.status})`;
    console.error("Stripe API error:", JSON.stringify(session.error || session));
    return jsonResp({ error: errorMsg }, 400);
  }
  if (!session.url) return jsonResp({ error: "Stripe session created but no redirect URL returned" }, 502);

  await onSuccess(session.id);
  return jsonResp({ url: session.url, session_id: session.id });
}

// ===== Stripe Subscription (recurring) =====
async function handleStripeSubscription(
  creds: Record<string, string>,
  _isSandbox: boolean,
  opts: {
    amount: number; currency: string; billingCycle: string; productName: string;
    successUrl: string; cancelUrl: string;
    userId: string; tenantId: string; email: string;
    metadata?: Record<string, string>;
  },
  onSuccess: (sessionId: string) => Promise<void>,
) {
  const secretKey = creds.secret_key;
  if (!secretKey) return jsonResp({ error: "Stripe secret key not configured" }, 500);
  if (secretKey.startsWith("pk_")) return jsonResp({ error: "Invalid Stripe key: publishable key provided instead of secret key" }, 500);

  const cur = opts.currency.toLowerCase();

  // Map billing cycle to Stripe interval
  let interval: string;
  let intervalCount = 1;
  switch (opts.billingCycle) {
    case "yearly": interval = "year"; break;
    case "quarterly": interval = "month"; intervalCount = 3; break;
    default: interval = "month"; break;
  }

  const params: Record<string, string> = {
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": cur,
    "line_items[0][price_data][product_data][name]": opts.productName,
    "line_items[0][price_data][unit_amount]": Math.round(opts.amount * 100).toString(),
    "line_items[0][price_data][recurring][interval]": interval,
    "line_items[0][price_data][recurring][interval_count]": String(intervalCount),
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer_email: opts.email,
  };

  // Metadata on subscription
  params["subscription_data[metadata][user_id]"] = opts.userId;
  params["subscription_data[metadata][tenant_id]"] = opts.tenantId;
  params["metadata[user_id]"] = opts.userId;
  params["metadata[tenant_id]"] = opts.tenantId;
  if (opts.metadata) {
    for (const [k, v] of Object.entries(opts.metadata)) {
      params[`subscription_data[metadata][${k}]`] = v;
      params[`metadata[${k}]`] = v;
    }
  }

  console.log(`Stripe subscription checkout: ${opts.amount} ${cur}, interval=${interval}x${intervalCount}`);

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const session = await stripeRes.json();
  if (!stripeRes.ok || session.error) {
    const errorMsg = session.error?.message || `Stripe error (HTTP ${stripeRes.status})`;
    console.error("Stripe subscription error:", JSON.stringify(session.error || session));
    return jsonResp({ error: errorMsg }, 400);
  }
  if (!session.url) return jsonResp({ error: "Stripe subscription session created but no redirect URL returned" }, 502);

  await onSuccess(session.id);
  return jsonResp({ url: session.url, session_id: session.id });
}

// ===== bKash =====
async function handleBkash(
  creds: Record<string, string>, isSandbox: boolean,
  opts: {
    amount: number; currency: string; tranId: string; callbackUrl: string;
    payerReference: string;
    valueA: string; valueB: string; valueC: string; valueD: string;
  },
  onSuccess: () => Promise<void>,
) {
  const { app_key, app_secret, username, password } = creds;
  if (!app_key || !app_secret || !username || !password) {
    return jsonResp({ error: "bKash credentials not configured" }, 500);
  }

  const baseUrl = isSandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

  const tokenRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", username, password },
    body: JSON.stringify({ app_key, app_secret }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.id_token) {
    return jsonResp({ error: tokenData.statusMessage || "bKash authentication failed" }, 400);
  }

  const paymentRes = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", Accept: "application/json",
      Authorization: tokenData.id_token, "X-APP-Key": app_key,
    },
    body: JSON.stringify({
      mode: "0011", payerReference: opts.payerReference,
      callbackURL: opts.callbackUrl, amount: opts.amount.toString(),
      currency: opts.currency, intent: "sale",
      merchantInvoiceNumber: opts.tranId,
    }),
  });

  const paymentData = await paymentRes.json();

  if (paymentData.bkashURL) {
    await onSuccess();
    return jsonResp({ url: paymentData.bkashURL, paymentID: paymentData.paymentID });
  }

  return jsonResp({ error: paymentData.statusMessage || "bKash payment creation failed" }, 400);
}

// ===== Dodo Payments =====
async function handleDodo(
  creds: Record<string, string>, isSandbox: boolean,
  opts: {
    amount: number; currency: string; tranId: string;
    productName: string; customerName: string; customerEmail: string;
    successUrl: string; cancelUrl: string;
    userId: string; tenantId: string;
    metadata?: Record<string, string>;
  },
  onSuccess: (paymentId: string) => Promise<void>,
) {
  const apiKey = creds.api_key;
  if (!apiKey) return jsonResp({ error: "Dodo Payments API key not configured" }, 500);

  const baseUrl = isSandbox
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";

  // Split name for billing
  const nameParts = opts.customerName.split(" ");
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || "User";

  const paymentBody: any = {
    billing: {
      city: "N/A",
      country: "US",
      state: "N/A",
      street: "N/A",
      zipcode: "00000",
    },
    customer: {
      email: opts.customerEmail,
      name: opts.customerName,
    },
    payment_link: true,
    return_url: opts.successUrl,
    product_cart: [
      {
        product_id: opts.tranId,
        quantity: 1,
      },
    ],
    metadata: {
      user_id: opts.userId,
      tenant_id: opts.tenantId,
      tran_id: opts.tranId,
      ...(opts.metadata || {}),
    },
  };

  console.log(`Dodo payment: ${opts.amount} ${opts.currency} for "${opts.productName}"`);

  try {
    // Step 1: Create a one-time product in Dodo
    // Dodo API expects `price` (not `amount`) inside the price object
    const productBody = {
      name: opts.productName,
      price: {
        price: Math.round(opts.amount * 100),
        currency: opts.currency.toUpperCase(),
        type: "one_time_price",
        discount: 0,
        purchasing_power_parity: false,
      },
      tax_category: "digital_products",
    };

    console.log("Dodo creating product:", JSON.stringify(productBody));

    const productRes = await fetch(`${baseUrl}/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productBody),
    });

    const productText = await productRes.text();
    let productId: string;

    if (productRes.ok) {
      try {
        const productData = JSON.parse(productText);
        productId = productData.product_id || productData.id;
        console.log("Dodo product created:", productId);
      } catch {
        console.error("Dodo product parse error:", productText);
        return jsonResp({ error: "Dodo product creation returned invalid response" }, 502);
      }
    } else {
      console.error(`Dodo product creation failed (${productRes.status}):`, productText);
      return jsonResp({ error: `Dodo product creation failed: ${productText}` }, 502);
    }

    if (!productId) {
      return jsonResp({ error: "Dodo product created but no product_id returned" }, 502);
    }

    // Step 2: Create the payment with the real product ID
    paymentBody.product_cart = [{ product_id: productId, quantity: 1 }];

    console.log("Dodo creating payment for product:", productId);

    const payRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentBody),
    });

    const payText = await payRes.text();
    let payData: any;
    try { payData = JSON.parse(payText); } catch {
      console.error("Dodo payment parse error:", payText);
      return jsonResp({ error: "Dodo payment returned invalid response" }, 502);
    }

    if (payData.payment_link || payData.payment_url || payData.url) {
      const paymentUrl = payData.payment_link || payData.payment_url || payData.url;
      const paymentId = payData.payment_id || payData.id || opts.tranId;
      await onSuccess(paymentId);
      return jsonResp({ url: paymentUrl, payment_id: paymentId });
    }

    console.error("Dodo payment response:", JSON.stringify(payData));
    return jsonResp({ error: payData.message || payData.error || "Dodo payment creation failed" }, 400);
  } catch (err: any) {
    console.error("Dodo error:", err);
    return jsonResp({ error: err.message || "Dodo payment failed" }, 502);
}

// ===== Razorpay (India) =====
async function handleRazorpay(
  creds: Record<string, string>, _isSandbox: boolean,
  opts: {
    amount: number; currency: string; tranId: string;
    productName: string; customerName: string; customerEmail: string;
    successUrl: string; cancelUrl: string; callbackUrl: string;
    userId: string; tenantId: string;
    metadata?: Record<string, string>;
  },
  onSuccess: (orderId: string) => Promise<void>,
) {
  const keyId = creds.key_id;
  const keySecret = creds.key_secret;
  if (!keyId || !keySecret) return jsonResp({ error: "Razorpay credentials not configured. Set key_id and key_secret in admin panel." }, 500);

  // Razorpay amounts are in smallest currency unit (paise for INR)
  const amountInPaise = Math.round(opts.amount * 100);

  // Step 1: Create Razorpay order
  const orderBody = {
    amount: amountInPaise,
    currency: opts.currency.toUpperCase(),
    receipt: opts.tranId,
    notes: {
      user_id: opts.userId,
      tenant_id: opts.tenantId,
      product_name: opts.productName,
      tran_id: opts.tranId,
      ...(opts.metadata || {}),
    },
  };

  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify(orderBody),
  });

  const orderData = await orderRes.json();

  if (!orderRes.ok || orderData.error) {
    console.error("Razorpay order error:", JSON.stringify(orderData));
    return jsonResp({ error: orderData.error?.description || "Razorpay order creation failed" }, 400);
  }

  const orderId = orderData.id;

  // Step 2: Create a payment link for redirect-based flow
  const linkBody = {
    amount: amountInPaise,
    currency: opts.currency.toUpperCase(),
    description: opts.productName,
    customer: {
      name: opts.customerName,
      email: opts.customerEmail,
    },
    notify: { email: true },
    callback_url: opts.successUrl,
    callback_method: "get",
    notes: {
      order_id: orderId,
      user_id: opts.userId,
      tenant_id: opts.tenantId,
      tran_id: opts.tranId,
      ...(opts.metadata || {}),
    },
  };

  const linkRes = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify(linkBody),
  });

  const linkData = await linkRes.json();

  if (!linkRes.ok || linkData.error) {
    console.error("Razorpay payment link error:", JSON.stringify(linkData));
    return jsonResp({ error: linkData.error?.description || "Razorpay payment link creation failed" }, 400);
  }

  await onSuccess(orderId);

  return jsonResp({
    url: linkData.short_url,
    razorpay_order_id: orderId,
    razorpay_link_id: linkData.id,
  });
}

// ===== 2Checkout (Verifone) =====
async function handle2Checkout(
  creds: Record<string, string>, isSandbox: boolean,
  opts: {
    amount: number; currency: string; tranId: string;
    productName: string; customerName: string; customerEmail: string;
    successUrl: string; cancelUrl: string; callbackUrl: string;
    userId: string; tenantId: string;
    metadata?: Record<string, string>;
  },
  onSuccess: (refNo: string) => Promise<void>,
) {
  const merchantCode = creds.merchant_code;
  const secretKey = creds.secret_key;
  if (!merchantCode || !secretKey) return jsonResp({ error: "2Checkout credentials not configured. Set merchant_code and secret_key in admin panel." }, 500);

  // 2Checkout Buy Link / hosted checkout approach
  // Using 2Checkout's ConvertPlus inline checkout via redirect URL
  const baseUrl = isSandbox
    ? "https://sandbox.2checkout.com"
    : "https://secure.2checkout.com";

  // Build buy-link URL parameters
  const nameParts = opts.customerName.split(" ");
  const params = new URLSearchParams({
    // Product info
    "prod": opts.productName,
    "price": opts.amount.toFixed(2),
    "qty": "1",
    "type": "PRODUCT",
    "currency-lock": "true",
    // Currency
    "currency": opts.currency.toUpperCase(),
    // Merchant
    "merchant": merchantCode,
    // Customer
    "ship-name": opts.customerName,
    "email": opts.customerEmail,
    "first-name": nameParts[0] || "Customer",
    "last-name": nameParts.slice(1).join(" ") || "User",
    // URLs
    "return-url": opts.successUrl,
    "return-type": "redirect",
    // Reference
    "order-ext-ref": opts.tranId,
    // Dynamic product
    "dynamic": "1",
    // Metadata as custom params
    "src": "dynime_platform",
  });

  // Generate HMAC signature for security
  const signaturePayload = `${merchantCode}${opts.tranId}${opts.amount.toFixed(2)}${opts.currency.toUpperCase()}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signaturePayload));
  const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");

  params.set("signature", sigHex);

  const checkoutUrl = `${baseUrl}/checkout/buy/?${params.toString()}`;

  await onSuccess(opts.tranId);

  return jsonResp({
    url: checkoutUrl,
    twocheckout_ref: opts.tranId,
  });
}
}
