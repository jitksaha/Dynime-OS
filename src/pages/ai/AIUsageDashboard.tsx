import { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, Zap, MessageSquare, DollarSign, Loader2,
  Calendar, Users, Sparkles, Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";

interface UsageStats {
  totalMessages: number;
  totalConversations: number;
  totalTokensUsed: number;
  estimatedCost: number;
  topFeatures: { feature: string; count: number }[];
  dailyUsage: { date: string; count: number }[];
  topModels: { model: string; count: number }[];
}

export default function AIUsageDashboard() {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    loadStats();
  }, [tenantId]);

  const loadStats = async () => {
    // Conversations count
    const { count: convCount } = await supabase
      .from("ai_conversations")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId!);

    // Messages count
    const { count: msgCount } = await supabase
      .from("ai_messages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId!);

    // Usage logs
    const { data: usageLogs } = await supabase
      .from("ai_usage_logs")
      .select("*")
      .eq("tenant_id", tenantId!)
      .order("created_at", { ascending: false })
      .limit(500);

    const logs = (usageLogs as any[]) || [];

    const totalTokens = logs.reduce((sum, l) => sum + (l.tokens_input || 0) + (l.tokens_output || 0), 0);
    const totalCost = logs.reduce((sum, l) => sum + (Number(l.estimated_cost) || 0), 0);

    // Top features
    const featureMap: Record<string, number> = {};
    logs.forEach(l => { featureMap[l.feature || "chat"] = (featureMap[l.feature || "chat"] || 0) + 1; });
    const topFeatures = Object.entries(featureMap)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top models
    const modelMap: Record<string, number> = {};
    logs.forEach(l => { if (l.model) modelMap[l.model] = (modelMap[l.model] || 0) + 1; });
    const topModels = Object.entries(modelMap)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Daily usage (last 14 days)
    const dailyMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      dailyMap[format(subDays(new Date(), i), "MMM dd")] = 0;
    }
    logs.forEach(l => {
      const day = format(new Date(l.created_at), "MMM dd");
      if (dailyMap[day] !== undefined) dailyMap[day]++;
    });
    const dailyUsage = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    setStats({
      totalMessages: msgCount || 0,
      totalConversations: convCount || 0,
      totalTokensUsed: totalTokens,
      estimatedCost: totalCost,
      topFeatures,
      dailyUsage,
      topModels,
    });
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!stats) return null;

  const maxDaily = Math.max(...stats.dailyUsage.map(d => d.count), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Usage Dashboard</h1>
            <p className="text-xs text-muted-foreground">Monitor AI consumption and performance</p>
          </div>
        </div>
        <Link to="/dynime-ai">
          <Button variant="outline" size="sm" className="text-xs">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Open Chat
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Conversations", value: stats.totalConversations, icon: MessageSquare, color: "text-blue-500" },
          { label: "Messages", value: stats.totalMessages, icon: Zap, color: "text-amber-500" },
          { label: "Tokens Used", value: stats.totalTokensUsed.toLocaleString(), icon: Bot, color: "text-emerald-500" },
          { label: "Est. Cost", value: `$${stats.estimatedCost.toFixed(4)}`, icon: DollarSign, color: "text-purple-500" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Usage Chart (simple bar chart) */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Daily AI Usage (14 days)
        </h2>
        <div className="flex items-end gap-1 h-32">
          {stats.dailyUsage.map(day => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground">{day.count || ""}</span>
              <div
                className="w-full bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors"
                style={{ height: `${Math.max(2, (day.count / maxDaily) * 100)}%` }}
              />
              <span className="text-[8px] text-muted-foreground -rotate-45 origin-top-left mt-1 whitespace-nowrap">
                {day.date.split(" ")[1]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Models */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Models Used
          </h2>
          {stats.topModels.length === 0 ? (
            <p className="text-xs text-muted-foreground">No usage data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topModels.map(m => (
                <div key={m.model} className="flex items-center justify-between">
                  <span className="text-xs text-foreground font-mono truncate max-w-[200px]">{m.model}</span>
                  <Badge variant="secondary" className="text-[10px]">{m.count} calls</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Features */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Feature Usage
          </h2>
          {stats.topFeatures.length === 0 ? (
            <p className="text-xs text-muted-foreground">No usage data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topFeatures.map(f => (
                <div key={f.feature} className="flex items-center justify-between">
                  <span className="text-xs text-foreground capitalize">{f.feature}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(f.count / stats.topFeatures[0].count) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{f.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
