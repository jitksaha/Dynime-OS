import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { Bot, Clock, TrendingUp, AlertTriangle, CheckCircle2, MessageSquare, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SocialAnalytics() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [stats, setStats] = useState({
    totalConversations: 0,
    aiResponses: 0,
    humanResponses: 0,
    escalations: 0,
    avgConfidence: 0,
    avgResponseTime: 0,
    conversionRate: 0,
  });
  const [responseTimeSeries, setResponseTimeSeries] = useState<any[]>([]);
  const [confidenceDistribution, setConfidenceDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    if (!tenantId) return;
    loadAnalytics();
  }, [tenantId, period]);

  const loadAnalytics = async () => {
    setLoading(true);

    const daysAgo = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - daysAgo * 86400000).toISOString();

    // Get analytics events
    const { data: _events } = await supabase
      .from("social_analytics_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("created_at", since)
      .order("created_at");

    // Get conversations count
    const { count: convCount } = await supabase
      .from("social_conversations")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    // Get messages breakdown
    const { data: messages } = await supabase
      .from("social_messages")
      .select("sender_type")
      .eq("tenant_id", tenantId)
      .gte("created_at", since);

    // Get escalation count
    const { count: escCount } = await supabase
      .from("escalation_queue")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", since);

    // Get response logs for confidence
    const { data: logs } = await supabase
      .from("agent_response_logs")
      .select("confidence, response_time_ms, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", since)
      .order("created_at");

    const aiMsgs = messages?.filter((m) => m.sender_type === "ai").length || 0;
    const humanMsgs = messages?.filter((m) => m.sender_type === "human_agent").length || 0;
    const avgConf = logs?.length ? logs.reduce((sum, l) => sum + (l.confidence || 0), 0) / logs.length : 0;
    const avgTime = logs?.length ? logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length : 0;

    setStats({
      totalConversations: convCount || 0,
      aiResponses: aiMsgs,
      humanResponses: humanMsgs,
      escalations: escCount || 0,
      avgConfidence: avgConf,
      avgResponseTime: avgTime,
      conversionRate: 0,
    });

    // Time series for response times (group by day)
    const timeMap = new Map<string, { total: number; count: number }>();
    logs?.forEach((l) => {
      const day = l.created_at.substring(0, 10);
      const existing = timeMap.get(day) || { total: 0, count: 0 };
      existing.total += l.response_time_ms || 0;
      existing.count += 1;
      timeMap.set(day, existing);
    });
    setResponseTimeSeries(Array.from(timeMap.entries()).map(([day, v]) => ({
      date: day,
      avgMs: Math.round(v.total / v.count),
    })));

    // Confidence distribution
    const confBuckets = [
      { name: "< 30%", count: 0 },
      { name: "30-50%", count: 0 },
      { name: "50-75%", count: 0 },
      { name: "75-90%", count: 0 },
      { name: "> 90%", count: 0 },
    ];
    logs?.forEach((l) => {
      const c = (l.confidence || 0) * 100;
      if (c < 30) confBuckets[0].count++;
      else if (c < 50) confBuckets[1].count++;
      else if (c < 75) confBuckets[2].count++;
      else if (c < 90) confBuckets[3].count++;
      else confBuckets[4].count++;
    });
    setConfidenceDistribution(confBuckets);

    setLoading(false);
  };

  const COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#3b82f6"];

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social AI Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">AI agent performance and conversation insights</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Conversations" value={stats.totalConversations} />
        <StatCard icon={Bot} label="AI Responses" value={stats.aiResponses} />
        <StatCard icon={Users} label="Human Responses" value={stats.humanResponses} />
        <StatCard icon={AlertTriangle} label="Escalations" value={stats.escalations} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label="Avg Confidence" value={`${(stats.avgConfidence * 100).toFixed(0)}%`} color="text-green-500" />
        <StatCard icon={Clock} label="Avg Response Time" value={`${(stats.avgResponseTime / 1000).toFixed(1)}s`} />
        <StatCard icon={TrendingUp} label="AI:Human Ratio" value={stats.humanResponses > 0 ? `${(stats.aiResponses / stats.humanResponses).toFixed(1)}:1` : "∞"} />
        <StatCard icon={TrendingUp} label="AI Coverage" value={`${stats.aiResponses + stats.humanResponses > 0 ? ((stats.aiResponses / (stats.aiResponses + stats.humanResponses)) * 100).toFixed(0) : 0}%`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trend */}
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Response Time Trend (ms)</h3>
          {responseTimeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={responseTimeSeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Line type="monotone" dataKey="avgMs" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          )}
        </div>

        {/* Confidence Distribution */}
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Confidence Distribution</h3>
          {confidenceDistribution.some((b) => b.count > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={confidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {confidenceDistribution.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color?: string }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color || "text-primary"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
