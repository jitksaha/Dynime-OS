import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

    const [bodyData, authResult] = await Promise.all([
      req.json(),
      anonClient.auth.getUser(authHeader.replace("Bearer ", "")),
    ]);

    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return jsonResp({ error: "Invalid auth token" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResp({ error: "No tenant" }, 400);
    }

    const tenantId = profile.tenant_id;
    const { purpose, transaction_id } = bodyData;

    console.log(`payment-verify: purpose=${purpose}, txn=${transaction_id}, tenant=${tenantId}`);

    // Helper: get Stripe secret key
    async function getStripeKey(): Promise<string | null> {
      const { data: gwConfig } = await supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox")
        .eq("gateway_key", "stripe")
        .single();
      if (!gwConfig?.credentials) return null;
      const raw = gwConfig.credentials as Record<string, any>;
      const creds = (raw.sandbox || raw.live)
        ? (gwConfig.is_sandbox ? (raw.sandbox || {}) : (raw.live || {}))
        : raw;
      return creds.secret_key || null;
    }

    // Helper: verify Stripe payment status and extract payment method
    async function verifyStripePayment(txnId: string): Promise<{ paid: boolean; paymentMethodId?: string; customerId?: string; stripeSubscriptionId?: string }> {
      const secretKey = await getStripeKey();
      if (!secretKey) return { paid: false };

      if (txnId.startsWith("cs_")) {
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${txnId}?expand[]=payment_intent&expand[]=subscription`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const session = await res.json();
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
        const pi = await res.json();
        return {
          paid: pi.status === "succeeded",
          paymentMethodId: pi.payment_method,
          customerId: pi.customer,
        };
      }
      return { paid: false };
    }

    // Helper: save Stripe payment method for future recurring charges
    async function saveStripePaymentMethod(paymentMethodId: string, customerId: string | null) {
      try {
        const secretKey = await getStripeKey();
        if (!secretKey || !paymentMethodId) return;

        // Fetch payment method details from Stripe
        const pmRes = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentMethodId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const pm = await pmRes.json();

        // Check if already saved
        const { data: existing } = await supabase
          .from("saved_payment_methods")
          .select("id")
          .eq("user_id", user!.id)
          .eq("gateway_key", "stripe")
          .eq("token", paymentMethodId)
          .maybeSingle();

        if (existing) return; // Already saved

        const cardBrand = pm.card?.brand || null;
        const cardLast4 = pm.card?.last4 || null;
        const methodLabel = cardBrand
          ? `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} ····${cardLast4}`
          : "Card";

        // Check if first method
        const { count } = await supabase
          .from("saved_payment_methods")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("is_active", true);

        await supabase.from("saved_payment_methods").insert({
          user_id: user!.id,
          tenant_id: tenantId,
          gateway_key: "stripe",
          display_name: "Stripe Card",
          method_label: methodLabel,
          token: paymentMethodId,
          card_brand: cardBrand,
          card_last4: cardLast4,
          is_default: (count || 0) === 0,
          metadata: { stripe_customer_id: customerId },
        });

        console.log(`Saved Stripe payment method: ${methodLabel} for user ${user!.id}`);
      } catch (e) {
        console.error("Failed to save Stripe payment method:", e);
      }
    }

    // Helper: create recurring payment schedule
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
        // Check if schedule already exists for this reference
        const { data: existing } = await supabase
          .from("recurring_payment_schedules")
          .select("id")
          .eq("user_id", user!.id)
          .eq("reference_id", referenceId)
          .maybeSingle();

        if (existing) return;

        const nextDate = new Date();
        switch (billingCycle) {
          case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
          case "quarterly": nextDate.setMonth(nextDate.getMonth() + 3); break;
          default: nextDate.setMonth(nextDate.getMonth() + 1); break;
        }

        await supabase.from("recurring_payment_schedules").insert({
          user_id: user!.id,
          tenant_id: tenantId,
          saved_method_id: savedMethodId,
          schedule_type: scheduleType,
          reference_id: referenceId,
          amount,
          currency,
          billing_cycle: billingCycle,
          next_charge_date: nextDate.toISOString().split("T")[0],
          status: "active",
        });

        console.log(`Created recurring schedule: ${billingCycle} ${amount} ${currency}`);
      } catch (e) {
        console.error("Failed to create recurring schedule:", e);
      }
    }

    // ===== SUBSCRIPTION =====
    if (purpose === "subscription") {
      let pendingSub: any = null;

      if (transaction_id) {
        const { data } = await supabase
          .from("tenant_subscriptions")
          .select("*, plan:plan_id(id, slug, name, modules)")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .eq("transaction_id", transaction_id)
          .limit(1)
          .maybeSingle();
        pendingSub = data;
      }

      if (!pendingSub) {
        const { data } = await supabase
          .from("tenant_subscriptions")
          .select("*, plan:plan_id(id, slug, name, modules)")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        pendingSub = data;
      }

      if (!pendingSub) {
        return jsonResp({ status: "no_pending", message: "No pending subscription found" });
      }

      const txnToVerify = pendingSub.transaction_id;

      // Stripe verification + save payment method
      if (pendingSub.payment_method === "stripe" && txnToVerify) {
        const result = await verifyStripePayment(txnToVerify);
        if (!result.paid) {
          return jsonResp({ status: "not_paid", message: "Payment not completed yet" });
        }

        // Save payment method for future recurring charges
        if (result.paymentMethodId) {
          await saveStripePaymentMethod(result.paymentMethodId, result.customerId || null);

          // Find the saved method ID for recurring schedule
          const { data: savedMethod } = await supabase
            .from("saved_payment_methods")
            .select("id")
            .eq("user_id", user.id)
            .eq("gateway_key", "stripe")
            .eq("token", result.paymentMethodId)
            .maybeSingle();

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

      // Dodo: assume success if reaching verify (redirect-based)
      if (pendingSub.payment_method === "dodo") {
        console.log("Dodo payment assumed successful via redirect");
      }

      // Activate the subscription
      const now = new Date();
      let periodEnd: Date;
      const bc = pendingSub.billing_cycle;
      if (bc === "yearly") periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      else if (bc === "quarterly") periodEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      else if (bc === "lifetime") periodEnd = new Date(2099, 11, 31);
      else periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      await Promise.all([
        supabase
          .from("tenant_subscriptions")
          .update({ status: "cancelled" })
          .eq("tenant_id", tenantId)
          .eq("status", "active"),
        supabase
          .from("tenant_subscriptions")
          .update({ status: "expired" })
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .neq("id", pendingSub.id),
        supabase
          .from("tenant_subscriptions")
          .update({
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq("id", pendingSub.id),
      ]);

      const plan = pendingSub.plan as any;
      if (plan) {
        const moduleRows = (plan.modules && plan.modules.length > 0)
          ? plan.modules.map((m: string) => ({ tenant_id: tenantId, module_name: m, is_enabled: true }))
          : [];

        await Promise.all([
          supabase.from("tenants").update({ plan: plan.slug }).eq("id", tenantId),
          supabase.from("tenant_modules").delete().eq("tenant_id", tenantId),
        ]);

        if (moduleRows.length > 0) {
          await supabase.from("tenant_modules").insert(moduleRows);
        }
      }

      console.log(`Subscription activated: tenant=${tenantId}, plan=${plan?.slug}`);
      return jsonResp({ status: "activated", plan: plan?.slug, modules: plan?.modules || [] });
    }

    // ===== ADDON =====
    if (purpose === "addon") {
      let pendingAddon: any = null;

      if (transaction_id) {
        const { data } = await supabase
          .from("tenant_addon_modules")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .eq("transaction_id", transaction_id)
          .limit(1)
          .maybeSingle();
        pendingAddon = data;
      }

      if (!pendingAddon) {
        const { data } = await supabase
          .from("tenant_addon_modules")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        pendingAddon = data;
      }

      if (!pendingAddon) {
        return jsonResp({ status: "no_pending", message: "No pending addon found" });
      }

      // Stripe: verify + save method
      if (pendingAddon.transaction_id?.startsWith("cs_") || pendingAddon.transaction_id?.startsWith("pi_")) {
        const result = await verifyStripePayment(pendingAddon.transaction_id);
        if (!result.paid) {
          return jsonResp({ status: "not_paid", message: "Payment not completed yet" });
        }
        if (result.paymentMethodId) {
          await saveStripePaymentMethod(result.paymentMethodId, result.customerId || null);
        }
      }

      const [, { data: existingModule }] = await Promise.all([
        supabase
          .from("tenant_addon_modules")
          .update({ status: "active", activated_at: new Date().toISOString() })
          .eq("id", pendingAddon.id),
        supabase
          .from("tenant_modules")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("module_name", pendingAddon.module_name)
          .maybeSingle(),
      ]);

      if (!existingModule) {
        await supabase.from("tenant_modules").insert({
          tenant_id: tenantId, module_name: pendingAddon.module_name, is_enabled: true,
        });
      } else {
        await supabase.from("tenant_modules").update({ is_enabled: true }).eq("id", existingModule.id);
      }

      console.log(`Addon activated: tenant=${tenantId}, module=${pendingAddon.module_name}`);
      return jsonResp({ status: "activated", module: pendingAddon.module_name });
    }

    return jsonResp({ error: "Invalid purpose" }, 400);
  } catch (err: any) {
    console.error("Payment verify error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
