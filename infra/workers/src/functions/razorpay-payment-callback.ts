// Phase 5 — razorpay-payment-callback ported to a Worker.
// Source: supabase/functions/razorpay-payment-callback/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// Razorpay webhook (provider -> server, no user JWT -> SERVICE context). The HMAC
// (Web Crypto, SHA-256) webhook-signature verification is preserved EXACTLY.
// Subscription activation, addon activation, and wallet credit preserved verbatim.
// Razorpay creds read from payment_gateway_configs (DB-driven secrets).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const body = await req.json() as any;

    // Get Razorpay credentials for HMAC verification
    const gwConfig = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT credentials, is_sandbox
        FROM public.payment_gateway_configs WHERE gateway_key = 'razorpay' LIMIT 1`;
      return rows[0] as any;
    });

    if (!gwConfig) {
      console.error("Razorpay gateway config not found");
      return jsonResp({ error: "Gateway not configured" }, 500);
    }

    const rawCreds = gwConfig.credentials as Record<string, any>;
    const creds = (rawCreds.sandbox || rawCreds.live)
      ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;

    // Handle webhook events from Razorpay
    const event = body.event;

    if (event === "payment.captured" || event === "order.paid") {
      const payment = body.payload?.payment?.entity;
      if (!payment) {
        return jsonResp({ status: "no_payment_entity" }, 200);
      }

      // Verify webhook signature
      const webhookSecret = creds.webhook_secret;
      if (webhookSecret) {
        const receivedSig = req.headers.get("x-razorpay-signature");
        if (receivedSig) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw", encoder.encode(webhookSecret),
            { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
          );
          const rawBody = JSON.stringify(body);
          const computed = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
          const computedHex = Array.from(new Uint8Array(computed))
            .map(b => b.toString(16).padStart(2, "0")).join("");
          if (computedHex !== receivedSig) {
            console.error("Razorpay webhook signature mismatch");
            return jsonResp({ error: "Invalid signature" }, 401);
          }
        }
      }

      const orderId = payment.order_id;
      const notes = payment.notes || {};
      const purpose = notes.purpose;
      const tenantId = notes.tenant_id;

      console.log(`Razorpay payment captured: order=${orderId}, purpose=${purpose}, tenant=${tenantId}`);

      if (purpose === "subscription" && notes.plan_id) {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.tenant_subscriptions SET
               status = 'active',
               transaction_id = ${payment.id},
               current_period_start = ${new Date().toISOString()},
               current_period_end = ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
             WHERE transaction_id = ${orderId} AND status = 'pending'`);

        if (notes.plan_id) {
          const plan = await withSession(sql, SERVICE, async (tx) => {
            const rows = await tx`SELECT slug FROM public.subscription_plans WHERE id = ${notes.plan_id} LIMIT 1`;
            return rows[0] as any;
          });
          if (plan) {
            await withSession(sql, SERVICE, (tx) =>
              tx`UPDATE public.tenants SET plan = ${plan.slug} WHERE id = ${tenantId}`);
          }
        }
      } else if (purpose === "addon" && notes.module_name) {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.tenant_addon_modules SET status = 'active', transaction_id = ${payment.id}
             WHERE transaction_id = ${orderId} AND status = 'pending'`);
      } else if (purpose === "wallet_topup" && notes.wallet_id) {
        await withSession(sql, SERVICE, async (tx) => {
          await tx`UPDATE public.company_wallet_transactions SET status = 'completed', reference_id = ${payment.id}
             WHERE reference_id = ${orderId} AND status = 'pending'`;

          const rawAmount = parseFloat(notes.raw_amount || "0");
          if (rawAmount > 0) {
            // Increment balance via read-then-write (matches source behaviour).
            const walletRows = await tx`SELECT balance FROM public.company_wallets WHERE id = ${notes.wallet_id} LIMIT 1`;
            const wallet = walletRows[0] as any;
            if (wallet) {
              await tx`UPDATE public.company_wallets SET balance = ${wallet.balance + rawAmount} WHERE id = ${notes.wallet_id}`;
            }
          }
        });
      }

      return jsonResp({ status: "ok" }, 200);
    }

    // For payment.failed events
    if (event === "payment.failed") {
      const payment = body.payload?.payment?.entity;
      const orderId = payment?.order_id;
      console.log(`Razorpay payment failed: order=${orderId}`);

      if (orderId) {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.tenant_subscriptions SET status = 'failed'
             WHERE transaction_id = ${orderId} AND status = 'pending'`);
      }

      return jsonResp({ status: "noted" }, 200);
    }

    return jsonResp({ status: "ignored", event }, 200);
  } catch (err: any) {
    console.error("Razorpay callback error:", err);
    return jsonResp({ error: err.message }, 500);
  }
}
