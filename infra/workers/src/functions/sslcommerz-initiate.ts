// Phase 5 — sslcommerz-initiate ported to a Worker.
// Source: supabase/functions/sslcommerz-initiate/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - user auth             -> contextFromRequest(req, env)
// Creates a pending tenant_subscription and a SSLCommerz hosted-checkout session.
// SSLCommerz creds read from payment_gateway_configs (DB-driven secrets).
//
// REVIEW: success/fail/cancel/ipn URLs now point at APP_URL/functions/v1 (the
// Workers functions gateway) instead of SUPABASE_URL/functions/v1.

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

    const { plan_id, billing_cycle } = bodyData;

    // Fetch gateway config, plan, and profile in parallel
    const [gwConfig, plan, profile] = await withSession(sql, SERVICE, async (tx) => {
      const [gwRows, planRows, profileRows] = await Promise.all([
        tx`SELECT credentials, is_sandbox, is_enabled FROM public.payment_gateway_configs
           WHERE gateway_key = 'sslcommerz' LIMIT 1`,
        tx`SELECT * FROM public.subscription_plans WHERE id = ${plan_id} LIMIT 1`,
        tx`SELECT tenant_id, full_name FROM public.profiles WHERE user_id = ${user.id} LIMIT 1`,
      ]);
      return [gwRows[0] as any, planRows[0] as any, profileRows[0] as any];
    });

    if (!gwConfig || !gwConfig.is_enabled) {
      return jsonResp({ error: "SSLCommerz gateway is not enabled. Contact Super Admin." }, 500);
    }

    const creds = gwConfig.credentials as Record<string, string>;
    const STORE_ID = creds.store_id;
    const STORE_PASS = creds.store_password;
    if (!STORE_ID || !STORE_PASS) {
      return jsonResp({ error: "SSLCommerz credentials not configured in admin panel" }, 500);
    }

    if (!plan) {
      return jsonResp({ error: "Plan not found" }, 404);
    }

    if (!profile?.tenant_id) {
      return jsonResp({ error: "No tenant found" }, 400);
    }

    const amount =
      billing_cycle === "yearly" ? plan.price_yearly :
      billing_cycle === "quarterly" ? plan.price_quarterly :
      plan.price_monthly;

    const tranId = `TXN_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const sslBaseUrl = gwConfig.is_sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    const siteUrl = req.headers.get("origin") || "https://dynime.com";

    const formData = new URLSearchParams({
      store_id: STORE_ID,
      store_passwd: STORE_PASS,
      total_amount: amount.toString(),
      currency: plan.currency || "BDT",
      tran_id: tranId,
      success_url: `${functionsUrl}/sslcommerz-callback`,
      fail_url: `${functionsUrl}/sslcommerz-callback`,
      cancel_url: `${functionsUrl}/sslcommerz-callback`,
      ipn_url: `${functionsUrl}/sslcommerz-callback`,
      cus_name: profile.full_name || "Customer",
      cus_email: user.email || "customer@example.com",
      cus_phone: "01700000000",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: `${plan.name} Plan - ${billing_cycle}`,
      product_category: "SaaS Subscription",
      product_profile: "non-physical-goods",
      value_a: profile.tenant_id,
      value_b: plan_id,
      value_c: billing_cycle,
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
        tx`INSERT INTO public.tenant_subscriptions ${tx({
          tenant_id: profile.tenant_id,
          plan_id,
          billing_cycle,
          amount,
          status: "pending",
          transaction_id: tranId,
          payment_method: "sslcommerz",
          current_period_start: new Date().toISOString(),
        } as any)}`),
    ]);

    const contentType = sslResponse.headers.get("content-type") || "";
    let result: any;
    if (contentType.includes("application/json")) {
      result = await sslResponse.json();
    } else {
      const text = await sslResponse.text();
      try {
        result = JSON.parse(text);
      } catch {
        console.error("SSLCommerz returned non-JSON:", text.substring(0, 500));
        return jsonResp({ error: "Payment gateway returned an invalid response" }, 502);
      }
    }

    if (result.status === "SUCCESS" && result.GatewayPageURL) {
      return jsonResp({ url: result.GatewayPageURL }, 200);
    } else {
      // Clean up pending subscription on failure
      await withSession(sql, SERVICE, (tx) =>
        tx`DELETE FROM public.tenant_subscriptions
           WHERE transaction_id = ${tranId} AND status = 'pending'`);

      console.error("SSLCommerz session failed:", JSON.stringify(result));
      return jsonResp({ error: result.failedreason || "Failed to create payment session" }, 400);
    }
  } catch (err: any) {
    console.error("Error:", err);
    return jsonResp({ error: err.message || "Internal server error" }, 500);
  }
}
