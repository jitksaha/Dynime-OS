// Ported from supabase/functions/integration-test/index.ts
// Provider verification HTTP calls preserved verbatim.

import type { Env } from "../_shared/env";
import { json } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) return json({ error: "Invalid auth token" }, { status: 401 });

    const sql = connect(env);

    const profile = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT tenant_id FROM public.profiles WHERE user_id = ${ctx.userId} LIMIT 1`);
    const tenantId = profile[0]?.tenant_id;
    if (!tenantId) return json({ error: "No tenant" }, { status: 400 });

    const { integration_key } = await req.json() as any;

    // Fetch config
    const integrationRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT * FROM public.tenant_integrations
         WHERE tenant_id = ${tenantId} AND integration_key = ${integration_key}
         LIMIT 1`);
    const integration = integrationRows[0];
    if (!integration) return json({ error: "Integration not configured" }, { status: 404 });

    const config = integration.config as Record<string, any>;
    let success = false;
    let message = "";

    switch (integration_key) {
      case "gmail": {
        // Test SMTP connection by attempting a basic check
        const email = config.email;
        const appPassword = config.app_password;
        if (!email || !appPassword) {
          return json({ success: false, error: "Missing Gmail credentials" });
        }
        // We can't do a full SMTP handshake here, but we validate the fields
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return json({ success: false, error: "Invalid email address format" });
        }
        if (appPassword.length < 10) {
          return json({ success: false, error: "App password seems too short. Should be 16 characters." });
        }
        success = true;
        message = "Gmail credentials validated. SMTP connection will be tested on first email send.";
        break;
      }

      case "slack": {
        const webhookUrl = config.webhook_url;
        if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
          return json({ success: false, error: "Invalid Slack webhook URL" });
        }
        // Send a test message
        const slackRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "✅ Dynime integration test successful! Your Slack connection is working.",
            username: config.bot_name || "Dynime Bot",
          }),
        });
        if (slackRes.ok) {
          success = true;
          message = "Test message sent to Slack successfully!";
        } else {
          return json({ success: false, error: `Slack returned status ${slackRes.status}` });
        }
        break;
      }

      case "whatsapp": {
        const phoneId = config.phone_number_id;
        const token = config.access_token;
        if (!phoneId || !token) {
          return json({ success: false, error: "Missing WhatsApp credentials" });
        }
        const version = config.api_version || "v18.0";
        // Verify by fetching the phone number info
        const waRes = await fetch(
          `https://graph.facebook.com/${version}/${phoneId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (waRes.ok) {
          success = true;
          message = "WhatsApp Business API connection verified!";
        } else {
          const waErr = await waRes.json() as any;
          return json({ success: false, error: waErr?.error?.message || `WhatsApp API returned ${waRes.status}` });
        }
        break;
      }

      case "webhooks": {
        const endpoints = config.endpoints || [];
        if (endpoints.length === 0) {
          return json({ success: false, error: "No webhook endpoints configured" });
        }
        // Test each endpoint with a ping
        const results: string[] = [];
        for (const ep of endpoints) {
          if (!ep.url) continue;
          try {
            const whRes = await fetch(ep.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "test.ping", timestamp: new Date().toISOString(), source: "dynime" }),
            });
            results.push(`${ep.url}: ${whRes.ok ? "✅" : `❌ ${whRes.status}`}`);
          } catch (e: any) {
            results.push(`${ep.url}: ❌ ${e.message}`);
          }
        }
        success = results.some((r) => r.includes("✅"));
        message = results.join("\n");
        break;
      }

      case "google_calendar": {
        const apiKey = config.api_key;
        const calendarId = config.calendar_id || "primary";
        if (!apiKey) {
          return json({ success: false, error: "Missing Google Calendar API key" });
        }
        const gcRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}?key=${apiKey}`
        );
        if (gcRes.ok) {
          const cal = await gcRes.json() as any;
          success = true;
          message = `Connected to calendar: ${cal.summary || calendarId}`;
        } else {
          const gcErr = await gcRes.json() as any;
          return json({ success: false, error: gcErr?.error?.message || `Google API returned ${gcRes.status}` });
        }
        break;
      }

      default:
        return json({ error: "Unknown integration" }, { status: 400 });
    }

    // Update test result
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE public.tenant_integrations
         SET last_tested_at = ${new Date().toISOString()}, test_result = ${success ? "success" : "failed"}
         WHERE id = ${integration.id}`);

    return json({ success, message });
  } catch (err: any) {
    console.error("Integration test error:", err);
    return json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
