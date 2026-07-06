// Ported from supabase/functions/ai-threat-detection/index.ts — gathers security
// signals (service-role) and runs a threat analysis via ai-proxy tool-calling.
//   - createClient(SERVICE_ROLE) reads  becomes  connect(env) + withSession(SERVICE)
//   - Supabase query-builder selects     becomes  raw SQL via tx tagged templates
// Behaviour preserved 1:1.

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";
import { handler as aiProxy } from "./ai-proxy";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Unauthorized", 401);
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId && ctx.role !== "service_role") return error("Invalid token", 401);

    // tenant_id is read from the body to preserve the original signature, though unused below
    await req.json().catch(() => ({}));

    const sql = connect(env);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Gather security-relevant data (service-role, like the original admin client)
    const { auditLogs, loginAttempts, sessions, apiLogs } = await withSession(sql, SERVICE, async (tx) => {
      const [auditLogs, loginAttempts, sessions, apiLogs] = await Promise.all([
        tx`SELECT action, module, user_id, ip_address, created_at, details FROM audit_logs
           WHERE created_at >= ${sevenDaysAgo} ORDER BY created_at DESC LIMIT 500`,
        tx`SELECT email, ip_address, success, attempted_at, user_agent FROM login_attempts
           WHERE attempted_at >= ${sevenDaysAgo} ORDER BY attempted_at DESC LIMIT 300`,
        tx`SELECT user_id, ip_address, device_info, created_at, last_active, is_active FROM active_sessions
           WHERE is_active = true LIMIT 200`,
        tx`SELECT endpoint, method, status_code, ip_address, user_agent, created_at, response_time_ms FROM api_request_logs
           WHERE created_at >= ${sevenDaysAgo} ORDER BY created_at DESC LIMIT 500`,
      ]);
      return { auditLogs, loginAttempts, sessions, apiLogs };
    });

    const context = {
      audit_logs: auditLogs || [],
      login_attempts: loginAttempts || [],
      active_sessions: sessions || [],
      api_request_logs: apiLogs || [],
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

    const response = await aiProxy(new Request(`${env.APP_URL}/functions/ai-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SERVICE_ROLE_TOKEN}` },
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
    }), env);

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await response.json() as any;
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return error("AI did not return structured data", 500);
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return json({ result: parsed });
  } catch (e) {
    console.error("ai-threat-detection error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
