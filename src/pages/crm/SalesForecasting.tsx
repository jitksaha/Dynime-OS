import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Target, DollarSign, BarChart3 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart } from "recharts";

const STAGE_WEIGHTS: Record<string, number> = {
  Lead: 10, Qualified: 25, Proposal: 50, Negotiation: 75, "Closed Won": 100, "Closed Lost": 0, Lost: 0,
};

export default function SalesForecasting() {
  const { tenantId, supabase } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("deals").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })
      .then(({ data }) => { setDeals(data || []); setLoading(false); });
  }, [tenantId]);

  const activeDeals = deals.filter(d => !['Closed Won', 'Closed Lost', 'Lost'].includes(d.stage));
  const weightedForecast = activeDeals.reduce((s, d) => s + Number(d.value || 0) * (STAGE_WEIGHTS[d.stage] || 0) / 100, 0);
  const totalPipeline = activeDeals.reduce((s, d) => s + Number(d.value || 0), 0);
  const closedWon = deals.filter(d => d.stage === 'Closed Won').reduce((s, d) => s + Number(d.value || 0), 0);
  const winRate = deals.filter(d => ['Closed Won', 'Closed Lost', 'Lost'].includes(d.stage)).length > 0
    ? Math.round(deals.filter(d => d.stage === 'Closed Won').length / deals.filter(d => ['Closed Won', 'Closed Lost', 'Lost'].includes(d.stage)).length * 100) : 0;

  // Pipeline by stage
  const stageData = Object.entries(
    activeDeals.reduce<Record<string, { count: number; value: number }>>((acc, d) => {
      if (!acc[d.stage]) acc[d.stage] = { count: 0, value: 0 };
      acc[d.stage].count++; acc[d.stage].value += Number(d.value || 0); return acc;
    }, {})
  ).map(([stage, data]) => ({ name: stage, value: data.value, count: data.count, weight: STAGE_WEIGHTS[stage] || 0 }));

  // Monthly won deals
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en', { month: 'short' });
    const won = deals.filter(deal => deal.stage === 'Closed Won' && deal.updated_at?.startsWith(key)).reduce((s, deal) => s + Number(deal.value || 0), 0);
    return { name: label, Won: won };
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-xl font-bold text-foreground">Sales Forecasting</h1><p className="text-sm text-muted-foreground mt-0.5">Pipeline analytics and revenue predictions</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Target, label: "Pipeline Value", value: formatPrice(totalPipeline), color: "text-primary", bg: "bg-primary/10" },
          { icon: TrendingUp, label: "Weighted Forecast", value: formatPrice(weightedForecast), color: "text-success", bg: "bg-success/10" },
          { icon: DollarSign, label: "Closed Won", value: formatPrice(closedWon), color: "text-info", bg: "bg-info/10" },
          { icon: BarChart3, label: "Win Rate", value: `${winRate}%`, color: "text-warning", bg: "bg-warning/10" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`p-2 rounded-lg ${s.bg} w-fit mb-3`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            <p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Revenue (Won)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="Won" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline by Stage</h3>
          {stageData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">No pipeline data</div>
          ) : (
            <div className="space-y-3">
              {stageData.map(s => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{s.name} <span className="text-muted-foreground">({s.count})</span></span>
                    <span className="text-muted-foreground">{formatPrice(s.value)} · {s.weight}% probability</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (s.value / (totalPipeline || 1)) * 100)}%` }} />
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
