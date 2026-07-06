// Phase 5 — stripe-checkout ported to a Worker.
// Source: supabase/functions/stripe-checkout/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE)
//   - user auth             -> contextFromRequest(req, env)
//   - Stripe creds          -> getPaymentGatewayConfig(sql, "stripe") (DB-driven secrets)
// Stripe checkout-session creation + amount/currency logic preserved verbatim.

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

    // Authenticate the caller (replaces anonClient.auth.getUser()).
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId || ctx.role === "anon") return J({ error: "Invalid auth token" }, 401);
    const user = { id: ctx.userId, email: ctx.email || "" };

    // Gateway config + body in parallel.
    const [bodyData, gwConfig] = await Promise.all([
      req.json() as Promise<any>,
      getPaymentGatewayConfig(sql, "stripe"),
    ]);

    if (!gwConfig || !(gwConfig as any).is_enabled) {
      return J({ error: "Stripe gateway is not enabled. Contact Super Admin." }, 500);
    }

    const rawCreds = (gwConfig as any).credentials as Record<string, any>;
    const creds: Record<string, string> = (rawCreds.sandbox || rawCreds.live)
      ? ((gwConfig as any).is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;
    const STRIPE_SECRET = creds.secret_key;

    if (!STRIPE_SECRET) {
      return J({ error: "Stripe secret key not configured in admin panel" }, 500);
    }

    const { amount, currency, product_name, description, success_url, cancel_url } = bodyData;

    if (!amount || amount <= 0) {
      return J({ error: "Invalid amount" }, 400);
    }

    // Fetch profile (needed for metadata) via service-role.
    const profileRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT tenant_id, full_name FROM public.profiles WHERE user_id = ${user.id} LIMIT 1`);
    const profile = profileRows[0] as { tenant_id?: string; full_name?: string } | undefined;

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": currency || "usd",
        "line_items[0][price_data][product_data][name]": product_name || "Payment",
        "line_items[0][price_data][product_data][description]": description || "",
        "line_items[0][price_data][unit_amount]": Math.round(amount * 100).toString(),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: success_url || `${req.headers.get("origin") || "https://dynime.com"}/dashboard?payment=success`,
        cancel_url: cancel_url || `${req.headers.get("origin") || "https://dynime.com"}/dashboard?payment=cancelled`,
        "metadata[user_id]": user.id,
        "metadata[tenant_id]": profile?.tenant_id || "",
        customer_email: user.email || "",
      }),
    });

    const session = await stripeRes.json() as any;

    if (session.error) {
      console.error("Stripe error:", JSON.stringify(session.error));
      return J({ error: session.error.message || "Failed to create Stripe checkout session" }, 400);
    }

    return J({ url: session.url, session_id: session.id }, 200);
  } catch (err: any) {
    console.error("Error:", err);
    return J({ error: err.message || "Internal server error" }, 500);
  }
}
