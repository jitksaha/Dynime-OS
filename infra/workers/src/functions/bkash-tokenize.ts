// Phase 5 — bkash-tokenize ported to a Worker.
// Source: supabase/functions/bkash-tokenize/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - user auth             -> contextFromRequest(req, env)
// bKash tokenized-checkout agreement creation, agreement/payment GET callbacks
// (provider -> server redirects, no user JWT -> SERVICE context), and
// charge-with-agreement are preserved verbatim. bKash creds read from
// payment_gateway_configs (DB-driven secrets).
//
// REVIEW: original built callback URLs against SUPABASE_URL/functions/v1; these
// now point at APP_URL/functions/v1 (the Workers functions gateway).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  // Functions gateway base (replaces SUPABASE_URL/functions/v1).
  const functionsBase = `${(env as any).APP_URL}/functions/v1`;

  try {
    // Handle bKash callback (GET redirect from bKash - no auth header)
    const url = new URL(req.url);
    const callbackAction = url.searchParams.get("action");

    if (callbackAction === "agreement_callback") {
      const cbUserId = url.searchParams.get("user_id");
      const cbPhone = url.searchParams.get("phone");
      const redirectUrl = url.searchParams.get("redirect") || "https://dynime.com/settings";
      const paymentID = url.searchParams.get("paymentID");
      const status = url.searchParams.get("status");

      if (status === "cancel" || status === "failure") {
        return Response.redirect(redirectUrl, 302);
      }

      if (paymentID && cbUserId) {
        const gwConfig = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT credentials, is_sandbox, is_enabled
            FROM public.payment_gateway_configs WHERE gateway_key = 'bkash' LIMIT 1`;
          return rows[0] as any;
        });

        if (gwConfig?.is_enabled) {
          const creds = gwConfig.credentials as Record<string, any>;
          const activeCreds = gwConfig.is_sandbox ? (creds?.sandbox || {}) : (creds?.live || {});
          const appKey = activeCreds.app_key;
          const appSecret = activeCreds.app_secret;
          const username = activeCreds.username;
          const password = activeCreds.password;
          const baseUrl = gwConfig.is_sandbox
            ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout"
            : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout";

          const grantRes = await fetch(`${baseUrl}/token/grant`, {
            method: "POST",
            headers: { "Content-Type": "application/json", username, password },
            body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
          });
          const grantData = await grantRes.json() as any;
          const idToken = grantData.id_token;

          if (idToken) {
            const execRes = await fetch(`${baseUrl}/execute`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: idToken,
                "X-APP-Key": appKey,
              },
              body: JSON.stringify({ paymentID }),
            });
            const execData = await execRes.json() as any;

            if (execData.agreementID) {
              const last4 = (cbPhone || "0000").slice(-4);
              const profile = await withSession(sql, SERVICE, async (tx) => {
                const rows = await tx`SELECT tenant_id FROM public.profiles
                  WHERE user_id = ${cbUserId} LIMIT 1`;
                return rows[0] as any;
              });

              await withSession(sql, SERVICE, (tx) =>
                tx`INSERT INTO public.saved_payment_methods ${tx({
                  user_id: cbUserId,
                  tenant_id: profile?.tenant_id,
                  gateway_key: "bkash",
                  display_name: "bKash",
                  method_label: `bKash ****${last4}`,
                  phone_last4: last4,
                  token: paymentID,
                  agreement_id: execData.agreementID,
                } as any)}`);
            }
          }
        }
      }

      return Response.redirect(redirectUrl, 302);
    }

    // ===== Payment callback — executes payment after user PIN authorization =====
    if (callbackAction === "payment_callback") {
      const cbUserId = url.searchParams.get("user_id");
      const cbTenantId = url.searchParams.get("tenant_id");
      const cbPurpose = url.searchParams.get("purpose");
      const cbTranId = url.searchParams.get("tran_id");
      const baseRedirect = url.searchParams.get("redirect") || "https://dynime.com/subscription";
      const separator = baseRedirect.includes("?") ? "&" : "?";
      const successRedirect = `${baseRedirect}${separator}payment=success`;
      const failRedirect = `${baseRedirect}${separator}payment=failed`;
      const paymentID = url.searchParams.get("paymentID");
      const status = url.searchParams.get("status");

      if (status === "cancel" || status === "failure") {
        return Response.redirect(failRedirect, 302);
      }

      if (!paymentID || !cbUserId || !cbTenantId) {
        return Response.redirect(failRedirect, 302);
      }

      // Fetch bKash config & execute
      const gwConfig = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT credentials, is_sandbox, is_enabled
          FROM public.payment_gateway_configs WHERE gateway_key = 'bkash' LIMIT 1`;
        return rows[0] as any;
      });

      if (!gwConfig?.is_enabled) {
        return Response.redirect(failRedirect, 302);
      }

      const creds = gwConfig.credentials as Record<string, any>;
      const activeCreds = gwConfig.is_sandbox ? (creds?.sandbox || {}) : (creds?.live || {});
      const baseUrl = gwConfig.is_sandbox
        ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout"
        : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout";

      const grantRes = await fetch(`${baseUrl}/token/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", username: activeCreds.username, password: activeCreds.password },
        body: JSON.stringify({ app_key: activeCreds.app_key, app_secret: activeCreds.app_secret }),
      });
      const grantData = await grantRes.json() as any;

      if (!grantData.id_token) {
        console.error("bKash token grant failed in payment_callback:", grantData);
        return Response.redirect(failRedirect, 302);
      }

      const execRes = await fetch(`${baseUrl}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: grantData.id_token,
          "X-APP-Key": activeCreds.app_key,
        },
        body: JSON.stringify({ paymentID }),
      });
      const execData = await execRes.json() as any;

      if (execData.transactionStatus === "Completed" || execData.statusCode === "0000") {
        const trxID = execData.trxID || cbTranId;

        // Process based on purpose
        if (cbPurpose === "subscription") {
          const planId = url.searchParams.get("plan_id");
          if (planId) {
            const plan = await withSession(sql, SERVICE, async (tx) => {
              const rows = await tx`SELECT slug FROM public.subscription_plans WHERE id = ${planId} LIMIT 1`;
              return rows[0] as any;
            });
            // Update pending subscription to active
            await withSession(sql, SERVICE, (tx) =>
              tx`UPDATE public.tenant_subscriptions SET status = 'active', transaction_id = ${trxID}
                 WHERE tenant_id = ${cbTenantId} AND transaction_id = ${cbTranId} AND status = 'pending'`);
            if (plan) {
              await withSession(sql, SERVICE, (tx) =>
                tx`UPDATE public.tenants SET plan = ${plan.slug} WHERE id = ${cbTenantId}`);
            }
          }
        } else if (cbPurpose === "addon") {
          const addonId = url.searchParams.get("addon_id");
          const paymentType = url.searchParams.get("payment_type");
          const billingCycle = url.searchParams.get("billing_cycle");
          if (addonId) {
            const addon = await withSession(sql, SERVICE, async (tx) => {
              const rows = await tx`SELECT * FROM public.module_addons WHERE id = ${addonId} LIMIT 1`;
              return rows[0] as any;
            });
            if (addon) {
              const rawAmt = paymentType === "onetime" ? addon.price_onetime
                : billingCycle === "quarterly" ? addon.price_quarterly
                : billingCycle === "yearly" ? addon.price_yearly : addon.price_monthly;
              await withSession(sql, SERVICE, (tx) =>
                tx`INSERT INTO public.tenant_addon_modules ${tx({
                  tenant_id: cbTenantId, module_name: addon.module_name,
                  payment_type: paymentType, billing_cycle: paymentType === "subscription" ? (billingCycle || "monthly") : null,
                  amount: rawAmt, status: "active", transaction_id: trxID,
                } as any)}`);
            }
          }
        } else if (cbPurpose === "wallet_topup") {
          const walletId = url.searchParams.get("wallet_id");
          const rawAmount = parseFloat(url.searchParams.get("raw_amount") || "0");
          if (walletId && rawAmount > 0) {
            await withSession(sql, SERVICE, async (tx) => {
              await tx`INSERT INTO public.company_wallet_transactions ${tx({
                wallet_id: walletId, tenant_id: cbTenantId,
                transaction_type: "credit", amount: rawAmount,
                description: "Wallet top-up via bKash (saved)",
                payment_method: "bkash", status: "completed", reference_id: trxID,
              } as any)}`;
              const walletRows = await tx`SELECT balance FROM public.company_wallets WHERE id = ${walletId} LIMIT 1`;
              const wallet = walletRows[0] as any;
              if (wallet) {
                await tx`UPDATE public.company_wallets SET balance = ${wallet.balance + rawAmount} WHERE id = ${walletId}`;
              }
            });
          }
        }

        return Response.redirect(successRedirect, 302);
      }

      console.error("bKash payment execute failed in callback:", execData);
      return Response.redirect(failRedirect, 302);
    }

    // --- Authenticated actions below ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId || ctx.role === "anon") {
      console.error("bkash auth error: invalid token");
      return jsonResp({ error: "Invalid auth token" }, 401);
    }
    const userId = ctx.userId;

    const body = await req.json() as any;
    const { phone, action, agreement_id } = body;

    // Fetch bKash gateway config
    const gwConfig = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT credentials, is_sandbox, is_enabled
        FROM public.payment_gateway_configs WHERE gateway_key = 'bkash' LIMIT 1`;
      return rows[0] as any;
    });

    if (!gwConfig?.is_enabled) {
      return jsonResp({ error: "bKash gateway is not enabled" }, 400);
    }

    const creds = gwConfig.credentials as Record<string, any>;
    const sandboxCreds = creds?.sandbox || {};
    const liveCreds = creds?.live || {};
    const activeCreds = gwConfig.is_sandbox ? sandboxCreds : liveCreds;

    const appKey = activeCreds.app_key;
    const appSecret = activeCreds.app_secret;
    const username = activeCreds.username;
    const password = activeCreds.password;
    const baseUrl = gwConfig.is_sandbox
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout";

    if (!appKey || !appSecret) {
      return jsonResp({ error: "bKash credentials not configured" }, 500);
    }

    // Step 1: Grant token
    const grantRes = await fetch(`${baseUrl}/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username,
        password,
      },
      body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
    });
    const grantData = await grantRes.json() as any;
    const idToken = grantData.id_token;

    if (!idToken) {
      console.error("bKash grant failed:", grantData);
      return jsonResp({ error: "Failed to authenticate with bKash", details: grantData }, 502);
    }

    if (action === "create_agreement") {
      // Step 2: Create agreement for tokenized recurring payments
      const siteUrl = req.headers.get("origin") || "https://dynime.com";
      const callbackUrl = `${functionsBase}/bkash-tokenize`;

      const agreementRes = await fetch(`${baseUrl}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
          "X-APP-Key": appKey,
        },
        body: JSON.stringify({
          mode: "0000", // agreement mode
          payerReference: phone,
          callbackURL: `${callbackUrl}?action=agreement_callback&user_id=${userId}&phone=${phone}&redirect=${encodeURIComponent(siteUrl + "/settings?section=payment-methods")}`,
          amount: "0",
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: `AGR_${Date.now()}`,
        }),
      });

      const agreementData = await agreementRes.json() as any;

      if (agreementData.bkashURL) {
        return jsonResp({ redirect_url: agreementData.bkashURL }, 200);
      }

      // If no redirect needed (sandbox may auto-complete), save directly
      const last4 = phone.slice(-4);
      const profile = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT tenant_id FROM public.profiles WHERE user_id = ${userId} LIMIT 1`;
        return rows[0] as any;
      });

      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.saved_payment_methods ${tx({
          user_id: userId,
          tenant_id: profile?.tenant_id,
          gateway_key: "bkash",
          display_name: "bKash",
          method_label: `bKash ****${last4}`,
          phone_last4: last4,
          token: agreementData.paymentID || `bkash_${Date.now()}`,
          agreement_id: agreementData.agreementID || null,
        } as any)}`);

      return jsonResp({ saved: true }, 200);
    }

    // agreement_callback is now handled above (before auth check) for GET redirects

    if (action === "charge_with_agreement") {
      // Charge a saved bKash agreement
      const { amount, invoice_number } = body;
      if (!agreement_id || !amount) {
        return jsonResp({ error: "agreement_id and amount required" }, 400);
      }

      const chargeRes = await fetch(`${baseUrl}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
          "X-APP-Key": appKey,
        },
        body: JSON.stringify({
          mode: "0001", // payment with agreement
          payerReference: phone || " ",
          callbackURL: `${functionsBase}/bkash-tokenize?action=payment_callback`,
          agreementID: agreement_id,
          amount: String(amount),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: invoice_number || `PAY_${Date.now()}`,
        }),
      });

      const chargeData = await chargeRes.json() as any;

      if (chargeData.bkashURL) {
        return jsonResp({ redirect_url: chargeData.bkashURL, paymentID: chargeData.paymentID }, 200);
      }

      return jsonResp({ error: "bKash charge failed", details: chargeData }, 400);
    }

    return jsonResp({ error: "Invalid action" }, 400);
  } catch (err: any) {
    console.error("bKash tokenize error:", err);
    return jsonResp({ error: err.message || "Internal server error" }, 500);
  }
}
