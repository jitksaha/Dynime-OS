// Phase 5 — twocheckout-payment-callback ported to a Worker.
// Source: supabase/functions/twocheckout-payment-callback/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// 2Checkout IPN (provider -> server, no user JWT -> SERVICE context). The IPN HASH
// verification behaviour is preserved EXACTLY (source only logs presence; the
// complex 2Checkout HMAC is not recomputed). Subscription/addon/wallet activation
// and the <EPAYMENT> IPN response are preserved verbatim. 2Checkout creds read
// from payment_gateway_configs (DB-driven secrets).

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
    // 2Checkout sends IPN (Instant Payment Notification) as POST
    let body: Record<string, any>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    } else {
      body = await req.json() as any;
    }

    // Get 2Checkout credentials for HMAC verification
    const gwConfig = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT credentials, is_sandbox
        FROM public.payment_gateway_configs WHERE gateway_key = 'twocheckout' LIMIT 1`;
      return rows[0] as any;
    });

    if (!gwConfig) {
      console.error("2Checkout gateway config not found");
      return jsonResp({ error: "Gateway not configured" }, 500);
    }

    const rawCreds = gwConfig.credentials as Record<string, any>;
    const creds = (rawCreds.sandbox || rawCreds.live)
      ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;

    // Verify HMAC signature from 2Checkout IPN
    const ipnSecret = creds.ipn_secret || creds.secret_key;
    if (ipnSecret && body.HASH) {
      // 2Checkout IPN hash verification
      const hashFields = ["IPN_PID[]", "IPN_PNAME[]", "IPN_DATE", "DATE"];
      // Basic presence check — 2Checkout HMAC is complex, log for debugging
      console.log("2Checkout IPN received with HASH verification");
    }

    const refNo = body.REFNO || body.refno || body.order_ext_ref || body.REFNOEXT || "";
    const orderExtRef = body.REFNOEXT || body.order_ext_ref || "";
    const orderStatus = (body.ORDERSTATUS || body.order_status || "").toUpperCase();
    const messageType = body.MESSAGE_TYPE || body.message_type || "";

    console.log(`2Checkout IPN: refNo=${refNo}, extRef=${orderExtRef}, status=${orderStatus}, type=${messageType}`);

    // Only process completed orders
    const isComplete = orderStatus === "COMPLETE" || messageType === "ORDER_CREATED" || messageType === "INVOICE_STATUS_CHANGED";

    if (isComplete && orderExtRef) {
      // Look for the transaction in our pending records
      // Try subscription first
      const sub = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT id, tenant_id, plan_id, billing_cycle FROM public.tenant_subscriptions
          WHERE transaction_id = ${orderExtRef} AND status = 'pending' LIMIT 1`;
        return rows[0] as any;
      });

      if (sub) {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.tenant_subscriptions SET
               status = 'active',
               transaction_id = ${refNo || orderExtRef},
               current_period_start = ${new Date().toISOString()},
               current_period_end = ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
             WHERE id = ${sub.id}`);

        if (sub.plan_id) {
          const plan = await withSession(sql, SERVICE, async (tx) => {
            const rows = await tx`SELECT slug FROM public.subscription_plans WHERE id = ${sub.plan_id} LIMIT 1`;
            return rows[0] as any;
          });
          if (plan) {
            await withSession(sql, SERVICE, (tx) =>
              tx`UPDATE public.tenants SET plan = ${plan.slug} WHERE id = ${sub.tenant_id}`);
          }
        }

        console.log(`2Checkout subscription activated: ${sub.id}`);
      }

      // Try addon
      const addon = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT id FROM public.tenant_addon_modules
          WHERE transaction_id = ${orderExtRef} AND status = 'pending' LIMIT 1`;
        return rows[0] as any;
      });

      if (addon) {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.tenant_addon_modules SET status = 'active', transaction_id = ${refNo || orderExtRef}
             WHERE id = ${addon.id}`);
        console.log(`2Checkout addon activated: ${addon.id}`);
      }

      // Try wallet
      const walletTx = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT id, wallet_id, amount, tenant_id FROM public.company_wallet_transactions
          WHERE reference_id = ${orderExtRef} AND status = 'pending' LIMIT 1`;
        return rows[0] as any;
      });

      if (walletTx) {
        await withSession(sql, SERVICE, async (tx) => {
          await tx`UPDATE public.company_wallet_transactions
             SET status = 'completed', reference_id = ${refNo || orderExtRef}
             WHERE id = ${walletTx.id}`;

          const walletRows = await tx`SELECT balance FROM public.company_wallets WHERE id = ${walletTx.wallet_id} LIMIT 1`;
          const wallet = walletRows[0] as any;
          if (wallet) {
            await tx`UPDATE public.company_wallets SET balance = ${wallet.balance + walletTx.amount}
               WHERE id = ${walletTx.wallet_id}`;
          }
        });
        console.log(`2Checkout wallet top-up completed: ${walletTx.id}`);
      }
    }

    // 2Checkout expects a specific IPN response format
    const ipnResponse = `<EPAYMENT>${body.DATE || new Date().toISOString()}|${body.HASH || ""}</EPAYMENT>`;

    return new Response(ipnResponse, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    console.error("2Checkout callback error:", err);
    return jsonResp({ error: err.message }, 500);
  }
}
