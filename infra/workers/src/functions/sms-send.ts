// Phase 5 — sms-send ported to a Worker.
// Source: supabase/functions/sms-send/index.ts
//   - serve()               -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - supabase.rpc(...)      -> tx.unsafe SELECT of the same Postgres function
// Provider HTTP dispatch (alpha_sms/green_web/bdbulk/dynahost/twilio/nexmo/msg91)
// is preserved verbatim. Gateway resolution, credit deduct/refund, and logging
// behaviour are preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

type Sql = ReturnType<typeof connect>;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Gateway dispatch logic extracted for clarity
async function dispatchSms(
  gatewayKey: string,
  apiUrl: string,
  creds: Record<string, any>,
  phone: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  switch (gatewayKey) {
    case "alpha_sms": {
      if (!creds.api_key) return { success: false, error: "Alpha SMS API key not configured" };
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: creds.api_key, msg: message, to: phone, sender_id: creds.sender_id || "" }),
      });
      const data: any = await res.json();
      return { success: res.ok && data?.error === 0, response: data };
    }
    case "green_web": {
      if (!creds.token) return { success: false, error: "Green Web token not configured" };
      const params = new URLSearchParams({ token: creds.token, to: phone, message, sender_id: creds.sender_id || "" });
      const res = await fetch(`${apiUrl}?${params}`);
      const text = await res.text();
      return { success: text.includes("Ok") || res.ok, response: { raw: text } };
    }
    case "bdbulk_sms": {
      if (!creds.api_key) return { success: false, error: "BDBulk API key not configured" };
      const params = new URLSearchParams({ api_key: creds.api_key, number: phone, smsType: "text", message, sender_id: creds.sender_id || "" });
      const res = await fetch(`${apiUrl}?${params}`);
      const data: any = await res.json();
      return { success: data?.response_code === 202 || res.ok, response: data };
    }
    case "dynahost_sms": {
      if (!creds.api_key || !creds.secret_key) return { success: false, error: "Dynahost credentials not configured" };
      const res = await fetch(`${apiUrl}/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: creds.api_key, secret_key: creds.secret_key, to: phone, message, sender_id: creds.sender_id || "" }),
      });
      const data: any = await res.json();
      return { success: res.ok, response: data };
    }
    case "twilio": {
      if (!creds.account_sid || !creds.auth_token || !creds.from_number) return { success: false, error: "Twilio credentials incomplete" };
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${creds.account_sid}:${creds.auth_token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, From: creds.from_number, Body: message }),
      });
      const data: any = await res.json();
      return { success: res.ok, response: data };
    }
    case "nexmo": {
      if (!creds.api_key || !creds.api_secret) return { success: false, error: "Vonage credentials incomplete" };
      const res = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: creds.api_key, api_secret: creds.api_secret, to: phone, from: creds.from || "Dynime", text: message }),
      });
      const data: any = await res.json();
      return { success: data?.messages?.[0]?.status === "0", response: data };
    }
    case "msg91": {
      if (!creds.auth_key) return { success: false, error: "MSG91 auth key not configured" };
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: creds.auth_key },
        body: JSON.stringify({ sender: creds.sender_id || "DYNIME", route: creds.route || "4", mobiles: phone, message }),
      });
      const data: any = await res.json();
      return { success: res.ok && data?.type === "success", response: data };
    }
    default:
      return { success: false, error: `Unsupported SMS gateway: ${gatewayKey}` };
  }
}

function mapGatewayFailure(result: { error?: string; response?: any }) {
  const response = result.response || {};
  const providerCode = response?.error ?? response?.response_code ?? response?.messages?.[0]?.status;
  const providerMessage =
    response?.msg ||
    response?.message ||
    response?.messages?.[0]?.["error-text"] ||
    result.error ||
    "SMS send failed";

  if (providerCode === 410 || /account\s+expired/i.test(String(providerMessage))) {
    return {
      failure_code: "ACCOUNT_EXPIRED",
      error: "SMS provider account expired. Renew/reactivate in SMS settings.",
    };
  }

  return {
    failure_code: "PROVIDER_REJECTED",
    error: String(providerMessage),
  };
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const body = await req.json() as Record<string, any>;
    const { gateway_key, phone, message, tenant_id, event_key, sent_by } = body;

    if (!phone || !message) {
      return json({ error: "phone and message are required" }, 400);
    }

    let resolvedGatewayKey = gateway_key;
    let resolvedApiUrl = "";
    let resolvedCreds: Record<string, any> = {};
    let isUsingOwnGateway = false;
    let isUsingSharedGateway = false;

    // Step 1: Check if tenant has own gateway configured
    if (tenant_id) {
      const tenantConfig = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT * FROM public.tenant_sms_gateway_configs
          WHERE tenant_id = ${tenant_id} AND is_enabled = true LIMIT 1`;
        return rows[0] as any;
      });

      if (tenantConfig && tenantConfig.use_own_gateway && tenantConfig.gateway_key) {
        // Tenant uses their own gateway — no billing
        resolvedGatewayKey = tenantConfig.gateway_key;
        resolvedApiUrl = tenantConfig.api_url || "";
        resolvedCreds = (tenantConfig.credentials as Record<string, any>) || {};
        isUsingOwnGateway = true;
      }
    }

    // Step 2: If not using own gateway, use shared platform gateway
    if (!isUsingOwnGateway) {
      if (!resolvedGatewayKey) {
        // Pick the first enabled shared gateway
        const sharedGw = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT * FROM public.sms_gateway_configs
            WHERE is_enabled = true LIMIT 1`;
          return rows[0] as any;
        });

        if (!sharedGw) {
          return json({ error: "No SMS gateway available. Contact platform admin." }, 404);
        }
        resolvedGatewayKey = sharedGw.gateway_key;
        resolvedApiUrl = sharedGw.api_url;
        resolvedCreds = (sharedGw.credentials as Record<string, any>) || {};
        isUsingSharedGateway = true;
      } else {
        // Explicit gateway_key provided — look up in shared gateways
        const gateway = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT * FROM public.sms_gateway_configs
            WHERE gateway_key = ${resolvedGatewayKey} AND is_enabled = true LIMIT 1`;
          return rows[0] as any;
        });

        if (!gateway) {
          return json({ error: `SMS gateway '${resolvedGatewayKey}' not configured or disabled` }, 404);
        }
        resolvedApiUrl = gateway.api_url;
        resolvedCreds = (gateway.credentials as Record<string, any>) || {};
        isUsingSharedGateway = true;
      }

      // Deduct credits if tenant is using shared gateway
      if (isUsingSharedGateway && tenant_id) {
        const credited = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT public.deduct_sms_credit(_tenant_id => ${tenant_id}) AS result`;
          return (rows[0] as any)?.result;
        });
        if (!credited) {
          return json({ error: "Insufficient SMS credits. Please top up your balance." }, 402);
        }
      }
    }

    // Step 3: Dispatch SMS
    const result = await dispatchSms(resolvedGatewayKey, resolvedApiUrl, resolvedCreds, phone, message);

    // Step 4: Log the SMS
    await withSession(sql, SERVICE, (tx) =>
      tx`INSERT INTO public.sms_logs ${tx({
        tenant_id: tenant_id || null,
        gateway_key: resolvedGatewayKey,
        recipient_phone: phone,
        message,
        event_key: event_key || null,
        status: result.success ? "sent" : "failed",
        gateway_response: result.response || {},
        sent_by: sent_by || null,
      } as any)}`);

    // If shared gateway SMS failed, refund the credit
    if (!result.success && isUsingSharedGateway && tenant_id) {
      await withSession(sql, SERVICE, (tx) =>
        tx`SELECT public.add_sms_credits(_tenant_id => ${tenant_id}, _count => 1, _amount => 0, _description => ${"Refund: SMS delivery failed"})`);
    }

    if (result.success) {
      return json({ success: true, message: "SMS sent successfully", details: result.response, own_gateway: isUsingOwnGateway });
    }

    const failure = mapGatewayFailure(result);
    return json(
      {
        success: false,
        error: failure.error,
        failure_code: failure.failure_code,
        details: result.response,
        own_gateway: isUsingOwnGateway,
      },
      200
    );
  } catch (err) {
    console.error("SMS send error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
}
