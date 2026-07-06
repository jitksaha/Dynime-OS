import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parallel: fetch gateway config + parse form data
    const [gwConfigRes, formData] = await Promise.all([
      supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox")
        .eq("gateway_key", "sslcommerz")
        .single(),
      req.formData(),
    ]);

    const creds = (gwConfigRes.data?.credentials || {}) as Record<string, string>;
    const STORE_ID = creds.store_id || "";
    const STORE_PASS = creds.store_password || "";

    const data: Record<string, string> = {};
    formData.forEach((value, key) => { data[key] = value.toString(); });

    const tranId = data.tran_id;
    const status = data.status;
    const valId = data.val_id;
    const tenantId = data.value_a;
    const walletId = data.value_b;
    const amount = parseFloat(data.value_c || "0");
    const siteUrl = data.value_d || "https://dynime.com";

    console.log(`Wallet top-up callback: status=${status}, tran_id=${tranId}, amount=${amount}`);

    if (status === "VALID" && valId) {
      const isSandbox = gwConfigRes.data?.is_sandbox ?? STORE_ID.toLowerCase().includes("test");
      const validationUrl = isSandbox
        ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
        : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

      const verifyRes = await fetch(
        `${validationUrl}?val_id=${valId}&store_id=${STORE_ID}&store_passwd=${STORE_PASS}&format=json`
      );

      let verification;
      const contentType = verifyRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        verification = await verifyRes.json();
      } else {
        const text = await verifyRes.text();
        try { verification = JSON.parse(text); } catch { verification = { status: "INVALID" }; }
      }

      if (verification.status === "VALID" || verification.status === "VALIDATED") {
        // Parallel: update transaction + fetch wallet balance
        const [, { data: wallet }] = await Promise.all([
          supabase
            .from("company_wallet_transactions")
            .update({ status: "completed", description: `Wallet top-up via SSLCommerz` })
            .eq("reference_id", tranId)
            .eq("status", "pending"),
          supabase
            .from("company_wallets")
            .select("balance")
            .eq("id", walletId)
            .single(),
        ]);

        if (wallet) {
          await supabase
            .from("company_wallets")
            .update({ balance: Number(wallet.balance) + amount })
            .eq("id", walletId);
        }

        return new Response(null, {
          status: 302,
          headers: { Location: `${siteUrl}/wallet?topup=success&amount=${amount}` },
        });
      }
    }

    if (tranId) {
      await supabase
        .from("company_wallet_transactions")
        .update({ status: "failed", description: `Wallet top-up failed (${status || "unknown"})` })
        .eq("reference_id", tranId)
        .eq("status", "pending");
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
});
