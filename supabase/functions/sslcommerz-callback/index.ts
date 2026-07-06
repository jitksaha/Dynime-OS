import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
    const planId = data.value_b;
    const billingCycle = data.value_c;
    const siteUrl = data.value_d || "https://dynime.com";

    console.log(`SSLCommerz callback: status=${status}, tran_id=${tranId}, val_id=${valId}`);

    if (status === "VALID" && valId) {
      const isSandbox = gwConfigRes.data?.is_sandbox ?? STORE_ID.toLowerCase().includes("test");
      const validationUrl = isSandbox
        ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
        : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`;

      const verifyRes = await fetch(
        `${validationUrl}?val_id=${valId}&store_id=${STORE_ID}&store_passwd=${STORE_PASS}&format=json`
      );

      const contentType = verifyRes.headers.get("content-type") || "";
      let verification;
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
        const { data: pendingSub } = await supabase
          .from("tenant_subscriptions")
          .select("id, amount, billing_cycle")
          .eq("transaction_id", tranId)
          .eq("status", "pending")
          .maybeSingle();

        // Parallel: cancel active subs + activate pending + fetch plan
        const [,, { data: plan }] = await Promise.all([
          supabase
            .from("tenant_subscriptions")
            .update({ status: "cancelled" })
            .eq("tenant_id", tenantId)
            .eq("status", "active"),
          supabase
            .from("tenant_subscriptions")
            .update({
              status: "active",
              transaction_id: tranId,
              current_period_end: periodEnd.toISOString(),
            })
            .eq("transaction_id", tranId)
            .eq("status", "pending"),
          supabase
            .from("subscription_plans")
            .select("slug, modules")
            .eq("id", planId)
            .single(),
        ]);

        if (plan) {
          await Promise.all([
            supabase.from("tenants").update({ plan: plan.slug }).eq("id", tenantId),
            supabase.from("tenant_modules").delete().eq("tenant_id", tenantId),
          ]);

          if (plan.modules && plan.modules.length > 0) {
            const moduleRows = plan.modules.map((m: string) => ({
              tenant_id: tenantId, module_name: m, is_enabled: true,
            }));
            await supabase.from("tenant_modules").insert(moduleRows);
          }
        }

        // Save SSLCommerz card token for recurring charges if available
        const cardToken = verification.card_no || null;
        const cardBrand = verification.card_brand || verification.card_type || null;
        const cardLast4 = cardToken ? cardToken.slice(-4) : null;

        if (cardToken && billingCycle !== "lifetime") {
          try {
            // Find user from tenant profiles
            const { data: tenantProfile } = await supabase
              .from("profiles")
              .select("user_id")
              .eq("tenant_id", tenantId)
              .eq("is_owner", true)
              .limit(1)
              .maybeSingle();

            if (tenantProfile?.user_id) {
              // Check if this card is already saved
              const { data: existingSaved } = await supabase
                .from("saved_payment_methods")
                .select("id")
                .eq("user_id", tenantProfile.user_id)
                .eq("gateway_key", "sslcommerz")
                .eq("card_last4", cardLast4)
                .maybeSingle();

              if (!existingSaved) {
                const { count } = await supabase
                  .from("saved_payment_methods")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", tenantProfile.user_id)
                  .eq("is_active", true);

                const { data: newSaved } = await supabase.from("saved_payment_methods").insert({
                  user_id: tenantProfile.user_id,
                  tenant_id: tenantId,
                  gateway_key: "sslcommerz",
                  display_name: "SSLCommerz Card",
                  method_label: cardBrand ? `${cardBrand} ····${cardLast4}` : `Card ····${cardLast4}`,
                  token: cardToken,
                  card_brand: cardBrand,
                  card_last4: cardLast4,
                  is_default: (count || 0) === 0,
                }).select("id").single();

                // Create recurring schedule
                if (newSaved && pendingSub) {
                  const nextDate = new Date();
                  switch (billingCycle) {
                    case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                    case "quarterly": nextDate.setMonth(nextDate.getMonth() + 3); break;
                    default: nextDate.setMonth(nextDate.getMonth() + 1); break;
                  }

                  await supabase.from("recurring_payment_schedules").insert({
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
                  });

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
      await supabase
        .from("tenant_subscriptions")
        .delete()
        .eq("transaction_id", tranId)
        .eq("status", "pending");
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
});
