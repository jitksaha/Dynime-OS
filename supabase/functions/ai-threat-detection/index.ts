import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { tenant_id } = await req.json();
    
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();

    // Gather security-relevant data
    const [auditLogsRes, loginAttemptsRes, sessionsRes, apiLogsRes] = await Promise.all([
      adminClient.from("audit_logs").select("action, module, user_id, ip_address, created_at, details").order("created_at", { ascending: false }).gte("created_at", sevenDaysAgo).limit(500),
      adminClient.from("login_attempts").select("email, ip_address, success, attempted_at, user_agent").order("attempted_at", { ascending: false }).gte("attempted_at", sevenDaysAgo).limit(300),
      adminClient.from("active_sessions").select("user_id, ip_address, device_info, created_at, last_active, is_active").eq("is_active", true).limit(200),
      adminClient.from("api_request_logs").select("endpoint, method, status_code, ip_address, user_agent, created_at, response_time_ms").order("created_at", { ascending: false }).gte("created_at", sevenDaysAgo).limit(500),
    ]);

    const context = {
      audit_logs: auditLogsRes.data || [],
      login_attempts: loginAttemptsRes.data || [],
      active_sessions: sessionsRes.data || [],
      api_request_logs: apiLogsRes.data || [],
      analysis_period: { from: sevenDaysAgo, to: new Date().toISOString() },
      instruction: `Perform a comprehensive security threat analysis. Look for:
1. Brute force login attempts (multiple failures from same IP/email)
2. Impossible travel (same user logging in from geographically distant IPs in short time)
3. Unusual API usage patterns (spikes, scraping, unauthorized endpoints)
4. Privilege escalation attempts (unusual admin actions)
5. Session anomalies (multiple concurrent sessions, stale sessions)
6. Data exfiltration signals (bulk exports, unusual read patterns)
7. Off-hours activity (actions during unusual times)
Provide severity-rated findings with specific evidence and remediation steps.`,
    };

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an elite cybersecurity analyst specializing in SaaS application security. Analyze system logs, login patterns, and API usage to detect threats, anomalies, and suspicious activities. Provide actionable, evidence-based security findings." },
          { role: "user", content: JSON.stringify(context) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "threat_analysis",
            description: "Return structured security threat analysis",
            parameters: {
              type: "object",
              properties: {
                threat_level: { type: "string", enum: ["low", "moderate", "elevated", "high", "critical"] },
                security_score: { type: "number", description: "Overall security score 0-100 (100 = most secure)" },
                summary: { type: "string" },
                threats: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      category: { type: "string", enum: ["brute_force", "impossible_travel", "api_abuse", "privilege_escalation", "session_anomaly", "data_exfiltration", "off_hours", "other"] },
                      severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
                      description: { type: "string" },
                      evidence: { type: "array", items: { type: "string" } },
                      affected_users: { type: "array", items: { type: "string" } },
                      affected_ips: { type: "array", items: { type: "string" } },
                      remediation: { type: "array", items: { type: "string" } },
                      timestamp: { type: "string" },
                    },
                    required: ["id", "title", "category", "severity", "description", "evidence", "remediation"],
                  },
                },
                stats: {
                  type: "object",
                  properties: {
                    total_login_attempts: { type: "number" },
                    failed_logins: { type: "number" },
                    unique_ips: { type: "number" },
                    active_sessions: { type: "number" },
                    api_requests_analyzed: { type: "number" },
                    suspicious_ips: { type: "array", items: { type: "string" } },
                  },
                },
                recommendations: { type: "array", items: { type: "string" } },
              },
              required: ["threat_level", "security_score", "summary", "threats", "stats", "recommendations"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "threat_analysis" } },
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ result: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-threat-detection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
