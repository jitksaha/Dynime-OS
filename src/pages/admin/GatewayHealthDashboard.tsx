import { useState, useEffect, useMemo } from "react";
import { Activity, CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";

interface HealthLog {
  id: string;
  gateway_key: string;
  event_type: string;
  status: string;
  response_time_ms: number | null;
  error_message: string | null;
  amount: number | null;
  currency: string | null;
  created_at: string;
}

interface GatewayStats {
  key: string;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgResponseTime: number;
  lastError: string | null;
  lastActivity: string;
  status: "healthy" | "degraded" | "down" | "inactive";
}

export default function GatewayHealthDashboard() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");

  const fetchLogs = async () => {
    setLoading(true);
    const since = new Date();
    switch (timeRange) {
      case "1h": since.setHours(since.getHours() - 1); break;
      case "24h": since.setDate(since.getDate() - 1); break;
      case "7d": since.setDate(since.getDate() - 7); break;
      case "30d": since.setDate(since.getDate() - 30); break;
    }

    const { data } = await supabase
      .from("gateway_health_logs")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    setLogs((data as HealthLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [timeRange]);

  const stats = useMemo(() => {
    const map: Record<string, HealthLog[]> = {};
    logs.forEach((l) => {
      if (!map[l.gateway_key]) map[l.gateway_key] = [];
      map[l.gateway_key].push(l);
    });

    const allGateways = ["stripe", "bkash", "sslcommerz", "dodo", "paypal"];
    return allGateways.map((key): GatewayStats => {
      const gwLogs = map[key] || [];
      const total = gwLogs.length;
      const success = gwLogs.filter((l) => l.status === "success").length;
      const failed = total - success;
      const successRate = total > 0 ? (success / total) * 100 : 100;
      const responseTimes = gwLogs.filter((l) => l.response_time_ms).map((l) => l.response_time_ms!);
      const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
      const lastError = gwLogs.find((l) => l.status === "failed")?.error_message || null;
      const lastActivity = gwLogs[0]?.created_at || "";

      let status: GatewayStats["status"] = "inactive";
      if (total > 0) {
        if (successRate >= 95) status = "healthy";
        else if (successRate >= 70) status = "degraded";
        else status = "down";
      }

      return { key, total, success, failed, successRate, avgResponseTime, lastError, lastActivity, status };
    });
  }, [logs]);

  const totalTransactions = logs.length;
  const totalSuccess = logs.filter((l) => l.status === "success").length;
  const overallRate = totalTransactions > 0 ? ((totalSuccess / totalTransactions) * 100).toFixed(1) : "100";

  const statusColor = (s: GatewayStats["status"]) => {
    switch (s) {
      case "healthy": return "text-emerald-500 bg-emerald-500/10";
      case "degraded": return "text-amber-500 bg-amber-500/10";
      case "down": return "text-red-500 bg-red-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const statusIcon = (s: GatewayStats["status"]) => {
    switch (s) {
      case "healthy": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "degraded": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "down": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gateway Health</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor payment gateway performance and uptime</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["1h", "24h", "7d", "30d"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${timeRange === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button onClick={fetchLogs} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Total Transactions</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalTransactions}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{overallRate}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Failed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalTransactions - totalSuccess}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium">Active Gateways</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.filter((s) => s.total > 0).length}</p>
        </div>
      </div>

      {/* Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((gw) => (
          <div key={gw.key} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(gw.status)}
                <div>
                  <h3 className="text-sm font-semibold text-foreground capitalize">{gw.key}</h3>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColor(gw.status)}`}>
                    {gw.status}
                  </span>
                </div>
              </div>
              {gw.avgResponseTime > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                  <p className="text-sm font-semibold text-foreground">{gw.avgResponseTime}ms</p>
                </div>
              )}
            </div>

            {gw.total > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-semibold text-foreground">{gw.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${gw.successRate >= 95 ? "bg-emerald-500" : gw.successRate >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${gw.successRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg py-2">
                    <p className="text-lg font-bold text-foreground">{gw.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-emerald-500/5 rounded-lg py-2">
                    <p className="text-lg font-bold text-emerald-600">{gw.success}</p>
                    <p className="text-[10px] text-muted-foreground">Success</p>
                  </div>
                  <div className="bg-red-500/5 rounded-lg py-2">
                    <p className="text-lg font-bold text-red-500">{gw.failed}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                </div>

                {gw.lastError && (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-2.5">
                    <p className="text-[10px] font-medium text-destructive uppercase mb-1">Last Error</p>
                    <p className="text-xs text-destructive/80 line-clamp-2">{gw.lastError}</p>
                  </div>
                )}

                {gw.lastActivity && (
                  <p className="text-[10px] text-muted-foreground">
                    Last activity: {new Date(gw.lastActivity).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No transactions in selected period</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent Logs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Gateway</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Response</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 50).map((log) => (
                <tr key={log.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium text-foreground capitalize">{log.gateway_key}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.status === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                      {log.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{log.response_time_ms ? `${log.response_time_ms}ms` : "—"}</td>
                  <td className="px-4 py-2 text-foreground">{log.amount ? `${log.currency || ""} ${log.amount}` : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-destructive/80 max-w-[200px] truncate">{log.error_message || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No logs in selected period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}