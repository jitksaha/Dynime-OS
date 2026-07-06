// Phase 5 — payment-verify ported to a Worker.
// Source: supabase/functions/payment-verify/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - user auth             -> contextFromRequest(req, env)
//   - Stripe creds          -> getPaymentGatewayConfig(sql, "stripe") (DB-driven secrets)
// Subscription/addon activation, Stripe payment verification, saved-method capture,
// and recurring-schedule creation preserved verbatim. Supabase nested select
// (plan:plan_id(...)) is expressed as a LEFT JOIN with json_build_object.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { getPaymentGatewayConfig } from "../_shared/secrets";

type Sql = ReturnType<typeof connect>;

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "Unauthorized" }, 401);

    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId || ctx.role === "anon") return jsonResp({ error: "Invalid auth token" }, 401);
    const user = { id: ctx.userId, email: ctx.email || "" };

    const bodyData = await req.json() as any;

    const profileRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT tenant_id FROM public.profiles WHERE user_id = ${user.id} LIMIT 1`);
    const profile = profileRows[0] as { tenant_id?: string } | undefined;

    if (!profile?.tenant_id) {
      return jsonResp({ error: "No tenant" }, 400);
    }

    const tenantId = profile.tenant_id;
    const { purpose, transaction_id } = bodyData;

    console.log(`payment-verify: purpose=${purpose}, txn=${transaction_id}, tenant=${tenantId}`);

    // Helper: get Stripe secret key (DB-driven secrets).
    async function getStripeKey(): Promise<string | null> {
      const gwConfig = await getPaymentGatewayConfig(sql, "stripe");
      if (!gwConfig || !(gwConfig as any).credentials) return null;
      const raw = (gwConfig as any).credentials as Record<string, any>;
      const creds = (raw.sandbox || raw.live)
        ? ((gwConfig as any).is_sandbox ? (raw.sandbox || {}) : (raw.live || {}))
        : raw;
      return creds.secret_key || null;
    }

    // Helper: verify Stripe payment status and extract payment method.
    async function verifyStripePayment(txnId: string): Promise<{ paid: boolean; paymentMethodId?: string; customerId?: string; stripeSubscriptionId?: string }> {
      const secretKey = await getStripeKey();
      if (!secretKey) return { paid: false };

      if (txnId.startsWith("cs_")) {
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${txnId}?expand[]=payment_intent&expand[]=subscription`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const session = await res.json() as any;
        console.log(`Stripe checkout session: payment_status=${session.payment_status}, mode=${session.mode}`);

        const paid = session.payment_status === "paid";
        const paymentMethodId = session.payment_intent?.payment_method || null;
        const customerId = session.customer || null;
        const stripeSubscriptionId = session.subscription?.id || session.subscription || null;

        return { paid, paymentMethodId, customerId, stripeSubscriptionId };
      } else if (txnId.startsWith("pi_")) {
        const res = await fetch(`https://api.stripe.com/v1/payment_intents/${txnId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const pi = await res.json() as any;
        return {
          paid: pi.status === "succeeded",
          paymentMethodId: pi.payment_method,
          customerId: pi.customer,
        };
      }
      return { paid: false };
    }

    // Helper: save Stripe payment method for future recurring charges.
    async function saveStripePaymentMethod(paymentMethodId: string, customerId: string | null) {
      try {
        const secretKey = await getStripeKey();
        if (!secretKey || !paymentMethodId) return;

        // Fetch payment method details from Stripe.
        const pmRes = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentMethodId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const pm = await pmRes.json() as any;

        await withSession(sql, SERVICE, async (tx) => {
          // Check if already saved.
          const existing = await tx`SELECT id FROM public.saved_payment_methods
            WHERE user_id = ${user.id} AND gateway_key = 'stripe' AND token = ${paymentMethodId}
            LIMIT 1`;
          if (existing[0]) return; // Already saved.

          const cardBrand = pm.card?.brand || null;
          const cardLast4 = pm.card?.last4 || null;
          const methodLabel = cardBrand
            ? `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} ····${cardLast4}`
            : "Card";

          // Check if first method.
          const countRows = await tx`SELECT COUNT(*)::int AS count FROM public.saved_payment_methods
            WHERE user_id = ${user.id} AND is_active = true`;
          const count = Number(countRows[0]?.count || 0);

          await tx`INSERT INTO public.saved_payment_methods ${tx({
            user_id: user.id,
            tenant_id: tenantId,
            gateway_key: "stripe",
            display_name: "Stripe Card",
            method_label: methodLabel,
            token: paymentMethodId,
            card_brand: cardBrand,
            card_last4: cardLast4,
            is_default: count === 0,
            metadata: { stripe_customer_id: customerId },
          } as any)}`;

          console.log(`Saved Stripe payment method: ${methodLabel} for user ${user.id}`);
        });
      } catch (e) {
        console.error("Failed to save Stripe payment method:", e);
      }
    }

    // Helper: create recurring payment schedule.
    async function createRecurringSchedule(
      savedMethodId: string | null,
      amount: number,
      currency: string,
      billingCycle: string,
      scheduleType: string,
      referenceId: string,
    ) {
      if (!savedMethodId || billingCycle === "lifetime") return;

      try {
        await withSession(sql, SERVICE, async (tx) => {
          // Check if schedule already exists for this reference.
          const existing = await tx`SELECT id FROM public.recurring_payment_schedules
            WHERE user_id = ${user.id} AND reference_id = ${referenceId} LIMIT 1`;
          if (existing[0]) return;

          const nextDate = new Date();
          switch (billingCycle) {
            case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
            case "quarterly": nextDate.setMonth(nextDate.getMonth() + 3); break;
            default: nextDate.setMonth(nextDate.getMonth() + 1); break;
          }

          await tx`INSERT INTO public.recurring_payment_schedules ${tx({
            user_id: user.id,
            tenant_id: tenantId,
            saved_method_id: savedMethodId,
            schedule_type: scheduleType,
            reference_id: referenceId,
            amount,
            currency,
            billing_cycle: billingCycle,
            next_charge_date: nextDate.toISOString().split("T")[0],
            status: "active",
          } as any)}`;

          console.log(`Created recurring schedule: ${billingCycle} ${amount} ${currency}`);
        });
      } catch (e) {
        console.error("Failed to create recurring schedule:", e);
      }
    }

    // ===== SUBSCRIPTION =====
    if (purpose === "subscription") {
      let pendingSub: any = null;

      const planJoin = (tx: any) => tx`
        json_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'modules', p.modules)`;

      if (transaction_id) {
        const rows = await withSession(sql, SERVICE, (tx) =>
          tx`SELECT s.*, ${planJoin(tx)} AS plan
             FROM public.tenant_subscriptions s
             LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
             WHERE s.tenant_id = ${tenantId} AND s.status = 'pending' AND s.transaction_id = ${transaction_id}
             LIMIT 1`);
        pendingSub = rows[0] || null;
      }

      if (!pendingSub) {
        const rows = await withSession(sql, SERVICE, (tx) =>
          tx`SELECT s.*, ${planJoin(tx)} AS plan
             FROM public.tenant_subscriptions s
             LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
             WHERE s.tenant_id = ${tenantId} AND s.status = 'pending'
             ORDER BY s.created_at DESC
             LIMIT 1`);
        pendingSub = rows[0] || null;
      }

      if (!pendingSub) {
        return jsonResp({ status: "no_pending", message: "No pending subscription found" });
      }

      const txnToVerify = pendingSub.transaction_id;

      // Stripe verification + save payment method.
      if (pendingSub.payment_method === "stripe" && txnToVerify) {
        const result = await verifyStripePayment(txnToVerify);
        if (!result.paid) {
          return jsonResp({ status: "not_paid", message: "Payment not completed yet" });
        }

        // Save payment method for future recurring charges.
        if (result.paymentMethodId) {
          await saveStripePaymentMethod(result.paymentMethodId, result.customerId || null);

          // Find the saved method ID for recurring schedule.
          const savedRows = await withSession(sql, SERVICE, (tx) =>
            tx`SELECT id FROM public.saved_payment_methods
               WHERE user_id = ${user.id} AND gateway_key = 'stripe' AND token = ${result.paymentMethodId!}
               LIMIT 1`);
          const savedMethod = savedRows[0] as any;

          if (savedMethod && pendingSub.billing_cycle !== "lifetime") {
            await createRecurringSchedule(
              savedMethod.id,
              Number(pendingSub.amount),
              "USD",
              pendingSub.billing_cycle,
              "subscription",
              pendingSub.id,
            );
          }
        }
      }

      if (pendingSub.payment_method === "sslcommerz") {
        return jsonResp({ status: "pending", message: "Payment verification pending from gateway" });
      }

      if (pendingSub.payment_method === "bkash") {
        return jsonResp({ status: "pending", message: "bKash payment verification pending" });
      }

      // Dodo: assume success if reaching verify (redirect-based).
      if (pendingSub.payment_method === "dodo") {
        console.log("Dodo payment assumed successful via redirect");
      }

      // Activate the subscription.
      const now = new Date();
      let periodEnd: Date;
      const bc = pendingSub.billing_cycle;
      if (bc === "yearly") periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      else if (bc === "quarterly") periodEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      else if (bc === "lifetime") periodEnd = new Date(2099, 11, 31);
      else periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      await withSession(sql, SERVICE, (tx) => Promise.all([
        tx`UPDATE public.tenant_subscriptions SET status = 'cancelled'
           WHERE tenant_id = ${tenantId} AND status = 'active'`,
        tx`UPDATE public.tenant_subscriptions SET status = 'expired'
           WHERE tenant_id = ${tenantId} AND status = 'pending' AND id != ${pendingSub.id}`,
        tx`UPDATE public.tenant_subscriptions SET
             status = 'active',
             current_period_start = ${now.toISOString()},
             current_period_end = ${periodEnd.toISOString()}
           WHERE id = ${pendingSub.id}`,
      ]));

      const plan = pendingSub.plan as any;
      if (plan) {
        const moduleRows = (plan.modules && plan.modules.length > 0)
          ? plan.modules.map((m: string) => ({ tenant_id: tenantId, module_name: m, is_enabled: true }))
          : [];

        await withSession(sql, SERVICE, async (tx) => {
          await Promise.all([
            tx`UPDATE public.tenants SET plan = ${plan.slug} WHERE id = ${tenantId}`,
            tx`DELETE FROM public.tenant_modules WHERE tenant_id = ${tenantId}`,
          ]);

          if (moduleRows.length > 0) {
            await tx`INSERT INTO public.tenant_modules ${tx(moduleRows as any)}`;
          }
        });
      }

      console.log(`Subscription activated: tenant=${tenantId}, plan=${plan?.slug}`);
      return jsonResp({ status: "activated", plan: plan?.slug, modules: plan?.modules || [] });
    }

    // ===== ADDON =====
    if (purpose === "addon") {
      let pendingAddon: any = null;

      if (transaction_id) {
        const rows = await withSession(sql, SERVICE, (tx) =>
          tx`SELECT * FROM public.tenant_addon_modules
             WHERE tenant_id = ${tenantId} AND status = 'pending' AND transaction_id = ${transaction_id}
             LIMIT 1`);
        pendingAddon = rows[0] || null;
      }

      if (!pendingAddon) {
        const rows = await withSession(sql, SERVICE, (tx) =>
          tx`SELECT * FROM public.tenant_addon_modules
             WHERE tenant_id = ${tenantId} AND status = 'pending'
             ORDER BY requested_at DESC
             LIMIT 1`);
        pendingAddon = rows[0] || null;
      }

      if (!pendingAddon) {
        return jsonResp({ status: "no_pending", message: "No pending addon found" });
      }

      // Stripe: verify + save method.
      if (pendingAddon.transaction_id?.startsWith("cs_") || pendingAddon.transaction_id?.startsWith("pi_")) {
        const result = await verifyStripePayment(pendingAddon.transaction_id);
        if (!result.paid) {
          return jsonResp({ status: "not_paid", message: "Payment not completed yet" });
        }
        if (result.paymentMethodId) {
          await saveStripePaymentMethod(result.paymentMethodId, result.customerId || null);
        }
      }

      const existingModule = await withSession(sql, SERVICE, async (tx) => {
        const [, moduleRows] = await Promise.all([
          tx`UPDATE public.tenant_addon_modules
             SET status = 'active', activated_at = ${new Date().toISOString()}
             WHERE id = ${pendingAddon.id}`,
          tx`SELECT id FROM public.tenant_modules
             WHERE tenant_id = ${tenantId} AND module_name = ${pendingAddon.module_name}
             LIMIT 1`,
        ]);
        return (moduleRows as any)[0] as { id?: string } | undefined;
      });

      if (!existingModule) {
        await withSession(sql, SERVICE, (tx) =>
          tx`INSERT INTO public.tenant_modules ${tx({
            tenant_id: tenantId, module_name: pendingAddon.module_name, is_enabled: true,
          } as any)}`);
      } else {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.tenant_modules SET is_enabled = true WHERE id = ${existingModule.id!}`);
      }

      console.log(`Addon activated: tenant=${tenantId}, module=${pendingAddon.module_name}`);
      return jsonResp({ status: "activated", module: pendingAddon.module_name });
    }

    return jsonResp({ error: "Invalid purpose" }, 400);
  } catch (err: any) {
    console.error("Payment verify error:", err);
    return jsonResp({ error: err.message || "Internal server error" }, 500);
  }
}
