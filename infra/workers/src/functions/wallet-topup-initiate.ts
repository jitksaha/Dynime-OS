// Phase 5 — wallet-topup-initiate ported to a Worker.
// Source: supabase/functions/wallet-topup-initiate/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - user auth             -> contextFromRequest(req, env)
// Opens a SSLCommerz hosted-checkout session for a company-wallet top-up and
// records a pending wallet transaction. SSLCommerz creds read from
// payment_gateway_configs (DB-driven secrets).
//
// REVIEW: callback URLs now point at APP_URL/functions/v1 (the Workers functions
// gateway) instead of SUPABASE_URL/functions/v1.

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
  const functionsUrl = `${(env as any).APP_URL}/functions/v1`;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    // Parse body and auth in parallel
    const [bodyData, ctx] = await Promise.all([
      req.json() as any,
      contextFromRequest(req, env),
    ]);

    if (!ctx.userId || ctx.role === "anon") {
      return jsonResp({ error: "Invalid auth token" }, 401);
    }
    const user = { id: ctx.userId, email: ctx.email || "" };

    const { amount, payment_method, wallet_id, tenant_id } = bodyData;

    if (!amount || amount <= 0) {
      return jsonResp({ error: "Invalid amount" }, 400);
    }

    // Fetch gateway config and profile in parallel
    const [gwConfig, profile] = await withSession(sql, SERVICE, async (tx) => {
      const [gwRows, profileRows] = await Promise.all([
        tx`SELECT credentials, is_sandbox, is_enabled FROM public.payment_gateway_configs
           WHERE gateway_key = 'sslcommerz' LIMIT 1`,
        tx`SELECT tenant_id, full_name FROM public.profiles WHERE user_id = ${user.id} LIMIT 1`,
      ]);
      return [gwRows[0] as any, profileRows[0] as any];
    });

    if (!gwConfig || !gwConfig.is_enabled) {
      return jsonResp({ error: "SSLCommerz gateway is not enabled. Contact Super Admin." }, 500);
    }

    const gwCreds = gwConfig.credentials as Record<string, string>;
    const STORE_ID = gwCreds.store_id;
    const STORE_PASS = gwCreds.store_password;
    if (!STORE_ID || !STORE_PASS) {
      return jsonResp({ error: "Payment gateway credentials not configured in admin panel" }, 500);
    }

    if (!profile?.tenant_id || profile.tenant_id !== tenant_id) {
      return jsonResp({ error: "Unauthorized tenant" }, 403);
    }

    const tranId = `TOPUP_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const sslBaseUrl = gwConfig.is_sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    const siteUrl = req.headers.get("origin") || "https://dynime.com";

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
      withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.company_wallet_transactions ${tx({
          wallet_id,
          tenant_id,
          transaction_type: "credit",
          amount,
          description: `Wallet top-up via ${payment_method} (pending)`,
          payment_method,
          status: "pending",
          reference_id: tranId,
        } as any)}`),
    ]);

    const contentType = sslResponse.headers.get("content-type") || "";
    let result: any;
    if (contentType.includes("application/json")) {
      result = await sslResponse.json();
    } else {
      const text = await sslResponse.text();
      try { result = JSON.parse(text); } catch {
        return jsonResp({ error: "Payment gateway returned an invalid response" }, 502);
      }
    }

    if (result.status === "SUCCESS" && result.GatewayPageURL) {
      return jsonResp({ url: result.GatewayPageURL, transaction_id: tranId }, 200);
    } else {
      await withSession(sql, SERVICE, (tx) =>
        tx`DELETE FROM public.company_wallet_transactions
           WHERE reference_id = ${tranId} AND status = 'pending'`);

      return jsonResp({ error: result.failedreason || "Failed to create payment session" }, 400);
    }
  } catch (err: any) {
    console.error("Error:", err);
    return jsonResp({ error: err.message || "Internal server error" }, 500);
  }
}
