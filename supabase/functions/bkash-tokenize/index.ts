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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
        const { data: gwConfig } = await supabase
          .from("payment_gateway_configs")
          .select("credentials, is_sandbox, is_enabled")
          .eq("gateway_key", "bkash")
          .single();

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
          const grantData = await grantRes.json();
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
            const execData = await execRes.json();

            if (execData.agreementID) {
              const last4 = (cbPhone || "0000").slice(-4);
              const { data: profile } = await supabase
                .from("profiles")
                .select("tenant_id")
                .eq("user_id", cbUserId)
                .single();

              await supabase.from("saved_payment_methods").insert({
                user_id: cbUserId,
                tenant_id: profile?.tenant_id,
                gateway_key: "bkash",
                display_name: "bKash",
                method_label: `bKash ****${last4}`,
                phone_last4: last4,
                token: paymentID,
                agreement_id: execData.agreementID,
              });
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
      const { data: gwConfig } = await supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox, is_enabled")
        .eq("gateway_key", "bkash")
        .single();

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
      const grantData = await grantRes.json();

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
      const execData = await execRes.json();

      if (execData.transactionStatus === "Completed" || execData.statusCode === "0000") {
        const trxID = execData.trxID || cbTranId;

        // Process based on purpose
        if (cbPurpose === "subscription") {
          const planId = url.searchParams.get("plan_id");
          const billingCycle = url.searchParams.get("billing_cycle");
          if (planId) {
            const { data: plan } = await supabase.from("subscription_plans").select("slug").eq("id", planId).single();
            // Update pending subscription to active
            await supabase.from("tenant_subscriptions")
              .update({ status: "active", transaction_id: trxID })
              .eq("tenant_id", cbTenantId)
              .eq("transaction_id", cbTranId)
              .eq("status", "pending");
            if (plan) {
              await supabase.from("tenants").update({ plan: plan.slug }).eq("id", cbTenantId);
            }
          }
        } else if (cbPurpose === "addon") {
          const addonId = url.searchParams.get("addon_id");
          const paymentType = url.searchParams.get("payment_type");
          const billingCycle = url.searchParams.get("billing_cycle");
          if (addonId) {
            const { data: addon } = await supabase.from("module_addons").select("*").eq("id", addonId).single();
            if (addon) {
              const rawAmt = paymentType === "onetime" ? addon.price_onetime
                : billingCycle === "quarterly" ? addon.price_quarterly
                : billingCycle === "yearly" ? addon.price_yearly : addon.price_monthly;
              await supabase.from("tenant_addon_modules").insert({
                tenant_id: cbTenantId, module_name: addon.module_name,
                payment_type: paymentType, billing_cycle: paymentType === "subscription" ? (billingCycle || "monthly") : null,
                amount: rawAmt, status: "active", transaction_id: trxID,
              });
            }
          }
        } else if (cbPurpose === "wallet_topup") {
          const walletId = url.searchParams.get("wallet_id");
          const rawAmount = parseFloat(url.searchParams.get("raw_amount") || "0");
          if (walletId && rawAmount > 0) {
            await supabase.from("company_wallet_transactions").insert({
              wallet_id: walletId, tenant_id: cbTenantId,
              transaction_type: "credit", amount: rawAmount,
              description: "Wallet top-up via bKash (saved)",
              payment_method: "bkash", status: "completed", reference_id: trxID,
            });
            const { data: wallet } = await supabase.from("company_wallets").select("balance").eq("id", walletId).single();
            if (wallet) {
              await supabase.from("company_wallets").update({ balance: wallet.balance + rawAmount }).eq("id", walletId);
            }
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await anonClient.auth.getUser(token);
    if (claimsError || !data?.user) {
      console.error("bkash auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUser = data.user;
    const userId = authUser.id;

    const body = await req.json();
    const { phone, action, agreement_id } = body;

    // Fetch bKash gateway config
    const { data: gwConfig } = await supabase
      .from("payment_gateway_configs")
      .select("credentials, is_sandbox, is_enabled")
      .eq("gateway_key", "bkash")
      .single();

    if (!gwConfig?.is_enabled) {
      return new Response(JSON.stringify({ error: "bKash gateway is not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "bKash credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const grantData = await grantRes.json();
    const idToken = grantData.id_token;

    if (!idToken) {
      console.error("bKash grant failed:", grantData);
      return new Response(JSON.stringify({ error: "Failed to authenticate with bKash", details: grantData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_agreement") {
      // Step 2: Create agreement for tokenized recurring payments
      const siteUrl = req.headers.get("origin") || "https://dynime.com";
      const callbackUrl = `${SUPABASE_URL}/functions/v1/bkash-tokenize`;

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

      const agreementData = await agreementRes.json();
      
      if (agreementData.bkashURL) {
        return new Response(JSON.stringify({ redirect_url: agreementData.bkashURL }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If no redirect needed (sandbox may auto-complete), save directly
      const last4 = phone.slice(-4);
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", userId)
        .single();

      await supabase.from("saved_payment_methods").insert({
        user_id: userId,
        tenant_id: profile?.tenant_id,
        gateway_key: "bkash",
        display_name: "bKash",
        method_label: `bKash ****${last4}`,
        phone_last4: last4,
        token: agreementData.paymentID || `bkash_${Date.now()}`,
        agreement_id: agreementData.agreementID || null,
      });

      return new Response(JSON.stringify({ saved: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // agreement_callback is now handled above (before auth check) for GET redirects

    if (action === "charge_with_agreement") {
      // Charge a saved bKash agreement
      const { amount, invoice_number } = body;
      if (!agreement_id || !amount) {
        return new Response(JSON.stringify({ error: "agreement_id and amount required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
          callbackURL: `${SUPABASE_URL}/functions/v1/bkash-tokenize?action=payment_callback`,
          agreementID: agreement_id,
          amount: String(amount),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: invoice_number || `PAY_${Date.now()}`,
        }),
      });

      const chargeData = await chargeRes.json();

      if (chargeData.bkashURL) {
        return new Response(JSON.stringify({ redirect_url: chargeData.bkashURL, paymentID: chargeData.paymentID }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "bKash charge failed", details: chargeData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("bKash tokenize error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
