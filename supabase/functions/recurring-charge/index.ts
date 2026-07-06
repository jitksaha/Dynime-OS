import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const today = new Date().toISOString().split("T")[0];

    const { data: dueSchedules, error } = await supabase
      .from("recurring_payment_schedules")
      .select("*, saved_payment_methods!saved_method_id(*)")
      .eq("status", "active")
      .lte("next_charge_date", today)
      .order("next_charge_date");

    if (error) throw error;
    if (!dueSchedules || dueSchedules.length === 0) {
      return json({ message: "No recurring charges due", processed: 0 });
    }

    const results: any[] = [];

    for (const schedule of dueSchedules) {
      const savedMethod = schedule.saved_payment_methods;
      if (!savedMethod || !savedMethod.is_active) {
        await logAndRetry(supabase, schedule, "unknown", "No active saved payment method");
        results.push({ schedule_id: schedule.id, status: "failed", reason: "no_method" });
        continue;
      }

      const chargeResult = await chargeGateway(supabase, SUPABASE_URL, SUPABASE_SERVICE_KEY, schedule, savedMethod);

      await supabase.from("recurring_payment_logs").insert({
        schedule_id: schedule.id,
        user_id: schedule.user_id,
        tenant_id: schedule.tenant_id,
        gateway_key: savedMethod.gateway_key,
        amount: schedule.amount,
        status: chargeResult.success ? "success" : "failed",
        transaction_id: chargeResult.transaction_id || null,
        failure_reason: chargeResult.error || null,
      });

      if (chargeResult.success) {
        const nextDate = calcNextDate(schedule.next_charge_date, schedule.billing_cycle);
        await supabase.from("recurring_payment_schedules").update({
          next_charge_date: nextDate,
          last_charged_at: new Date().toISOString(),
          retry_count: 0,
          failure_reason: null,
        }).eq("id", schedule.id);

        // If this is a subscription schedule, also extend the subscription period
        if (schedule.schedule_type === "subscription" && schedule.reference_id) {
          await extendSubscription(supabase, schedule.tenant_id, schedule.billing_cycle, nextDate);
        }

        await sendNotification(supabase, SUPABASE_URL, SUPABASE_SERVICE_KEY, schedule, "payment_success", {
          amount: `${schedule.currency} ${schedule.amount}`,
          reference: `REC_${schedule.id.slice(0, 8)}`,
          payment_method: savedMethod.display_name,
          date: today,
        });

        results.push({ schedule_id: schedule.id, status: "success", transaction_id: chargeResult.transaction_id });
      } else {
        await logAndRetry(supabase, schedule, savedMethod.gateway_key, chargeResult.error || "Charge failed");

        await sendNotification(supabase, SUPABASE_URL, SUPABASE_SERVICE_KEY, schedule, "payment_failed", {
          amount: `${schedule.currency} ${schedule.amount}`,
          reference: `REC_${schedule.id.slice(0, 8)}`,
          reason: chargeResult.error || "Unknown",
        });

        results.push({ schedule_id: schedule.id, status: "failed", error: chargeResult.error });
      }
    }

    return json({ processed: results.length, results });
  } catch (err) {
    console.error("Recurring charge error:", err);
    return json({ error: err.message }, 500);
  }
});

// Extend tenant subscription period after successful recurring charge
async function extendSubscription(supabase: any, tenantId: string, billingCycle: string, nextDate: string) {
  try {
    const { data: activeSub } = await supabase
      .from("tenant_subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSub) {
      await supabase.from("tenant_subscriptions").update({
        current_period_end: nextDate,
        updated_at: new Date().toISOString(),
      }).eq("id", activeSub.id);
      console.log(`Extended subscription for tenant ${tenantId} to ${nextDate}`);
    }
  } catch (e) {
    console.error("Failed to extend subscription:", e);
  }
}

// Gateway charge dispatcher
async function chargeGateway(
  supabase: any, supabaseUrl: string, serviceKey: string,
  schedule: any, savedMethod: any
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  const gw = savedMethod.gateway_key;

  try {
    switch (gw) {
      case "bkash":
        return await chargeBkash(supabaseUrl, serviceKey, schedule, savedMethod);
      case "stripe":
        return await chargeStripe(supabase, schedule, savedMethod);
      case "sslcommerz":
        return await chargeSSLCommerz(supabase, schedule, savedMethod);
      case "dodo":
        return await chargeDodo(supabase, schedule, savedMethod);
      case "paypal":
        return await chargePayPal(supabase, schedule, savedMethod);
      default:
        return await chargeViaWallet(supabase, schedule, savedMethod);
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// bKash tokenized charge
async function chargeBkash(
  supabaseUrl: string, serviceKey: string, schedule: any, savedMethod: any
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.agreement_id) return { success: false, error: "No bKash agreement ID" };

  const res = await fetch(`${supabaseUrl}/functions/v1/bkash-tokenize`, {
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
  const data = await res.json();
  return data.paymentID
    ? { success: true, transaction_id: data.paymentID }
    : { success: false, error: data.error || "bKash charge failed" };
}

// Stripe off-session charge
async function chargeStripe(
  supabase: any, schedule: any, savedMethod: any
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.token) return { success: false, error: "No Stripe payment method token" };

  const { data: gwConfig } = await supabase
    .from("payment_gateway_configs")
    .select("credentials, is_sandbox")
    .eq("gateway_key", "stripe")
    .single();

  if (!gwConfig?.credentials) return { success: false, error: "Stripe not configured" };

  const raw = gwConfig.credentials as Record<string, any>;
  const creds = (raw.sandbox || raw.live)
    ? (gwConfig.is_sandbox ? (raw.sandbox || {}) : (raw.live || {}))
    : raw;
  const stripeKey = creds.secret_key;
  if (!stripeKey) return { success: false, error: "Stripe secret key missing" };

  // Get or use customer ID from metadata
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
  const data = await res.json();
  return data.status === "succeeded"
    ? { success: true, transaction_id: data.id }
    : { success: false, error: data.error?.message || "Stripe charge failed" };
}

// SSLCommerz stored card charge
async function chargeSSLCommerz(
  supabase: any, schedule: any, savedMethod: any
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.token) return { success: false, error: "No SSLCommerz stored token" };

  const { data: gwConfig } = await supabase
    .from("payment_gateway_configs")
    .select("credentials, is_sandbox")
    .eq("gateway_key", "sslcommerz")
    .single();

  if (!gwConfig?.credentials) return { success: false, error: "SSLCommerz not configured" };

  const rawCreds = gwConfig.credentials as Record<string, any>;
  const sslCreds = (rawCreds.sandbox || rawCreds.live)
    ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
    : rawCreds;
  if (!sslCreds.store_id || !sslCreds.store_password) return { success: false, error: "SSLCommerz credentials missing" };

  const baseUrl = gwConfig.is_sandbox
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
  const data = await res.json();
  return data.status === "VALID" || data.status === "VALIDATED"
    ? { success: true, transaction_id: data.tran_id || data.bank_tran_id }
    : { success: false, error: data.failedreason || "SSLCommerz charge failed" };
}

// Dodo Payments recurring charge
async function chargeDodo(
  supabase: any, schedule: any, _savedMethod: any
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  const { data: gwConfig } = await supabase
    .from("payment_gateway_configs")
    .select("credentials, is_sandbox")
    .eq("gateway_key", "dodo")
    .single();

  if (!gwConfig?.credentials) return { success: false, error: "Dodo Payments not configured" };

  const rawCreds = gwConfig.credentials as Record<string, any>;
  const apiKey = rawCreds.api_key;
  if (!apiKey) return { success: false, error: "Dodo API key missing" };

  const baseUrl = gwConfig.is_sandbox
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";

  try {
    // Create a one-time charge via Dodo
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

    const payData = await payRes.json();
    if (payRes.ok && (payData.payment_id || payData.id)) {
      return { success: true, transaction_id: payData.payment_id || payData.id };
    }
    return { success: false, error: payData.message || "Dodo charge failed" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// PayPal billing agreement charge
async function chargePayPal(
  supabase: any, schedule: any, savedMethod: any
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!savedMethod.agreement_id) return { success: false, error: "No PayPal billing agreement" };

  const { data: gwConfig } = await supabase
    .from("payment_gateway_configs")
    .select("credentials, is_sandbox")
    .eq("gateway_key", "paypal")
    .single();

  if (!gwConfig?.credentials) return { success: false, error: "PayPal not configured" };

  const creds = gwConfig.credentials as Record<string, any>;
  const env = gwConfig.is_sandbox ? creds.sandbox : creds.live;
  if (!env?.client_id || !env?.secret) return { success: false, error: "PayPal credentials missing" };

  const baseUrl = gwConfig.is_sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.client_id}:${env.secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenData = await tokenRes.json();
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

// Wallet-based fallback charge
async function chargeViaWallet(
  supabase: any, schedule: any, _savedMethod: any
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  if (!schedule.tenant_id) return { success: false, error: "No tenant for wallet charge" };

  const { data: wallet } = await supabase
    .from("company_wallets")
    .select("id, balance")
    .eq("tenant_id", schedule.tenant_id)
    .single();

  if (!wallet || wallet.balance < schedule.amount) {
    return { success: false, error: `Insufficient wallet balance (need ${schedule.amount}, have ${wallet?.balance || 0})` };
  }

  const { error: updateErr } = await supabase
    .from("company_wallets")
    .update({ balance: wallet.balance - schedule.amount })
    .eq("id", wallet.id);

  if (updateErr) return { success: false, error: "Wallet deduction failed" };

  await supabase.from("company_wallet_transactions").insert({
    wallet_id: wallet.id,
    tenant_id: schedule.tenant_id,
    transaction_type: "debit",
    amount: -schedule.amount,
    description: `Recurring payment - ${schedule.id.slice(0, 8)}`,
    payment_method: "wallet",
    status: "completed",
  });

  return { success: true, transaction_id: `WALLET_${Date.now()}` };
}

// Retry/suspend logic
async function logAndRetry(supabase: any, schedule: any, _gatewayKey: string, reason: string) {
  const newRetry = schedule.retry_count + 1;
  if (newRetry >= schedule.max_retries) {
    await supabase.from("recurring_payment_schedules").update({
      status: "suspended",
      retry_count: newRetry,
      failure_reason: reason,
    }).eq("id", schedule.id);
  } else {
    const retryDate = new Date();
    retryDate.setDate(retryDate.getDate() + 2);
    await supabase.from("recurring_payment_schedules").update({
      retry_count: newRetry,
      next_charge_date: retryDate.toISOString().split("T")[0],
      failure_reason: reason,
    }).eq("id", schedule.id);
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

// Send notification (SMS + Email)
async function sendNotification(
  supabase: any, supabaseUrl: string, serviceKey: string,
  schedule: any, eventKey: string, variables: Record<string, string>
) {
  try {
    const { data: pref } = await supabase
      .from("tenant_notification_preferences")
      .select("*")
      .eq("tenant_id", schedule.tenant_id)
      .eq("event_key", eventKey)
      .single();

    if (!pref) return;

    const { data: eventType } = await supabase
      .from("notification_event_types")
      .select("*")
      .eq("event_key", eventKey)
      .single();

    if (!eventType) return;

    const resolveTemplate = (tpl: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v), tpl);

    if (pref.sms_enabled && pref.sms_gateway_key) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", schedule.user_id)
        .single();

      if (profile?.phone) {
        const smsMsg = resolveTemplate(pref.custom_sms_template || eventType.default_sms_template || "", variables);
        await fetch(`${supabaseUrl}/functions/v1/sms-send`, {
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
      const { data: authUser } = await supabase.auth.admin.getUserById(schedule.user_id);
      const email = authUser?.user?.email;
      if (email) {
        const subject = resolveTemplate(pref.custom_email_subject || eventType.default_email_subject || "", variables);
        const body = resolveTemplate(pref.custom_email_body || eventType.default_email_body || "", variables);
        await fetch(`${supabaseUrl}/functions/v1/send-custom-email`, {
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

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
