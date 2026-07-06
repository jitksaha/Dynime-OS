// Phase 5 — sslcommerz-callback ported to a Worker.
// Source: supabase/functions/sslcommerz-callback/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// SSLCommerz success/fail/IPN redirect (provider -> server, no user JWT -> SERVICE
// context). val_id validation against the SSLCommerz validator, subscription
// activation, module provisioning, and saved-card + recurring-schedule creation
// are preserved verbatim. SSLCommerz creds read from payment_gateway_configs.

import type { Env } from "../_shared/env";
import { connect, withSession, SERVICE } from "../_shared/db";

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
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
    const planId = data.value_b;
    const billingCycle = data.value_c;
    const siteUrl = data.value_d || "https://dynime.com";

    console.log(`SSLCommerz callback: status=${status}, tran_id=${tranId}, val_id=${valId}`);

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
        const now = new Date();
        let periodEnd: Date;
        if (billingCycle === "yearly") {
          periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        } else if (billingCycle === "quarterly") {
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        } else if (billingCycle === "lifetime") {
          periodEnd = new Date(2099, 11, 31);
        } else {
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }

        // Get pending sub to find user_id
        const pendingSub = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT id, amount, billing_cycle FROM public.tenant_subscriptions
            WHERE transaction_id = ${tranId} AND status = 'pending' LIMIT 1`;
          return rows[0] as any;
        });

        // Parallel: cancel active subs + activate pending + fetch plan
        const plan = await withSession(sql, SERVICE, async (tx) => {
          const [, , planRows] = await Promise.all([
            tx`UPDATE public.tenant_subscriptions SET status = 'cancelled'
               WHERE tenant_id = ${tenantId} AND status = 'active'`,
            tx`UPDATE public.tenant_subscriptions SET
                 status = 'active', transaction_id = ${tranId},
                 current_period_end = ${periodEnd.toISOString()}
               WHERE transaction_id = ${tranId} AND status = 'pending'`,
            tx`SELECT slug, modules FROM public.subscription_plans WHERE id = ${planId} LIMIT 1`,
          ]);
          return (planRows as any)[0] as any;
        });

        if (plan) {
          await withSession(sql, SERVICE, async (tx) => {
            await Promise.all([
              tx`UPDATE public.tenants SET plan = ${plan.slug} WHERE id = ${tenantId}`,
              tx`DELETE FROM public.tenant_modules WHERE tenant_id = ${tenantId}`,
            ]);

            if (plan.modules && plan.modules.length > 0) {
              const moduleRows = plan.modules.map((m: string) => ({
                tenant_id: tenantId, module_name: m, is_enabled: true,
              }));
              await tx`INSERT INTO public.tenant_modules ${tx(moduleRows as any)}`;
            }
          });
        }

        // Save SSLCommerz card token for recurring charges if available
        const cardToken = verification.card_no || null;
        const cardBrand = verification.card_brand || verification.card_type || null;
        const cardLast4 = cardToken ? cardToken.slice(-4) : null;

        if (cardToken && billingCycle !== "lifetime") {
          try {
            // Find user from tenant profiles
            const tenantProfile = await withSession(sql, SERVICE, async (tx) => {
              const rows = await tx`SELECT user_id FROM public.profiles
                WHERE tenant_id = ${tenantId} AND is_owner = true LIMIT 1`;
              return rows[0] as any;
            });

            if (tenantProfile?.user_id) {
              // Check if this card is already saved
              const existingSaved = await withSession(sql, SERVICE, async (tx) => {
                const rows = await tx`SELECT id FROM public.saved_payment_methods
                  WHERE user_id = ${tenantProfile.user_id} AND gateway_key = 'sslcommerz'
                    AND card_last4 = ${cardLast4} LIMIT 1`;
                return rows[0] as any;
              });

              if (!existingSaved) {
                const newSaved = await withSession(sql, SERVICE, async (tx) => {
                  const countRows = await tx`SELECT COUNT(id)::int AS count FROM public.saved_payment_methods
                    WHERE user_id = ${tenantProfile.user_id} AND is_active = true`;
                  const count = Number((countRows[0] as any)?.count || 0);

                  const inserted = await tx`INSERT INTO public.saved_payment_methods ${tx({
                    user_id: tenantProfile.user_id,
                    tenant_id: tenantId,
                    gateway_key: "sslcommerz",
                    display_name: "SSLCommerz Card",
                    method_label: cardBrand ? `${cardBrand} ····${cardLast4}` : `Card ····${cardLast4}`,
                    token: cardToken,
                    card_brand: cardBrand,
                    card_last4: cardLast4,
                    is_default: count === 0,
                  } as any)} RETURNING id`;
                  return (inserted as any)[0] as any;
                });

                // Create recurring schedule
                if (newSaved && pendingSub) {
                  const nextDate = new Date();
                  switch (billingCycle) {
                    case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                    case "quarterly": nextDate.setMonth(nextDate.getMonth() + 3); break;
                    default: nextDate.setMonth(nextDate.getMonth() + 1); break;
                  }

                  await withSession(sql, SERVICE, (tx) =>
                    tx`INSERT INTO public.recurring_payment_schedules ${tx({
                      user_id: tenantProfile.user_id,
                      tenant_id: tenantId,
                      saved_method_id: newSaved.id,
                      schedule_type: "subscription",
                      reference_id: pendingSub.id,
                      amount: Number(pendingSub.amount),
                      currency: "BDT",
                      billing_cycle: billingCycle,
                      next_charge_date: nextDate.toISOString().split("T")[0],
                      status: "active",
                    } as any)}`);

                  console.log(`Auto-created recurring schedule for tenant ${tenantId}`);
                }
              }
            }
          } catch (e) {
            console.error("Failed to save SSLCommerz card/schedule:", e);
          }
        }

        return new Response(null, {
          status: 302,
          headers: { Location: `${siteUrl}/subscription?payment=success` },
        });
      }
    }

    if (tranId) {
      await withSession(sql, SERVICE, (tx) =>
        tx`DELETE FROM public.tenant_subscriptions
           WHERE transaction_id = ${tranId} AND status = 'pending'`);
    }

    const failStatus = status === "CANCELLED" ? "cancelled" : "failed";
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/subscription?payment=${failStatus}` },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "https://dynime.com/subscription?payment=error" },
    });
  }
}
