// Phase 5 — addon-payment-callback ported to a Worker.
// Source: supabase/functions/addon-payment-callback/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// SSLCommerz addon success/fail/IPN redirect (provider -> server, no user JWT ->
// SERVICE context). val_id validation, addon activation, and module provisioning
// preserved verbatim. SSLCommerz creds read from payment_gateway_configs.

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
    const tenantId = data.value_a;
    const moduleName = data.value_b;
    const siteUrl = data.value_d || "https://dynime.com";

    console.log(`Addon callback: status=${status}, tran_id=${tranId}, module=${moduleName}`);

    if (status === "VALID" && valId) {
      const isSandbox = gwConfig?.is_sandbox ?? STORE_ID.toLowerCase().includes("test");
      const validationUrl = isSandbox
        ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
        : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`;

      const verifyRes = await fetch(
        `${validationUrl}?val_id=${valId}&store_id=${STORE_ID}&store_passwd=${STORE_PASS}&format=json`
      );

      const contentType = verifyRes.headers.get("content-type") || "";
      let verification: any;
      if (contentType.includes("application/json")) {
        verification = await verifyRes.json();
      } else {
        const text = await verifyRes.text();
        try { verification = JSON.parse(text); } catch {
          console.error("Verification returned non-JSON:", text.substring(0, 500));
          verification = { status: "INVALID" };
        }
      }

      if (verification.status === "VALID" || verification.status === "VALIDATED") {
        // Parallel: activate addon + check existing module
        const existingModule = await withSession(sql, SERVICE, async (tx) => {
          const [, moduleRows] = await Promise.all([
            tx`UPDATE public.tenant_addon_modules SET
                 status = 'active', transaction_id = ${tranId},
                 activated_at = ${new Date().toISOString()}
               WHERE transaction_id = ${tranId} AND status = 'pending'`,
            tx`SELECT id FROM public.tenant_modules
               WHERE tenant_id = ${tenantId} AND module_name = ${moduleName} LIMIT 1`,
          ]);
          return (moduleRows as any)[0] as any;
        });

        if (!existingModule) {
          await withSession(sql, SERVICE, (tx) =>
            tx`INSERT INTO public.tenant_modules ${tx({
              tenant_id: tenantId, module_name: moduleName, is_enabled: true,
            } as any)}`);
        } else {
          await withSession(sql, SERVICE, (tx) =>
            tx`UPDATE public.tenant_modules SET is_enabled = true WHERE id = ${existingModule.id}`);
        }

        return new Response(null, {
          status: 302,
          headers: { Location: `${siteUrl}/subscription?payment=success&addon=${moduleName}` },
        });
      }
    }

    if (tranId) {
      await withSession(sql, SERVICE, (tx) =>
        tx`DELETE FROM public.tenant_addon_modules
           WHERE transaction_id = ${tranId} AND status = 'pending'`);
    }

    const failStatus = status === "CANCELLED" ? "cancelled" : "failed";
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/subscription?payment=${failStatus}` },
    });
  } catch (err) {
    console.error("Addon callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "https://dynime.com/subscription?payment=error" },
    });
  }
}
