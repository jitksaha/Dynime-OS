// Phase 5 — gateway-config ported to a Worker.
// Source: supabase/functions/gateway-config/index.ts
//   - Deno.serve            -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
//   - user auth + role check -> contextFromRequest(req, env) + user_roles lookup
// Super-Admin CRUD for payment_gateway_configs (list/save/toggle/reorder/test/internal).
// Credential masking, sandbox/live merge, and per-gateway live connectivity tests
// are preserved verbatim.
//
// REVIEW: this table is keyed by `gateway_key` in the source schema, while the shared
// getPaymentGatewayConfig() helper reads by `gateway`. The admin CRUD here keeps
// `gateway_key` (the source of truth for these writes); confirm the column name in
// the migrated schema.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskValue(val: string): string {
  if (!val || val.length < 6) return val ? "••••" : "";
  return val.slice(0, 4) + "••••••••" + val.slice(-4);
}

function maskCredentials(creds: Record<string, any>, settings: Record<string, any>): Record<string, any> {
  const credFields = settings?.credential_fields || {};
  const masked: Record<string, any> = {};

  // Handle sandbox/live structure
  if (creds.sandbox || creds.live) {
    masked.sandbox = {};
    masked.live = {};
    for (const [key, meta] of Object.entries(credFields) as [string, any][]) {
      const isSensitive = meta?.sensitive ?? false;
      const sbVal = creds.sandbox?.[key] || "";
      const lvVal = creds.live?.[key] || "";
      masked.sandbox[key] = isSensitive ? maskValue(sbVal) : sbVal;
      masked.live[key] = isSensitive ? maskValue(lvVal) : lvVal;
    }
    return masked;
  }

  // Flat fallback
  for (const [key, val] of Object.entries(creds)) {
    const isSensitive = credFields[key]?.sensitive ?? true;
    masked[key] = isSensitive ? maskValue(String(val || "")) : String(val || "");
  }
  return masked;
}

/** Extract active credentials based on mode */
function getActiveCreds(creds: Record<string, any>, isSandbox: boolean): Record<string, string> {
  if (creds.sandbox || creds.live) {
    return isSandbox ? (creds.sandbox || {}) : (creds.live || {});
  }
  return creds;
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // INTERNAL - for other functions to read active credentials (service-role only).
    if (req.method === "GET" && action === "internal") {
      const ctx = await contextFromRequest(req, env);
      if (ctx.role !== "service_role") {
        return jsonResp({ error: "Forbidden" }, 403);
      }

      const gwKey = url.searchParams.get("gateway_key");
      const gw = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT * FROM public.payment_gateway_configs
          WHERE gateway_key = ${gwKey} AND is_enabled = true LIMIT 1`;
        return rows[0] as any;
      });

      if (!gw) {
        return jsonResp({ error: "Gateway not found or disabled" }, 404);
      }

      const activeCreds = getActiveCreds(gw.credentials || {}, gw.is_sandbox);
      return jsonResp({ gateway: { ...gw, credentials: activeCreds } });
    }

    // --- Super-Admin authenticated actions below ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId || ctx.role === "anon") {
      return jsonResp({ error: "Invalid auth token" }, 401);
    }

    const roleData = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT role FROM public.user_roles
        WHERE user_id = ${ctx.userId} AND role = 'super_admin' LIMIT 1`;
      return rows[0] as any;
    });

    if (!roleData) {
      return jsonResp({ error: "Forbidden: Super Admin only" }, 403);
    }

    // LIST
    if (req.method === "GET" && action === "list") {
      const gateways = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT * FROM public.payment_gateway_configs ORDER BY display_order ASC`) as unknown as any[];

      const masked = (gateways || []).map((gw: any) => ({
        ...gw,
        credentials: maskCredentials(gw.credentials || {}, gw.settings || {}),
      }));

      return jsonResp({ gateways: masked });
    }

    // REORDER
    if (req.method === "POST" && action === "reorder") {
      const { order } = await req.json() as any;
      if (!Array.isArray(order)) {
        return jsonResp({ error: "order must be an array of gateway_key strings" }, 400);
      }

      await withSession(sql, SERVICE, async (tx) => {
        for (let i = 0; i < order.length; i++) {
          await tx`UPDATE public.payment_gateway_configs
            SET display_order = ${i} WHERE gateway_key = ${order[i]}`;
        }
      });

      return jsonResp({ success: true });
    }

    // SAVE
    if (req.method === "POST" && action === "save") {
      const { gateway_key, credentials, is_enabled, is_sandbox, display_name, description, processing_currency, logo_url } = await req.json() as any;

      if (!gateway_key) {
        return jsonResp({ error: "gateway_key required" }, 400);
      }

      const existing = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT credentials, is_sandbox, settings
          FROM public.payment_gateway_configs WHERE gateway_key = ${gateway_key} LIMIT 1`;
        return rows[0] as any;
      });

      const existingCreds = existing?.credentials || {};
      const currentSandbox = typeof is_sandbox === "boolean" ? is_sandbox : existing?.is_sandbox;
      const mode = currentSandbox ? "sandbox" : "live";

      // Build new credentials with sandbox/live structure
      let mergedCreds: Record<string, any>;
      if (existingCreds.sandbox || existingCreds.live) {
        mergedCreds = { sandbox: { ...existingCreds.sandbox }, live: { ...existingCreds.live } };
      } else {
        // Migrate flat credentials to structured
        mergedCreds = { sandbox: { ...existingCreds }, live: { ...existingCreds } };
      }

      // Only update the current mode's credentials, skip masked values
      if (credentials) {
        for (const [key, val] of Object.entries(credentials as Record<string, string>)) {
          if (val && !val.includes("••••")) {
            mergedCreds[mode][key] = val;
          }
        }
      }

      const updateData: any = { credentials: mergedCreds };
      if (typeof is_enabled === "boolean") updateData.is_enabled = is_enabled;
      if (typeof is_sandbox === "boolean") updateData.is_sandbox = is_sandbox;
      if (typeof display_name === "string" && display_name.trim()) updateData.display_name = display_name.trim();
      if (typeof description === "string") updateData.description = description.trim();
      if (processing_currency !== undefined) updateData.processing_currency = processing_currency || null;
      if (logo_url !== undefined) updateData.logo_url = logo_url || null;

      try {
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.payment_gateway_configs SET ${tx(updateData)}
             WHERE gateway_key = ${gateway_key}`);
      } catch (e: any) {
        return jsonResp({ error: e.message }, 500);
      }

      return jsonResp({ success: true });
    }

    // TOGGLE
    if (req.method === "POST" && action === "toggle") {
      const { gateway_key, is_enabled } = await req.json() as any;
      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.payment_gateway_configs SET is_enabled = ${is_enabled}
           WHERE gateway_key = ${gateway_key}`);

      return jsonResp({ success: true });
    }

    // TEST
    if (req.method === "POST" && action === "test") {
      const { gateway_key } = await req.json() as any;

      const gw = await withSession(sql, SERVICE, async (tx) => {
        const rows = await tx`SELECT * FROM public.payment_gateway_configs
          WHERE gateway_key = ${gateway_key} LIMIT 1`;
        return rows[0] as any;
      });

      if (!gw) {
        return jsonResp({ error: "Gateway not found" }, 404);
      }

      const creds = getActiveCreds(gw.credentials || {}, gw.is_sandbox);
      let testResult = "error";
      let message = "Connection test failed";

      try {
        if (gateway_key === "sslcommerz") {
          if (!creds.store_id || !creds.store_password) {
            message = "Store ID and Password are required";
          } else {
            const baseUrl = gw.is_sandbox
              ? "https://sandbox.sslcommerz.com"
              : "https://securepay.sslcommerz.com";

            const formData = new URLSearchParams();
            formData.append("store_id", creds.store_id);
            formData.append("store_passwd", creds.store_password);
            formData.append("total_amount", "10");
            formData.append("currency", "BDT");
            formData.append("tran_id", `TEST_${Date.now()}`);
            formData.append("success_url", "https://example.com");
            formData.append("fail_url", "https://example.com");
            formData.append("cancel_url", "https://example.com");
            formData.append("cus_name", "Test");
            formData.append("cus_email", "test@test.com");
            formData.append("cus_phone", "01700000000");
            formData.append("cus_add1", "Test");
            formData.append("cus_city", "Test");
            formData.append("cus_country", "Bangladesh");
            formData.append("shipping_method", "NO");
            formData.append("product_name", "Test");
            formData.append("product_category", "Test");
            formData.append("product_profile", "non-physical-goods");

            const res = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: formData.toString(),
            });

            const text = await res.text();
            try {
              const json = JSON.parse(text);
              if (json.status === "SUCCESS") {
                testResult = "success";
                message = "Connection successful — credentials verified";
              } else {
                message = json.failedreason || "Invalid credentials";
              }
            } catch {
              message = "Gateway returned invalid response";
            }
          }
        } else if (gateway_key === "bkash") {
          if (!creds.app_key || !creds.app_secret || !creds.username || !creds.password) {
            message = "All bKash credentials are required";
          } else {
            const baseUrl = gw.is_sandbox
              ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
              : "https://tokenized.pay.bka.sh/v1.2.0-beta";

            const tokenRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "username": creds.username,
                "password": creds.password,
              },
              body: JSON.stringify({
                app_key: creds.app_key,
                app_secret: creds.app_secret,
              }),
            });

            const tokenData = await tokenRes.json() as any;
            if (tokenData.id_token) {
              testResult = "success";
              message = "bKash token grant successful — credentials verified";
            } else {
              message = tokenData.statusMessage || "bKash authentication failed";
            }
          }
        } else if (gateway_key === "stripe") {
          if (!creds.secret_key) {
            message = "Secret Key is required";
          } else {
            const res = await fetch("https://api.stripe.com/v1/balance", {
              headers: { "Authorization": `Bearer ${creds.secret_key}` },
            });
            if (res.ok) {
              testResult = "success";
              message = "Stripe connection successful — API key verified";
            } else {
              const err = await res.json() as any;
              message = err.error?.message || "Invalid Stripe API key";
            }
          }
        } else if (gateway_key === "paypal" || gateway_key === "paypal_card") {
          if (!creds.client_id || !creds.client_secret) {
            message = "Client ID and Client Secret are required";
          } else {
            const baseUrl = gw.is_sandbox
              ? "https://api-m.sandbox.paypal.com"
              : "https://api-m.paypal.com";

            const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${creds.client_id}:${creds.client_secret}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: "grant_type=client_credentials",
            });

            if (res.ok) {
              testResult = "success";
              message = "PayPal connection successful — credentials verified";
            } else {
              const err = await res.json() as any;
              message = err.error_description || "Invalid PayPal credentials";
            }
          }
        } else if (gateway_key === "paddle") {
          if (!creds.api_key) {
            message = "API Key is required";
          } else {
            const baseUrl = gw.is_sandbox
              ? "https://sandbox-api.paddle.com"
              : "https://api.paddle.com";

            const res = await fetch(`${baseUrl}/prices?per_page=1`, {
              headers: { "Authorization": `Bearer ${creds.api_key}` },
            });

            if (res.ok) {
              testResult = "success";
              message = "Paddle connection successful — API key verified";
            } else {
              message = "Invalid Paddle API key";
            }
          }
        } else if (gateway_key === "dodo") {
          if (!creds.api_key) {
            message = "API Key is required. Get your key from Developer → API Keys in your Dodo Payments dashboard.";
          } else {
            // Test against Dodo Payments API — use test endpoint if sandbox, live otherwise
            const baseUrl = gw.is_sandbox
              ? "https://test.dodopayments.com"
              : "https://live.dodopayments.com";

            try {
              const res = await fetch(`${baseUrl}/payments?page_size=1`, {
                headers: { "Authorization": `Bearer ${creds.api_key}` },
              });

              if (res.ok || res.status === 200) {
                testResult = "success";
                message = "Dodo Payments API key verified successfully";
              } else if (res.status === 401 || res.status === 403) {
                message = "Invalid API key — check your key in the Dodo Payments dashboard under Developer → API Keys";
              } else {
                testResult = "success";
                message = `Dodo Payments connected (status: ${res.status})`;
              }
            } catch {
              // If network fails, just validate presence
              testResult = "success";
              message = "Dodo Payments API key saved — could not verify connectivity but credentials are stored";
            }
          }
        } else if (gateway_key === "razorpay") {
          if (!creds.key_id || !creds.key_secret) {
            message = "Key ID and Key Secret are required";
          } else {
            try {
              const res = await fetch("https://api.razorpay.com/v1/orders?count=1", {
                headers: { Authorization: `Basic ${btoa(`${creds.key_id}:${creds.key_secret}`)}` },
              });
              if (res.ok || res.status === 200) {
                testResult = "success";
                message = "Razorpay connected — API credentials verified successfully";
              } else if (res.status === 401) {
                message = "Invalid Razorpay credentials — check Key ID and Key Secret";
              } else {
                message = `Razorpay API responded with status ${res.status}`;
              }
            } catch (e: any) {
              message = `Cannot reach Razorpay API: ${e.message}`;
            }
          }
        } else if (gateway_key === "twocheckout") {
          if (!creds.merchant_code || !creds.secret_key) {
            message = "Merchant Code and Secret Key are required";
          } else {
            const baseUrl = gw.is_sandbox
              ? "https://sandbox.2checkout.com"
              : "https://secure.2checkout.com";
            try {
              // Test by hitting the 2Checkout API with merchant code
              const res = await fetch(`${baseUrl}/checkout/api/encrypt/generate/signature`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  merchant: creds.merchant_code,
                  dynamic: "1",
                  order_ext_ref: "TEST_CONNECTION",
                }),
              });
              // 2Checkout doesn't have a simple health check, so validate credential presence
              testResult = "success";
              message = `2Checkout credentials verified — Merchant: ${creds.merchant_code} (${gw.is_sandbox ? "Sandbox" : "Live"} mode)`;
            } catch {
              testResult = "success";
              message = `2Checkout credentials saved — Merchant: ${creds.merchant_code}. Manual verification recommended.`;
            }
          }
        } else {
          // Generic fallback for any future gateway
          const hasAnyCred = Object.values(creds).some((v) => v && !String(v).includes("••••"));
          if (hasAnyCred) {
            testResult = "success";
            message = "Credentials saved — manual verification recommended";
          } else {
            message = "No credentials configured";
          }
        }
      } catch (e: any) {
        message = e.message || "Connection test failed";
      }

      await withSession(sql, SERVICE, (tx) =>
        tx`UPDATE public.payment_gateway_configs SET
             last_tested_at = ${new Date().toISOString()}, test_result = ${testResult}
           WHERE gateway_key = ${gateway_key}`);

      return jsonResp({ result: testResult, message });
    }

    return jsonResp({ error: "Invalid action" }, 400);
  } catch (err: any) {
    console.error("Error:", err);
    return jsonResp({ error: err.message || "Internal server error" }, 500);
  }
}
