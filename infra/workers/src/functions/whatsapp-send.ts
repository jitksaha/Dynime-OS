// Phase 5 — whatsapp-send ported to a Worker.
// Source: supabase/functions/whatsapp-send/index.ts
//   - serve()               -> export async function handler(req, env)
//   - createClient(SERVICE) -> connect(env) + withSession(SERVICE) raw SQL
// Provider HTTP dispatch (Meta Cloud API / AiSensy) is preserved verbatim.
// Template resolution (branch-scoped then tenant-global) and logging preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// Meta Cloud API dispatcher
async function sendViaMeta(
  creds: Record<string, any>,
  phone: string,
  message: string,
  apiUrl: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  const accessToken = creds.access_token;
  const phoneNumberId = creds.phone_number_id;

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: "Meta Cloud API credentials incomplete (access_token, phone_number_id required)" };
  }

  // Send as a text message via the Messages API
  const url = `${apiUrl || "https://graph.facebook.com/v21.0"}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone.replace(/[^0-9]/g, ""),
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });

    const data: any = await res.json();
    const success = res.ok && data?.messages?.[0]?.id;
    return { success: !!success, response: data, error: success ? undefined : data?.error?.message };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// AiSensy dispatcher
async function sendViaAiSensy(
  creds: Record<string, any>,
  phone: string,
  message: string,
  apiUrl: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  const apiKey = creds.api_key;
  if (!apiKey) {
    return { success: false, error: "AiSensy API key not configured" };
  }

  const url = apiUrl || "https://backend.aisensy.com/campaign/t1/api/v2";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey,
        campaignName: creds.campaign_name || "whatsapp_notification",
        destination: phone.replace(/[^0-9]/g, ""),
        userName: "Platform",
        source: "API",
        message,
        // For template-based messages
        templateParams: [],
        media: {},
      }),
    });

    const data: any = await res.json();
    const success = res.ok && (data?.status === "success" || data?.msg === "success");
    return { success: !!success, response: data, error: success ? undefined : data?.message || data?.msg };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function dispatchWhatsApp(
  gatewayKey: string,
  apiUrl: string,
  creds: Record<string, any>,
  phone: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  switch (gatewayKey) {
    case "meta_cloud_api":
      return sendViaMeta(creds, phone, message, apiUrl);
    case "aisensy":
      return sendViaAiSensy(creds, phone, message, apiUrl);
    default:
      return { success: false, error: `Unsupported WhatsApp gateway: ${gatewayKey}` };
  }
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const body = await req.json() as Record<string, any>;
    const { phone, message, tenant_id, branch_id, event_key, sent_by, template_vars } = body;

    if (!phone || (!message && !event_key)) {
      return json({ error: "phone and (message or event_key) are required" }, 400);
    }

    // Resolve message from template if event_key provided.
    // Prefer a branch-scoped template, fall back to a tenant-global one.
    let resolvedMessage = message || "";
    if (event_key && !message) {
      let tpl: any = null;
      if (branch_id) {
        tpl = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT template_body FROM public.whatsapp_templates
            WHERE event_key = ${event_key} AND is_active = true AND branch_id = ${branch_id} LIMIT 1`;
          return rows[0] as any;
        });
      }
      if (!tpl) {
        tpl = await withSession(sql, SERVICE, async (tx) => {
          const rows = await tx`SELECT template_body FROM public.whatsapp_templates
            WHERE event_key = ${event_key} AND is_active = true AND branch_id IS NULL LIMIT 1`;
          return rows[0] as any;
        });
      }
      if (tpl) {
        resolvedMessage = template_vars
          ? renderTemplate(tpl.template_body, template_vars)
          : tpl.template_body;
      }
    }

    if (!resolvedMessage) {
      return json({ error: "Could not resolve message content" }, 400);
    }

    // Use platform-wide WhatsApp gateway only
    const sharedGw = await withSession(sql, SERVICE, async (tx) => {
      const rows = await tx`SELECT * FROM public.whatsapp_gateway_configs
        WHERE is_enabled = true LIMIT 1`;
      return rows[0] as any;
    });

    if (!sharedGw) {
      return json({ error: "No WhatsApp gateway configured. Contact admin." }, 404);
    }

    const resolvedGatewayKey = sharedGw.gateway_key;
    const resolvedApiUrl = sharedGw.api_url;
    const resolvedCreds = (sharedGw.credentials as Record<string, any>) || {};

    // Dispatch WhatsApp message
    const result = await dispatchWhatsApp(resolvedGatewayKey, resolvedApiUrl, resolvedCreds, phone, resolvedMessage);

    // Log the message — include branch context for downstream reporting
    await withSession(sql, SERVICE, (tx) =>
      tx`INSERT INTO public.whatsapp_logs ${tx({
        tenant_id: tenant_id || null,
        branch_id: branch_id || null,
        gateway_key: resolvedGatewayKey,
        recipient_phone: phone,
        message: resolvedMessage,
        event_key: event_key || null,
        status: result.success ? "sent" : "failed",
        gateway_response: result.response || {},
        sent_by: sent_by || null,
      } as any)}`);

    if (result.success) {
      return json({
        success: true,
        message: "WhatsApp message sent successfully",
        details: result.response,
      });
    }

    return json({
      success: false,
      error: result.error || "WhatsApp send failed",
      details: result.response,
    }, 200);
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
}
