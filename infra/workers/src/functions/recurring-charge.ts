// Phase 5 — recurring-charge ported to a Worker.
// Source: supabase/functions/recurring-charge/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// This is also a cron target; only the HTTP handler is ported here — the cron
// wiring (scheduled() / wrangler triggers) is configured separately.
//
// No user JWT is involved (cron/server-initiated): all DB access uses SERVICE
// context. Gateway charge logic, HMAC/credentials handling, retry/suspend logic,
// next-charge-date math, and notification dispatch are preserved verbatim.
//
// Sibling edge-function calls (bkash-tokenize, sms-send, send-custom-email) are
// dispatched through the functions gateway at ${APP_URL}/functions/v1/<name>
// with the service-role token, replacing the old ${SUPABASE_URL}/functions/v1.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getPaymentGatewayConfig } from "../_shared/secrets";

type Sql = ReturnType<typeof connect>;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  // Base URL + token for sibling function dispatch (replaces SUPABASE_URL/SERVICE_KEY).
  const functionsBase = `${(env as any).APP_URL}/functions/v1`;
  const serviceKey = (env as any).SERVICE_ROLE_TOKEN; // Worker secret

  try {
    const today = new Date().toISOString().split("T")[0];

    // Supabase nested select saved_payment_methods!saved_method_id(*) -> LEFT JOIN + row_to_json.
    const dueSchedules = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT s.*, row_to_json(m) AS saved_payment_methods
         FROM public.recurring_payment_schedules s
         LEFT JOIN public.saved_payment_methods m ON m.id = s.saved_method_id
         WHERE s.status = 'active' AND s.next_charge_date <= ${today}
         ORDER BY s.next_charge_date`) as unknown as any[];

    if (!dueSchedules || dueSchedules.length === 0) {
      return json({ message: "No recurring charges due", processed: 0 });
    }

    const results: any[] = [];

    for (const schedule of dueSchedules) {
      const savedMethod = schedule.saved_payment_methods;
      if (!savedMethod || !savedMethod.is_active) {
        await logAndRetry(sql, schedule, "unknown", "No active saved payment method");
        results.push({ schedule_id: schedule.id, status: "failed", reason: "no_method" });
        continue;
      }

      const chargeResult = await chargeGateway(sql, schedule, savedMethod, functionsBase, serviceKey);

      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.recurring_payment_logs ${tx({
          schedule_id: schedule.id,
          user_id: schedule.user_id,
          tenant_id: schedule.tenant_id,
          gateway_key: savedMethod.gateway_key,
          amount: schedule.amount,
          status: chargeResult.success ? "success" : "failed",
          transaction_id: chargeResult.transaction_id || null,
          failure_reason: chargeResult.error || null,
        } as any)}`);

      if (chargeResult.success) {
        const nextDate = calcNextDate(schedule.next_charge_date, schedule.billing_cycle);
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.recurring_payment_schedules SET
               next_charge_date = ${nextDate},
               last_charged_at = ${new Date().toISOString()},
               retry_count = 0,
               failure_reason = ${null}
             WHERE id = ${schedule.id}`);

        // If this is a subscription schedule, also extend the subscription period.
        if (schedule.schedule_type === "subscription" && schedule.reference_id) {
          await extendSubscription(sql, schedule.tenant_id, schedule.billing_cycle, nextDate);
        }

        await sendNotification(sql, functionsBase, serviceKey, schedule, "payment_success", {
          amount: `${schedule.currency} ${schedule.amount}`,
          reference: `REC_${schedule.id.slice(0, 8)}`,
          payment_method: savedMethod.display_name,
          date: today,
        });

        results.push({ schedule_id: schedule.id, status: "success", transaction_id: chargeResult.transaction_id });
      } else {
        await logAndRetry(sql, schedule, savedMethod.gateway_key, chargeResult.error || "Charge failed");

        await sendNotification(sql, functionsBase, serviceKey, schedule, "payment_failed", {
          amount: `${schedule.currency} ${schedule.amount}`,
          reference: `REC_${schedule.id.slice(0, 8)}`,
          reason: chargeResult.error || "Unknown",
        });

        results.push({ schedule_id: schedule.id, status: "failed", error: chargeResult.error });
      }
    }

    return json({ processed: results.length, results });
  } catch (err: any) {
    console.error("Recurring charge error:", err);
    return json({ error: err.message }, 500);
  }
}

// Extend tenant subscription period after successful recurring charge.
async function extendSubscription(sql: Sql, tenantId: string, _billingCycle: string, nextDate: string) {
  try {
    await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT id FROM public.tenant_subscriptions
        WHERE tenant_id = ${tenantId} AND status = 'active'
        ORDER BY created_at DESC LIMIT 1`;
      const activeSub = rows[0] as any;

      if (activeSub) {
        await tx`UPDATE public.tenant_subscriptions SET
            current_period_end = ${nextDate},
            updated_at = ${new Date().toISOString()}
          WHERE id = ${activeSub.id}`;
        console.log(`Extended subscription for tenant ${tenantId} to ${nextDate}`);
      }
    });
  } catch (e) {
    console.error("Failed to extend subscription:", e);
  }
}

// Gateway charge dispatcher.
async function chargeGateway(
  sql: Sql, schedule: any, savedMethod: any, functionsBase: string, serviceKey: string,
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  const gw = savedMethod.gateway_key;

  try {
    switch (gw) {
      case "bkash":
        return await chargeBkash(schedule, savedMethod, functionsBase, serviceKey);
      case "stripe":
        return await chargeStripe(sql, schedule, savedMethod);
      case "sslcommerz":
        return await chargeSSLCommerz(sql, schedule, savedMethod);
      case "dodo":
        return await chargeDodo(sql, schedule, savedMethod);
      case "paypal":
        return await chargePayPal(sql, schedule, savedMethod);
      default:
        return await chargeViaWallet(sql, schedule, savedMethod);
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// bKash tokenized charge — dispatched to the ported bkash-tokenize via the gateway.
// REVIEW: bkash-tokenize is not yet ported; this call returns 501 from the gateway
// until it is. Behaviour preserved otherwise.
async function chargeBkash(
  schedule: any, savedMethod: any, functionsBase: string, serviceKey: string,
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.agreement_id) return { success: false, error: "No bKash agreement ID" };

  const res = await fetch(`${functionsBase}/bkash-tokenize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      action: "charge_with_agreement",
      agreement_id: savedMethod.agreement_id,
      phone: savedMethod.phone_last4 ? `01X****${savedMethod.phone_last4}` : "",
      amount: schedule.amount,
      invoice_number: `REC_${schedule.id.slice(0, 8)}_${Date.now()}`,
    }),
  });
  const data = await res.json() as any;
  return data.paymentID
    ? { success: true, transaction_id: data.paymentID }
    : { success: false, error: data.error || "bKash charge failed" };
}

// Stripe off-session charge.
async function chargeStripe(
  sql: Sql, schedule: any, savedMethod: any,
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.token) return { success: false, error: "No Stripe payment method token" };

  const gwConfig = await getPaymentGatewayConfig(sql, "stripe");
  if (!gwConfig || !(gwConfig as any).credentials) return { success: false, error: "Stripe not configured" };

  const raw = (gwConfig as any).credentials as Record<string, any>;
  const creds = (raw.sandbox || raw.live)
    ? ((gwConfig as any).is_sandbox ? (raw.sandbox || {}) : (raw.live || {}))
    : raw;
  const stripeKey = creds.secret_key;
  if (!stripeKey) return { success: false, error: "Stripe secret key missing" };

  // Get or use customer ID from metadata.
  const customerId = (savedMethod.metadata as any)?.stripe_customer_id;
  if (!customerId) return { success: false, error: "No Stripe customer ID linked" };

  const params: Record<string, string> = {
    amount: String(Math.round(schedule.amount * 100)),
    currency: schedule.currency.toLowerCase(),
    customer: customerId,
    payment_method: savedMethod.token,
    confirm: "true",
    off_session: "true",
    "metadata[recurring_schedule_id]": schedule.id,
    "metadata[tenant_id]": schedule.tenant_id || "",
  };

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json() as any;
  return data.status === "succeeded"
    ? { success: true, transaction_id: data.id }
    : { success: false, error: data.error?.message || "Stripe charge failed" };
}

// SSLCommerz stored card charge.
async function chargeSSLCommerz(
  sql: Sql, schedule: any, savedMethod: any,
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.token) return { success: false, error: "No SSLCommerz stored token" };

  const gwConfig = await getPaymentGatewayConfig(sql, "sslcommerz");
  if (!gwConfig || !(gwConfig as any).credentials) return { success: false, error: "SSLCommerz not configured" };

  const rawCreds = (gwConfig as any).credentials as Record<string, any>;
  const sslCreds = (rawCreds.sandbox || rawCreds.live)
    ? ((gwConfig as any).is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
    : rawCreds;
  if (!sslCreds.store_id || !sslCreds.store_password) return { success: false, error: "SSLCommerz credentials missing" };

  const baseUrl = (gwConfig as any).is_sandbox
    ? "https://sandbox.sslcommerz.com"
    : "https://securepay.sslcommerz.com";

  const res = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      store_id: sslCreds.store_id,
      store_passwd: sslCreds.store_password,
      total_amount: String(schedule.amount),
      currency: schedule.currency,
      tran_id: `REC_${schedule.id.slice(0, 8)}_${Date.now()}`,
      cus_name: "Recurring",
      cus_email: "recurring@auto.pay",
      cus_phone: "N/A",
      product_category: "Subscription",
      product_name: "Recurring Payment",
      tokenized_payment: "YES",
      card_token: savedMethod.token,
    }),
  });
  const data = await res.json() as any;
  return data.status === "VALID" || data.status === "VALIDATED"
    ? { success: true, transaction_id: data.tran_id || data.bank_tran_id }
    : { success: false, error: data.failedreason || "SSLCommerz charge failed" };
}

// Dodo Payments recurring charge.
async function chargeDodo(
  sql: Sql, schedule: any, _savedMethod: any,
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  const gwConfig = await getPaymentGatewayConfig(sql, "dodo");
  if (!gwConfig || !(gwConfig as any).credentials) return { success: false, error: "Dodo Payments not configured" };

  const rawCreds = (gwConfig as any).credentials as Record<string, any>;
  const apiKey = rawCreds.api_key;
  if (!apiKey) return { success: false, error: "Dodo API key missing" };

  const baseUrl = (gwConfig as any).is_sandbox
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";

  try {
    // Create a one-time charge via Dodo.
    const payRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        billing: { city: "N/A", country: "US", state: "N/A", street: "N/A", zipcode: "00000" },
        customer: { email: "recurring@auto.pay", name: "Recurring Charge" },
        payment_link: false,
        metadata: {
          recurring_schedule_id: schedule.id,
          tenant_id: schedule.tenant_id,
        },
      }),
    });

    const payData = await payRes.json() as any;
    if (payRes.ok && (payData.payment_id || payData.id)) {
      return { success: true, transaction_id: payData.payment_id || payData.id };
    }
    return { success: false, error: payData.message || "Dodo charge failed" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// PayPal billing agreement charge.
async function chargePayPal(
  sql: Sql, schedule: any, savedMethod: any,
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.agreement_id) return { success: false, error: "No PayPal billing agreement" };

  const gwConfig = await getPaymentGatewayConfig(sql, "paypal");
  if (!gwConfig || !(gwConfig as any).credentials) return { success: false, error: "PayPal not configured" };

  const creds = (gwConfig as any).credentials as Record<string, any>;
  const env = (gwConfig as any).is_sandbox ? creds.sandbox : creds.live;
  if (!env?.client_id || !env?.secret) return { success: false, error: "PayPal credentials missing" };

  const baseUrl = (gwConfig as any).is_sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.client_id}:${env.secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenData = await tokenRes.json() as any;
  if (!tokenData.access_token) return { success: false, error: "PayPal auth failed" };

  const payRes = await fetch(`${baseUrl}/v1/payments/billing-agreements/${savedMethod.agreement_id}/bill-balance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note: `Recurring payment - ${schedule.id.slice(0, 8)}`,
      amount: { value: String(schedule.amount), currency: schedule.currency },
    }),
  });

  return payRes.ok
    ? { success: true, transaction_id: `PP_${Date.now()}` }
    : { success: false, error: "PayPal billing agreement charge failed" };
}

// Wallet-based fallback charge.
async function chargeViaWallet(
  sql: Sql, schedule: any, _savedMethod: any,
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!schedule.tenant_id) return { success: false, error: "No tenant for wallet charge" };

  return await withSession(sql, SERVICE, async (tx) => {
    const walletRows = await tx`SELECT id, balance FROM public.company_wallets
      WHERE tenant_id = ${schedule.tenant_id} LIMIT 1`;
    const wallet = walletRows[0] as any;

    if (!wallet || wallet.balance < schedule.amount) {
      return { success: false, error: `Insufficient wallet balance (need ${schedule.amount}, have ${wallet?.balance || 0})` };
    }

    try {
      await tx`UPDATE public.company_wallets SET balance = ${wallet.balance - schedule.amount} WHERE id = ${wallet.id}`;
    } catch {
      return { success: false, error: "Wallet deduction failed" };
    }

    await tx`INSERT INTO public.company_wallet_transactions ${tx({
      wallet_id: wallet.id,
      tenant_id: schedule.tenant_id,
      transaction_type: "debit",
      amount: -schedule.amount,
      description: `Recurring payment - ${schedule.id.slice(0, 8)}`,
      payment_method: "wallet",
      status: "completed",
    } as any)}`;

    return { success: true, transaction_id: `WALLET_${Date.now()}` };
  });
}

// Retry/suspend logic.
async function logAndRetry(sql: Sql, schedule: any, _gatewayKey: string, reason: string) {
  const newRetry = schedule.retry_count + 1;
  if (newRetry >= schedule.max_retries) {
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE public.recurring_payment_schedules SET
           status = 'suspended',
           retry_count = ${newRetry},
           failure_reason = ${reason}
         WHERE id = ${schedule.id}`);
  } else {
    const retryDate = new Date();
    retryDate.setDate(retryDate.getDate() + 2);
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE public.recurring_payment_schedules SET
           retry_count = ${newRetry},
           next_charge_date = ${retryDate.toISOString().split("T")[0]},
           failure_reason = ${reason}
         WHERE id = ${schedule.id}`);
  }
}

function calcNextDate(currentDate: string, cycle: string): string {
  const d = new Date(currentDate);
  switch (cycle) {
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split("T")[0];
}

// Send notification (SMS + Email) via sibling functions through the gateway.
async function sendNotification(
  sql: Sql, functionsBase: string, serviceKey: string,
  schedule: any, eventKey: string, variables: Record<string, string>,
) {
  try {
    const pref = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT * FROM public.tenant_notification_preferences
        WHERE tenant_id = ${schedule.tenant_id} AND event_key = ${eventKey} LIMIT 1`;
      return rows[0] as any;
    });
    if (!pref) return;

    const eventType = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT * FROM public.notification_event_types
        WHERE event_key = ${eventKey} LIMIT 1`;
      return rows[0] as any;
    });
    if (!eventType) return;

    const resolveTemplate = (tpl: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v), tpl);

    if (pref.sms_enabled && pref.sms_gateway_key) {
      const profile = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT phone FROM public.profiles WHERE user_id = ${schedule.user_id} LIMIT 1`;
        return rows[0] as any;
      });

      if (profile?.phone) {
        const smsMsg = resolveTemplate(pref.custom_sms_template || eventType.default_sms_template || "", variables);
        await fetch(`${functionsBase}/sms-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            gateway_key: pref.sms_gateway_key,
            phone: profile.phone,
            message: smsMsg,
            tenant_id: schedule.tenant_id,
            event_key: eventKey,
          }),
        });
      }
    }

    if (pref.email_enabled) {
      // REVIEW: original used supabase.auth.admin.getUserById; resolve the user's
      // email from auth.users directly (service-role) since there is no admin API.
      const email = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT email FROM auth.users WHERE id = ${schedule.user_id} LIMIT 1`;
        return (rows[0] as any)?.email as string | undefined;
      });
      if (email) {
        const subject = resolveTemplate(pref.custom_email_subject || eventType.default_email_subject || "", variables);
        const body = resolveTemplate(pref.custom_email_body || eventType.default_email_body || "", variables);
        await fetch(`${functionsBase}/send-custom-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ to: email, subject, html: body }),
        });
      }
    }
  } catch (e) {
    console.error("Notification send error:", e);
  }
}
