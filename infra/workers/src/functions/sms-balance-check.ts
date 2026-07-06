// Phase 5 — sms-balance-check ported to a Worker.
// Source: supabase/functions/sms-balance-check/index.ts
//   - serve()               -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// Provider balance HTTP calls (alpha_sms/green_web/bdbulk/dynahost/twilio/nexmo/msg91)
// are preserved verbatim.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface BalanceResult {
  balance: string | number;
  currency?: string;
  status: "ok" | "error";
  error?: string;
  raw?: any;
}

async function checkBalance(
  gatewayKey: string,
  apiUrl: string,
  creds: Record<string, any>
): Promise<BalanceResult> {
  try {
    switch (gatewayKey) {
      case "alpha_sms": {
        if (!creds.api_key) return { status: "error", balance: 0, error: "API key not configured" };
        const res = await fetch(`https://api.sms.net.bd/user/balance/?api_key=${creds.api_key}`);
        const data: any = await res.json();
        if (data?.error === 0 && data?.data?.balance !== undefined) {
          return { status: "ok", balance: data.data.balance, currency: "BDT" };
        }
        return { status: "error", balance: 0, error: data?.msg || "Failed to fetch balance", raw: data };
      }

      case "green_web": {
        if (!creds.token) return { status: "error", balance: 0, error: "Token not configured" };
        const res = await fetch(`http://api.greenweb.com.bd/g_api.php?token=${creds.token}&balance&json`);
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          return { status: "ok", balance: data?.balance ?? data ?? text, currency: "BDT" };
        } catch {
          // plain text response
          return { status: "ok", balance: text.trim(), currency: "BDT" };
        }
      }

      case "bdbulk_sms": {
        if (!creds.api_key) return { status: "error", balance: 0, error: "API key not configured" };
        // BDBulk uses greenweb under the hood
        const baseUrl = apiUrl || "http://api.greenweb.com.bd/g_api.php";
        const res = await fetch(`${baseUrl}?token=${creds.api_key}&balance&json`);
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          return { status: "ok", balance: data?.balance ?? text, currency: "BDT" };
        } catch {
          return { status: "ok", balance: text.trim(), currency: "BDT" };
        }
      }

      case "dynahost_sms": {
        if (!creds.api_key || !creds.secret_key)
          return { status: "error", balance: 0, error: "Credentials not configured" };
        const base = apiUrl || "https://sms.dynahost.com.bd";
        const res = await fetch(`${base}/check-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: creds.api_key, secret_key: creds.secret_key }),
        });
        const data: any = await res.json();
        return {
          status: res.ok ? "ok" : "error",
          balance: data?.balance ?? data?.data?.balance ?? 0,
          currency: "BDT",
          raw: data,
        };
      }

      case "twilio": {
        if (!creds.account_sid || !creds.auth_token)
          return { status: "error", balance: 0, error: "Twilio credentials incomplete" };
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}/Balance.json`,
          {
            headers: {
              Authorization: "Basic " + btoa(`${creds.account_sid}:${creds.auth_token}`),
            },
          }
        );
        const data: any = await res.json();
        if (res.ok) {
          return { status: "ok", balance: data.balance, currency: data.currency || "USD" };
        }
        return { status: "error", balance: 0, error: data?.message || "Failed", raw: data };
      }

      case "nexmo": {
        if (!creds.api_key || !creds.api_secret)
          return { status: "error", balance: 0, error: "Vonage credentials incomplete" };
        const res = await fetch(
          `https://rest.nexmo.com/account/get-balance?api_key=${creds.api_key}&api_secret=${creds.api_secret}`
        );
        const data: any = await res.json();
        if (data?.value !== undefined) {
          return { status: "ok", balance: parseFloat(data.value).toFixed(2), currency: "EUR" };
        }
        return { status: "error", balance: 0, error: data?.["error-text"] || "Failed", raw: data };
      }

      case "msg91": {
        if (!creds.auth_key)
          return { status: "error", balance: 0, error: "MSG91 auth key not configured" };
        const res = await fetch("https://control.msg91.com/api/balance.php?authkey=" + creds.auth_key + "&type=1");
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          return { status: "ok", balance: data?.balance ?? data ?? text, currency: "INR" };
        } catch {
          return { status: "ok", balance: text.trim(), currency: "INR" };
        }
      }

      default:
        return { status: "error", balance: 0, error: `Balance check not supported for: ${gatewayKey}` };
    }
  } catch (err) {
    return { status: "error", balance: 0, error: (err as Error).message };
  }
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { tenant_id } = await req.json() as Record<string, any>;
    if (!tenant_id) return json({ error: "tenant_id is required" }, 400);

    // Get tenant's own gateway config
    const tenantConfig = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT * FROM public.tenant_sms_gateway_configs
        WHERE tenant_id = ${tenant_id} LIMIT 1`;
      return rows[0] as any;
    });

    const isOwnGateway = tenantConfig?.use_own_gateway && tenantConfig?.is_enabled && tenantConfig?.gateway_key;

    if (isOwnGateway) {
      const result = await checkBalance(
        tenantConfig.gateway_key,
        tenantConfig.api_url || "",
        (tenantConfig.credentials as Record<string, any>) || {}
      );
      return json({
        mode: "own_gateway",
        gateway_key: tenantConfig.gateway_key,
        ...result,
      });
    }

    // Platform gateway — check which shared gateway is active
    const sharedGw = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT gateway_key, display_name, api_url, credentials
        FROM public.sms_gateway_configs
        WHERE is_enabled = true LIMIT 1`;
      return rows[0] as any;
    });

    if (!sharedGw) {
      return json({ mode: "platform", status: "error", balance: 0, error: "No platform gateway configured" });
    }

    // For platform gateway, check the platform's balance (admin-level)
    const result = await checkBalance(
      sharedGw.gateway_key,
      sharedGw.api_url || "",
      (sharedGw.credentials as Record<string, any>) || {}
    );

    return json({
      mode: "platform",
      gateway_key: sharedGw.gateway_key,
      gateway_name: sharedGw.display_name,
      ...result,
    });
  } catch (err) {
    console.error("Balance check error:", err);
    return json({ error: (err as Error).message }, 500);
  }
}
