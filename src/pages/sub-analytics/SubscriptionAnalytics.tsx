import { useState, useEffect, useCallback } from "react";
import { TrendingUp, DollarSign, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Metric { id: string; metric_date: string; mrr: number; arr: number; active_subscriptions: number; new_subscriptions: number; churned_subscriptions: number; expansion_revenue: number; ltv_average: number; }

export default function SubscriptionAnalytics() {
  const { tenantId } = useTenant();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("subscription_metrics" as any).select("*").eq("tenant_id", tenantId).order("metric_date");
    setMetrics((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const churnRate = latest && latest.active_subscriptions > 0 ? ((latest.churned_subscriptions / latest.active_subscriptions) * 100).toFixed(1) : "0";

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> Subscription Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">MRR, ARR, churn analysis, LTV calculations, and cohort insights</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card"><DollarSign className="h-5 w-5 text-primary mb-1" /><p className="text-2xl font-bold text-foreground">${(latest?.mrr || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">MRR</p></div>
        <div className="p-4 rounded-xl border border-border bg-card"><TrendingUp className="h-5 w-5 text-success mb-1" /><p className="text-2xl font-bold text-foreground">${(latest?.arr || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">ARR</p></div>
        <div className="p-4 rounded-xl border border-border bg-card"><Users className="h-5 w-5 text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{latest?.active_subscriptions || 0}</p><p className="text-xs text-muted-foreground">Active</p></div>
        <div className="p-4 rounded-xl border border-border bg-card"><RefreshCw className="h-5 w-5 text-destructive mb-1" /><p className="text-2xl font-bold text-foreground">{churnRate}%</p><p className="text-xs text-muted-foreground">Churn Rate</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card"><p className="text-sm font-semibold text-foreground mb-1">Avg LTV</p><p className="text-3xl font-bold text-primary">${(latest?.ltv_average || 0).toLocaleString()}</p></div>
        <div className="p-4 rounded-xl border border-border bg-card"><p className="text-sm font-semibold text-foreground mb-1">Expansion Revenue</p><p className="text-3xl font-bold text-success">${(latest?.expansion_revenue || 0).toLocaleString()}</p></div>
      </div>

      {metrics.length > 1 && (
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-sm font-semibold text-foreground mb-4">MRR Trend</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="metric_date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip />
              <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {metrics.length === 0 && (
        <div className="text-center py-16"><TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No metrics data yet. Data will populate as subscriptions are tracked.</p></div>
      )}
    </div>
  );
}
