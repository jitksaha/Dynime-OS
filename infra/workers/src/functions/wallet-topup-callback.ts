// Phase 5 — wallet-topup-callback ported to a Worker.
// Source: supabase/functions/wallet-topup-callback/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// SSLCommerz wallet top-up success/fail/IPN redirect (provider -> server, no user
// JWT -> SERVICE context). val_id validation, transaction completion, and balance
// credit preserved verbatim. SSLCommerz creds read from payment_gateway_configs.

import type { Env } from "../_shared/env";
import { connect, withSession, SERVICE } from "../_shared/db";

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    // Parallel: fetch gateway config + parse form data
    const [gwConfig, formData] = await Promise.all([
      withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT credentials, is_sandbox
          FROM public.payment_gateway_configs WHERE gateway_key = 'sslcommerz' LIMIT 1`;
        return rows[0] as any;
      }),
      req.formData(),
    ]);

    const creds = (gwConfig?.credentials || {}) as Record<string, string>;
    const STORE_ID = creds.store_id || "";
    const STORE_PASS = creds.store_password || "";

    const data: Record<string, string> = {};
    formData.forEach((value, key) => { data[key] = value.toString(); });

    const tranId = data.tran_id;
    const status = data.status;
    const valId = data.val_id;
    const walletId = data.value_b;
    const amount = parseFloat(data.value_c || "0");
    const siteUrl = data.value_d || "https://dynime.com";

    console.log(`Wallet top-up callback: status=${status}, tran_id=${tranId}, amount=${amount}`);

    if (status === "VALID" && valId) {
      const isSandbox = gwConfig?.is_sandbox ?? STORE_ID.toLowerCase().includes("test");
      const validationUrl = isSandbox
        ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
        : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

      const verifyRes = await fetch(
        `${validationUrl}?val_id=${valId}&store_id=${STORE_ID}&store_passwd=${STORE_PASS}&format=json`
      );

      let verification: any;
      const contentType = verifyRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        verification = await verifyRes.json();
      } else {
        const text = await verifyRes.text();
        try { verification = JSON.parse(text); } catch { verification = { status: "INVALID" }; }
      }

      if (verification.status === "VALID" || verification.status === "VALIDATED") {
        // Parallel: update transaction + fetch wallet balance
        const wallet = await withSession(sql, SERVICE, async (tx) => {
          const [, walletRows] = await Promise.all([
            tx`UPDATE public.company_wallet_transactions
               SET status = 'completed', description = 'Wallet top-up via SSLCommerz'
               WHERE reference_id = ${tranId} AND status = 'pending'`,
            tx`SELECT balance FROM public.company_wallets WHERE id = ${walletId} LIMIT 1`,
          ]);
          return (walletRows as any)[0] as any;
        });

        if (wallet) {
          await withSession(sql, SERVICE, (tx) =>
            tx`UPDATE public.company_wallets SET balance = ${Number(wallet.balance) + amount}
               WHERE id = ${walletId}`);
        }

        return new Response(null, {
          status: 302,
          headers: { Location: `${siteUrl}/wallet?topup=success&amount=${amount}` },
        });
      }
    }

    if (tranId) {
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.company_wallet_transactions
           SET status = 'failed', description = ${`Wallet top-up failed (${status || "unknown"})`}
           WHERE reference_id = ${tranId} AND status = 'pending'`);
    }

    const failStatus = status === "CANCELLED" ? "cancelled" : "failed";
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/wallet?topup=${failStatus}` },
    });
  } catch (err) {
    console.error("Wallet top-up callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "https://dynime.com/wallet?topup=error" },
    });
  }
}
