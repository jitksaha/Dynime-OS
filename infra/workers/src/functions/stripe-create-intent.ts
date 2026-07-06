// Phase 5 — stripe-create-intent ported to a Worker.
// Source: supabase/functions/stripe-create-intent/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - user auth             -> contextFromRequest(req, env)
//   - Stripe creds          -> getPaymentGatewayConfig(sql, "stripe") (DB-driven secrets)
// SetupIntent / confirm_setup / PaymentIntent flows, off-session SCA handling,
// currency conversion, Stripe minimums, and all amounts preserved verbatim.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { getPaymentGatewayConfig } from "../_shared/secrets";

const J = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return J({ error: "Unauthorized" }, 401);

    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId || ctx.role === "anon") return J({ error: "Invalid auth token" }, 401);
    const user = { id: ctx.userId, email: ctx.email || "" };

    // Parallel: parse body + fetch gateway config.
    const [body, gwConfig] = await Promise.all([
      req.json() as Promise<any>,
      getPaymentGatewayConfig(sql, "stripe"),
    ]);

    if (!gwConfig || !(gwConfig as any).is_enabled) {
      return J({ error: "Stripe gateway is not enabled" }, 400);
    }

    const rawCreds = (gwConfig as any).credentials as Record<string, any>;
    const creds: Record<string, string> = (rawCreds.sandbox || rawCreds.live)
      ? ((gwConfig as any).is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;
    const secretKey = creds.secret_key;
    const publishableKey = creds.publishable_key;

    if (!secretKey || !publishableKey) {
      return J({ error: "Stripe keys not configured in admin panel" }, 500);
    }

    const { purpose, plan_id, billing_cycle, addon_id, payment_type, amount: walletAmount, wallet_id, action, saved_method_id, checkout_currency } = body;

    // Get profile.
    const profileRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT tenant_id, full_name FROM public.profiles WHERE user_id = ${user.id} LIMIT 1`);
    const profile = profileRows[0] as { tenant_id?: string; full_name?: string } | undefined;

    if (!profile?.tenant_id) {
      return J({ error: "No tenant found" }, 400);
    }
    const tenantId = profile.tenant_id;

    // ===== SETUP INTENT (save card for future use) =====
    if (action === "setup_intent") {
      let customerId = "";

      // Check if we already have a Stripe customer for this user.
      const existingMethods = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT metadata FROM public.saved_payment_methods
           WHERE user_id = ${user.id} AND gateway_key = 'stripe' AND is_active = true
           LIMIT 1`);

      const existingMeta = (existingMethods[0]?.metadata as any) || null;
      if (existingMeta?.stripe_customer_id) {
        customerId = existingMeta.stripe_customer_id;
      } else {
        // Create Stripe customer.
        const custParams = new URLSearchParams({
          email: user.email || "",
          name: profile.full_name || "",
          "metadata[user_id]": user.id,
          "metadata[tenant_id]": tenantId,
        });

        const custRes = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: custParams,
        });
        const custData = await custRes.json() as any;
        if (custData.error) {
          return J({ error: custData.error.message }, 400);
        }
        customerId = custData.id;
      }

      // Create SetupIntent.
      const siParams = new URLSearchParams({
        customer: customerId,
        "payment_method_types[0]": "card",
        usage: "off_session",
        "metadata[user_id]": user.id,
        "metadata[tenant_id]": tenantId,
      });

      const siRes = await fetch("https://api.stripe.com/v1/setup_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: siParams,
      });
      const siData = await siRes.json() as any;

      if (siData.error) {
        return J({ error: siData.error.message }, 400);
      }

      return J({
        client_secret: siData.client_secret,
        publishable_key: publishableKey,
        setup_intent_id: siData.id,
        customer_id: customerId,
      }, 200);
    }

    // ===== CONFIRM SETUP (after card is saved on frontend) =====
    if (action === "confirm_setup") {
      const { setup_intent_id, customer_id } = body;

      // Retrieve the SetupIntent to get payment method details.
      const siRes = await fetch(`https://api.stripe.com/v1/setup_intents/${setup_intent_id}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const siData = await siRes.json() as any;

      if (siData.status !== "succeeded") {
        return J({ error: "Setup not completed" }, 400);
      }

      // Get payment method details.
      const pmId = siData.payment_method;
      const pmRes = await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const pmData = await pmRes.json() as any;

      const card = pmData.card || {};
      const brand = card.brand || "card";
      const last4 = card.last4 || "****";

      await withSession(sql, SERVICE, async (tx) => {
        // Check if this is the first method (make it default).
        const countRows = await tx`SELECT COUNT(*)::int AS count FROM public.saved_payment_methods
          WHERE user_id = ${user.id} AND is_active = true`;
        const count = Number(countRows[0]?.count || 0);

        await tx`INSERT INTO public.saved_payment_methods ${tx({
          user_id: user.id,
          tenant_id: tenantId,
          gateway_key: "stripe",
          display_name: "Cards",
          method_label: `${brand.charAt(0).toUpperCase() + brand.slice(1)} ****${last4}`,
          card_brand: brand,
          card_last4: last4,
          token: pmId,
          is_default: count === 0,
          metadata: { stripe_customer_id: customer_id },
        } as any)}`;
      });

      return J({ saved: true, brand, last4 }, 200);
    }

    // ===== PAYMENT INTENT (existing flow) =====
    let amount = 0;
    let currency = "usd";
    let description = "Payment";
    const metadata: Record<string, string> = {
      user_id: user.id,
      tenant_id: tenantId,
      purpose,
    };

    if (purpose === "subscription") {
      const planRows = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT * FROM public.subscription_plans WHERE id = ${plan_id} LIMIT 1`);
      const plan = planRows[0] as any;
      if (!plan) return J({ error: "Plan not found" }, 404);
      amount = billing_cycle === "yearly" ? plan.price_yearly : billing_cycle === "quarterly" ? plan.price_quarterly : plan.price_monthly;
      currency = (plan.currency || "usd").toLowerCase();
      description = `${plan.name} Plan - ${billing_cycle}`;
      metadata.plan_id = plan_id;
      metadata.billing_cycle = billing_cycle;
    } else if (purpose === "addon") {
      const addonRows = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT * FROM public.module_addons WHERE id = ${addon_id} AND is_active = true LIMIT 1`);
      const addon = addonRows[0] as any;
      if (!addon) return J({ error: "Add-on not found" }, 404);
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
        return J({ error: "Invalid amount" }, 400);
      }
      currency = "usd";
      description = "Wallet Top-Up";
      metadata.wallet_id = wallet_id;
    } else {
      return J({ error: "Invalid purpose" }, 400);
    }

    // Apply checkout currency conversion from canonical server amount (prevents stale frontend totals).
    const requestedCheckoutCurrency = typeof checkout_currency === "string"
      ? checkout_currency.toUpperCase()
      : null;

    if (requestedCheckoutCurrency && /^[A-Z]{3}$/.test(requestedCheckoutCurrency)) {
      const sourceCurrency = currency.toUpperCase();
      if (requestedCheckoutCurrency !== sourceCurrency) {
        const ratesRows = await withSession(sql, SERVICE, (tx) =>
          tx`SELECT value FROM public.platform_settings WHERE key = 'enabled_countries' LIMIT 1`);

        const rates: Record<string, number> = { USD: 1 };
        const countries = (ratesRows[0]?.value as any[]) || [];
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
      return J({ error: "Invalid amount" }, 400);
    }

    // Stripe minimum amounts per currency (in major units).
    const STRIPE_MINIMUMS: Record<string, number> = {
      usd: 0.50, eur: 0.50, gbp: 0.30, bdt: 50, inr: 50,
      aud: 0.50, cad: 0.50, jpy: 50, sgd: 0.50, myr: 2,
      brl: 0.50, aed: 2, pkr: 100, ngn: 100, zar: 5,
      mxn: 10, thb: 10, php: 25, idr: 7000, nzd: 0.50,
      sek: 3, nok: 3, dkk: 2.50, chf: 0.50, pln: 2,
    };
    const minAmount = STRIPE_MINIMUMS[currency] ?? 0.50;
    if (amount < minAmount) {
      return J({
        error: `Minimum payment amount is ${minAmount} ${currency.toUpperCase()}. Please increase the amount.`,
      }, 400);
    }

    // ===== SAVED CARD OFF-SESSION CHARGE =====
    if (saved_method_id) {
      // Look up saved payment method to get token (Stripe payment_method ID) and customer.
      const savedRows = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT token, metadata FROM public.saved_payment_methods
           WHERE id = ${saved_method_id} AND user_id = ${user.id} AND is_active = true
           LIMIT 1`);
      const savedMethod = savedRows[0] as { token?: string; metadata?: any } | undefined;

      if (!savedMethod?.token) {
        return J({ error: "Saved payment method not found" }, 400);
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
      const offIntent = await offRes.json() as any;

      if (offIntent.error) {
        // If requires authentication (SCA), return client_secret for frontend 3DS.
        if (offIntent.error.code === "authentication_required" && offIntent.error.payment_intent) {
          const pi = offIntent.error.payment_intent;
          // Create pending records.
          const tranId = pi.id;
          if (purpose === "subscription") {
            await withSession(sql, SERVICE, (tx) =>
              tx`INSERT INTO public.tenant_subscriptions ${tx({
                tenant_id: tenantId, plan_id, billing_cycle, amount,
                status: "pending", transaction_id: tranId, payment_method: "stripe",
                current_period_start: new Date().toISOString(),
              } as any)}`);
          } else if (purpose === "addon") {
            const addonRows = await withSession(sql, SERVICE, (tx) =>
              tx`SELECT module_name FROM public.module_addons WHERE id = ${addon_id} LIMIT 1`);
            const addon = addonRows[0] as any;
            await withSession(sql, SERVICE, (tx) =>
              tx`INSERT INTO public.tenant_addon_modules ${tx({
                tenant_id: tenantId, module_name: addon?.module_name || "",
                payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
                amount, status: "pending", transaction_id: tranId,
              } as any)}`);
          } else if (purpose === "wallet_topup") {
            await withSession(sql, SERVICE, (tx) =>
              tx`INSERT INTO public.company_wallet_transactions ${tx({
                wallet_id, tenant_id: tenantId, transaction_type: "credit", amount,
                description: "Wallet top-up via Stripe (pending)",
                payment_method: "stripe", status: "pending", reference_id: tranId,
              } as any)}`);
          }

          return J({
            client_secret: pi.client_secret,
            publishable_key: publishableKey,
            payment_intent_id: pi.id,
            amount, currency,
            requires_action: true,
          }, 200);
        }

        return J({ error: offIntent.error.message || "Payment failed" }, 400);
      }

      // Off-session succeeded! Create records as completed.
      const tranId = offIntent.id;
      if (purpose === "subscription") {
        await withSession(sql, SERVICE, (tx) =>
          tx`INSERT INTO public.tenant_subscriptions ${tx({
            tenant_id: tenantId, plan_id, billing_cycle, amount,
            status: "active", transaction_id: tranId, payment_method: "stripe",
            current_period_start: new Date().toISOString(),
          } as any)}`);
      } else if (purpose === "addon") {
        const addonRows = await withSession(sql, SERVICE, (tx) =>
          tx`SELECT module_name FROM public.module_addons WHERE id = ${addon_id} LIMIT 1`);
        const addon = addonRows[0] as any;
        await withSession(sql, SERVICE, (tx) =>
          tx`INSERT INTO public.tenant_addon_modules ${tx({
            tenant_id: tenantId, module_name: addon?.module_name || "",
            payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
            amount, status: "active", transaction_id: tranId,
          } as any)}`);
      } else if (purpose === "wallet_topup") {
        await withSession(sql, SERVICE, async (tx) => {
          await tx`INSERT INTO public.company_wallet_transactions ${tx({
            wallet_id, tenant_id: tenantId, transaction_type: "credit", amount,
            description: "Wallet top-up via Stripe",
            payment_method: "stripe", status: "completed", reference_id: tranId,
          } as any)}`;
          // Also credit the wallet balance.
          const walletRows = await tx`SELECT balance FROM public.company_wallets WHERE id = ${wallet_id} LIMIT 1`;
          const wallet = walletRows[0] as any;
          if (wallet) {
            await tx`UPDATE public.company_wallets SET balance = ${wallet.balance + amount} WHERE id = ${wallet_id}`;
          }
        });
      }

      return J({
        off_session_success: true,
        payment_intent_id: tranId,
        amount, currency,
      }, 200);
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

    const intent = await stripeRes.json() as any;

    if (intent.error) {
      console.error("Stripe error:", JSON.stringify(intent.error));
      return J({ error: intent.error.message || "Failed to create payment intent" }, 400);
    }

    const tranId = intent.id;

    if (purpose === "subscription") {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.tenant_subscriptions ${tx({
          tenant_id: tenantId, plan_id, billing_cycle, amount,
          status: "pending", transaction_id: tranId, payment_method: "stripe",
          current_period_start: new Date().toISOString(),
        } as any)}`);
    } else if (purpose === "addon") {
      const addonRows = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT module_name FROM public.module_addons WHERE id = ${addon_id} LIMIT 1`);
      const addon = addonRows[0] as any;
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.tenant_addon_modules ${tx({
          tenant_id: tenantId, module_name: addon?.module_name || "",
          payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
          amount, status: "pending", transaction_id: tranId,
        } as any)}`);
    } else if (purpose === "wallet_topup") {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.company_wallet_transactions ${tx({
          wallet_id, tenant_id: tenantId, transaction_type: "credit", amount,
          description: "Wallet top-up via Stripe (pending)",
          payment_method: "stripe", status: "pending", reference_id: tranId,
        } as any)}`);
    }

    return J({
      client_secret: intent.client_secret, publishable_key: publishableKey,
      payment_intent_id: intent.id, amount, currency,
    }, 200);
  } catch (err: any) {
    console.error("Error:", err);
    return J({ error: err.message || "Internal server error" }, 500);
  }
}
