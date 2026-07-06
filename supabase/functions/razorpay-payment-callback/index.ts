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

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body.payload?.payment?.entity || body;

    // Get Razorpay credentials for HMAC verification
    const { data: gwConfig } = await supabase
      .from("payment_gateway_configs")
      .select("credentials, is_sandbox")
      .eq("gateway_key", "razorpay")
      .single();

    if (!gwConfig) {
      console.error("Razorpay gateway config not found");
      return new Response(JSON.stringify({ error: "Gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawCreds = gwConfig.credentials as Record<string, any>;
    const creds = (rawCreds.sandbox || rawCreds.live)
      ? (gwConfig.is_sandbox ? (rawCreds.sandbox || {}) : (rawCreds.live || {}))
      : rawCreds;

    // Handle webhook events from Razorpay
    const event = body.event;

    if (event === "payment.captured" || event === "order.paid") {
      const payment = body.payload?.payment?.entity;
      if (!payment) {
        return new Response(JSON.stringify({ status: "no_payment_entity" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify webhook signature
      const webhookSecret = creds.webhook_secret;
      if (webhookSecret) {
        const receivedSig = req.headers.get("x-razorpay-signature");
        if (receivedSig) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw", encoder.encode(webhookSecret),
            { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
          );
          const rawBody = JSON.stringify(body);
          const computed = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
          const computedHex = Array.from(new Uint8Array(computed))
            .map(b => b.toString(16).padStart(2, "0")).join("");
          if (computedHex !== receivedSig) {
            console.error("Razorpay webhook signature mismatch");
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
              status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      const orderId = payment.order_id;
      const notes = payment.notes || {};
      const purpose = notes.purpose;
      const tenantId = notes.tenant_id;

      console.log(`Razorpay payment captured: order=${orderId}, purpose=${purpose}, tenant=${tenantId}`);

      if (purpose === "subscription" && notes.plan_id) {
        await supabase.from("tenant_subscriptions")
          .update({
            status: "active",
            transaction_id: payment.id,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("transaction_id", orderId)
          .eq("status", "pending");

        if (notes.plan_id) {
          const { data: plan } = await supabase.from("subscription_plans").select("slug").eq("id", notes.plan_id).single();
          if (plan) {
            await supabase.from("tenants").update({ plan: plan.slug }).eq("id", tenantId);
          }
        }
      } else if (purpose === "addon" && notes.module_name) {
        await supabase.from("tenant_addon_modules")
          .update({ status: "active", transaction_id: payment.id })
          .eq("transaction_id", orderId)
          .eq("status", "pending");
      } else if (purpose === "wallet_topup" && notes.wallet_id) {
        await supabase.from("company_wallet_transactions")
          .update({ status: "completed", reference_id: payment.id })
          .eq("reference_id", orderId)
          .eq("status", "pending");

        const rawAmount = parseFloat(notes.raw_amount || "0");
        if (rawAmount > 0) {
          await supabase.from("company_wallets")
            .update({ balance: supabase.rpc ? rawAmount : rawAmount })
            .eq("id", notes.wallet_id);
          // Increment balance via raw SQL-safe approach
          const { data: wallet } = await supabase.from("company_wallets").select("balance").eq("id", notes.wallet_id).single();
          if (wallet) {
            await supabase.from("company_wallets").update({ balance: wallet.balance + rawAmount }).eq("id", notes.wallet_id);
          }
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For payment.failed events
    if (event === "payment.failed") {
      const payment = body.payload?.payment?.entity;
      const orderId = payment?.order_id;
      console.log(`Razorpay payment failed: order=${orderId}`);

      if (orderId) {
        await supabase.from("tenant_subscriptions")
          .update({ status: "failed" })
          .eq("transaction_id", orderId)
          .eq("status", "pending");
      }

      return new Response(JSON.stringify({ status: "noted" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "ignored", event }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Razorpay callback error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
