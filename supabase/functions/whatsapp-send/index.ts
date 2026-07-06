import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const data = await res.json();
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

    const data = await res.json();
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const body = await req.json();
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
        const { data } = await supabase
          .from("whatsapp_templates")
          .select("template_body")
          .eq("event_key", event_key)
          .eq("is_active", true)
          .eq("branch_id", branch_id)
          .maybeSingle();
        tpl = data;
      }
      if (!tpl) {
        const { data } = await supabase
          .from("whatsapp_templates")
          .select("template_body")
          .eq("event_key", event_key)
          .eq("is_active", true)
          .is("branch_id", null)
          .maybeSingle();
        tpl = data;
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
    const { data: sharedGw } = await supabase
      .from("whatsapp_gateway_configs")
      .select("*")
      .eq("is_enabled", true)
      .limit(1)
      .maybeSingle();

    if (!sharedGw) {
      return json({ error: "No WhatsApp gateway configured. Contact admin." }, 404);
    }

    const resolvedGatewayKey = sharedGw.gateway_key;
    const resolvedApiUrl = sharedGw.api_url;
    const resolvedCreds = (sharedGw.credentials as Record<string, any>) || {};

    // Dispatch WhatsApp message
    const result = await dispatchWhatsApp(resolvedGatewayKey, resolvedApiUrl, resolvedCreds, phone, resolvedMessage);

    // Log the message — include branch context for downstream reporting
    await supabase.from("whatsapp_logs").insert({
      tenant_id: tenant_id || null,
      branch_id: branch_id || null,
      gateway_key: resolvedGatewayKey,
      recipient_phone: phone,
      message: resolvedMessage,
      event_key: event_key || null,
      status: result.success ? "sent" : "failed",
      gateway_response: result.response || {},
      sent_by: sent_by || null,
    });

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
});
