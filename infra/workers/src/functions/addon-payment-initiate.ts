// Phase 5 — addon-payment-initiate ported to a Worker.
// Source: supabase/functions/addon-payment-initiate/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - user auth             -> contextFromRequest(req, env)
// Validates active subscription + non-duplicate module, then opens a SSLCommerz
// hosted-checkout session and records a pending tenant_addon_module. SSLCommerz
// creds read from payment_gateway_configs (DB-driven secrets).
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

    // Parallel: parse body + authenticate
    const [bodyData, ctx] = await Promise.all([
      req.json() as any,
      contextFromRequest(req, env),
    ]);

    if (!ctx.userId || ctx.role === "anon") {
      return jsonResp({ error: "Invalid auth token" }, 401);
    }
    const user = { id: ctx.userId, email: ctx.email || "" };

    const { addon_id, payment_type, billing_cycle } = bodyData;

    // Parallel: fetch gateway config + addon + profile
    const [gwConfig, addon, profile] = await withSession(sql, SERVICE, async (tx) => {
      const [gwRows, addonRows, profileRows] = await Promise.all([
        tx`SELECT credentials, is_sandbox, is_enabled FROM public.payment_gateway_configs
           WHERE gateway_key = 'sslcommerz' LIMIT 1`,
        tx`SELECT * FROM public.module_addons WHERE id = ${addon_id} AND is_active = true LIMIT 1`,
        tx`SELECT tenant_id, full_name FROM public.profiles WHERE user_id = ${user.id} LIMIT 1`,
      ]);
      return [gwRows[0] as any, addonRows[0] as any, profileRows[0] as any];
    });

    if (!gwConfig || !gwConfig.is_enabled) {
      return jsonResp({ error: "SSLCommerz gateway is not enabled. Contact Super Admin." }, 500);
    }

    const gwCreds = gwConfig.credentials as Record<string, string>;
    const STORE_ID = gwCreds.store_id;
    const STORE_PASS = gwCreds.store_password;
    if (!STORE_ID || !STORE_PASS) {
      return jsonResp({ error: "SSLCommerz credentials not configured in admin panel" }, 500);
    }

    if (!addon) {
      return jsonResp({ error: "Add-on not found" }, 404);
    }

    if (!profile?.tenant_id) {
      return jsonResp({ error: "No tenant found" }, 400);
    }

    // Parallel: check active sub + check duplicate addon
    const [activeSub, existing] = await withSession(sql, SERVICE, async (tx) => {
      const [subRows, existingRows] = await Promise.all([
        tx`SELECT id FROM public.tenant_subscriptions
           WHERE tenant_id = ${profile.tenant_id} AND status = 'active' LIMIT 1`,
        tx`SELECT id, status FROM public.tenant_addon_modules
           WHERE tenant_id = ${profile.tenant_id} AND module_name = ${addon.module_name}
             AND status IN ${tx(["active", "pending"])} LIMIT 1`,
      ]);
      return [subRows[0] as any, existingRows[0] as any];
    });

    if (!activeSub) {
      return jsonResp({ error: "An active subscription is required to purchase add-ons" }, 400);
    }

    if (existing) {
      return jsonResp({ error: "You already have this module" }, 400);
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
    let result: any;
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      try { result = JSON.parse(text); } catch {
        console.error("SSLCommerz returned non-JSON:", text.substring(0, 500));
        return jsonResp({ error: "Payment gateway returned an invalid response" }, 502);
      }
    }

    if (result.status === "SUCCESS" && result.GatewayPageURL) {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.tenant_addon_modules ${tx({
          tenant_id: profile.tenant_id, module_name: addon.module_name,
          payment_type, billing_cycle: payment_type === "subscription" ? (billing_cycle || "monthly") : null,
          amount, status: "pending", transaction_id: tranId,
        } as any)}`);

      return jsonResp({ url: result.GatewayPageURL }, 200);
    } else {
      console.error("SSLCommerz session failed:", JSON.stringify(result));
      return jsonResp({ error: result.failedreason || "Failed to create payment session" }, 400);
    }
  } catch (err: any) {
    console.error("Error:", err);
    return jsonResp({ error: err.message || "Internal server error" }, 500);
  }
}
