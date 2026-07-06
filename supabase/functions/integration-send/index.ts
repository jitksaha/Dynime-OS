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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid auth token" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    if (!profile?.tenant_id) return json({ error: "No tenant" }, 400);

    const body = await req.json();
    const { integration_key, action, payload } = body;

    // Fetch integration config
    const { data: integration } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("integration_key", integration_key)
      .eq("is_enabled", true)
      .single();

    if (!integration) return json({ error: `${integration_key} integration not configured or disabled` }, 404);

    const config = integration.config as Record<string, any>;

    switch (integration_key) {
      // ===== SLACK =====
      case "slack": {
        if (action === "send_message") {
          const { text, channel } = payload;
          const webhookUrl = config.webhook_url;
          if (!webhookUrl) return json({ error: "Slack webhook URL not configured" }, 400);

          const slackRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              channel: channel || config.default_channel,
              username: config.bot_name || "Dynime Bot",
            }),
          });

          if (slackRes.ok) return json({ success: true, message: "Message sent to Slack" });
          return json({ error: `Slack error: ${slackRes.status}` }, 500);
        }
        break;
      }

      // ===== WHATSAPP =====
      case "whatsapp": {
        if (action === "send_message") {
          const { to, text, template_name, template_language } = payload;
          const version = config.api_version || "v18.0";

          let waBody: any;
          if (template_name) {
            waBody = {
              messaging_product: "whatsapp",
              to,
              type: "template",
              template: { name: template_name, language: { code: template_language || "en" } },
            };
          } else {
            waBody = { messaging_product: "whatsapp", to, type: "text", text: { body: text } };
          }

          const waRes = await fetch(
            `https://graph.facebook.com/${version}/${config.phone_number_id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(waBody),
            }
          );

          const waData = await waRes.json();
          if (waRes.ok) return json({ success: true, data: waData });
          return json({ error: waData?.error?.message || "WhatsApp send failed" }, 500);
        }
        break;
      }

      // ===== WEBHOOKS =====
      case "webhooks": {
        if (action === "dispatch") {
          const { event, data: eventData } = payload;
          const endpoints = config.endpoints || [];
          const results: any[] = [];

          for (const ep of endpoints) {
            if (!ep.url) continue;
            // Check if this endpoint subscribes to this event
            const subscribedEvents = ep.events ? ep.events.split(",").map((e: string) => e.trim()) : [];
            if (subscribedEvents.length > 0 && !subscribedEvents.includes(event)) continue;

            try {
              const headers: Record<string, string> = { "Content-Type": "application/json" };
              const bodyStr = JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                data: eventData,
                source: "dynime",
                tenant_id: profile.tenant_id,
              });

              // HMAC signing if secret is provided
              if (ep.secret) {
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey(
                  "raw", encoder.encode(ep.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
                );
                const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyStr));
                headers["X-Webhook-Signature"] = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
              }

              const whRes = await fetch(ep.url, { method: "POST", headers, body: bodyStr });
              results.push({ url: ep.url, status: whRes.status, ok: whRes.ok });
            } catch (e: any) {
              results.push({ url: ep.url, error: e.message });
            }
          }

          return json({ success: true, results });
        }
        break;
      }

      // ===== GOOGLE CALENDAR =====
      case "google_calendar": {
        if (action === "list_events") {
          const calendarId = config.calendar_id || "primary";
          const { timeMin, timeMax, maxResults } = payload || {};
          const params = new URLSearchParams({
            key: config.api_key,
            timeMin: timeMin || new Date().toISOString(),
            maxResults: String(maxResults || 10),
            singleEvents: "true",
            orderBy: "startTime",
          });
          if (timeMax) params.set("timeMax", timeMax);

          const gcRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
          );
          const gcData = await gcRes.json();
          if (gcRes.ok) return json({ success: true, events: gcData.items || [] });
          return json({ error: gcData?.error?.message || "Calendar fetch failed" }, 500);
        }
        break;
      }

      // ===== GMAIL =====
      case "gmail": {
        // Gmail SMTP requires a direct TCP connection which isn't straightforward in Deno edge functions.
        // We store the config and validate. For actual email sending, the platform's communication hub
        // should use this config with a proper SMTP library.
        if (action === "validate") {
          const email = config.email;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email || !emailRegex.test(email)) return json({ error: "Invalid email" }, 400);
          return json({ success: true, email, smtp_host: config.smtp_host || "smtp.gmail.com" });
        }
        return json({ success: true, message: "Gmail config stored. Emails will be sent through the platform's email service." });
      }

      default:
        return json({ error: "Unknown integration or action" }, 400);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("Integration send error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
