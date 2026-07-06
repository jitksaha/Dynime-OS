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
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid auth token" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) return json({ error: "No tenant" }, 400);

    const { integration_key } = await req.json();

    // Fetch config
    const { data: integration } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("integration_key", integration_key)
      .single();

    if (!integration) return json({ error: "Integration not configured" }, 404);

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
        // We can't do a full SMTP handshake in Deno easily, but we validate the fields
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
          const waErr = await waRes.json();
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
          const cal = await gcRes.json();
          success = true;
          message = `Connected to calendar: ${cal.summary || calendarId}`;
        } else {
          const gcErr = await gcRes.json();
          return json({ success: false, error: gcErr?.error?.message || `Google API returned ${gcRes.status}` });
        }
        break;
      }

      default:
        return json({ error: "Unknown integration" }, 400);
    }

    // Update test result
    await supabase
      .from("tenant_integrations")
      .update({
        last_tested_at: new Date().toISOString(),
        test_result: success ? "success" : "failed",
      })
      .eq("id", integration.id);

    return json({ success, message });
  } catch (err: any) {
    console.error("Integration test error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
