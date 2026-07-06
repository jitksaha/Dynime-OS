import { useState, useEffect } from "react";
import { TrendingUp, Users, Target, DollarSign, MousePointer, Mail } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  budget: number;
  status: string;
}

export default function MarketingAnalytics() {
  const { tenantId, supabase } = useTenant();
  const { formatPrice: fp } = useTenantCurrency();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!tenantId) return;
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (!error && data) setCampaigns(data as Campaign[]);
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  const totalSent = campaigns.reduce((a, b) => a + b.sent, 0);
  const totalOpened = campaigns.reduce((a, b) => a + b.opened, 0);
  const totalClicked = campaigns.reduce((a, b) => a + b.clicked, 0);
  const totalConverted = campaigns.reduce((a, b) => a + b.converted, 0);
  const totalBudget = campaigns.reduce((a, b) => a + Number(b.budget), 0);
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const ctr = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0";
  const conversionRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : "0";

  const kpiCards = [
    { label: "Total Campaigns", value: campaigns.length.toString(), icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Email Open Rate", value: `${openRate}%`, icon: Mail, color: "text-success", bgColor: "bg-success/10" },
    { label: "Click-Through Rate", value: `${ctr}%`, icon: MousePointer, color: "text-warning", bgColor: "bg-warning/10" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: Target, color: "text-info", bgColor: "bg-info/10" },
    { label: "Total Budget", value: fp(totalBudget), icon: DollarSign, color: "text-success", bgColor: "bg-success/10" },
    { label: "Total Conversions", value: totalConverted.toString(), icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  // Group by channel
  const channelMap = new Map<string, { sent: number; opened: number; clicked: number; converted: number; budget: number }>();
  campaigns.forEach(c => {
    const existing = channelMap.get(c.channel) || { sent: 0, opened: 0, clicked: 0, converted: 0, budget: 0 };
    channelMap.set(c.channel, {
      sent: existing.sent + c.sent,
      opened: existing.opened + c.opened,
      clicked: existing.clicked + c.clicked,
      converted: existing.converted + c.converted,
      budget: existing.budget + Number(c.budget),
    });
  });

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
  const pct = (a: number, b: number) => b === 0 ? "0%" : `${((a / b) * 100).toFixed(1)}%`;

  // Top campaigns by conversions
  const topCampaigns = [...campaigns].sort((a, b) => b.converted - a.converted).slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Marketing Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Campaign performance and ROI tracking</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No campaign data yet. Create campaigns to see analytics.</p></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {kpiCards.map((kpi) => (
              <div key={kpi.label} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Channel Performance */}
            <div className="bg-card border border-border rounded-xl">
              <div className="p-4 sm:p-5 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Channel Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Channel</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Sent</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Open %</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">CTR</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.from(channelMap.entries()).map(([channel, data]) => (
                      <tr key={channel} className="hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{channel}</td>
                        <td className="px-3 py-3 text-sm text-right text-muted-foreground">{fmt(data.sent)}</td>
                        <td className="px-3 py-3 text-sm text-right text-foreground">{pct(data.opened, data.sent)}</td>
                        <td className="px-3 py-3 text-sm text-right text-muted-foreground">{pct(data.clicked, data.sent)}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{fp(data.budget)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Campaigns */}
            <div className="bg-card border border-border rounded-xl">
              <div className="p-4 sm:p-5 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Top Campaigns by Conversions</h2>
              </div>
              {topCampaigns.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No campaign data</div>
              ) : (
                <div className="divide-y divide-border">
                  {topCampaigns.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.converted} conversions · {c.channel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">{fp(c.budget)}</p>
                        <p className="text-xs text-muted-foreground">{c.sent > 0 ? pct(c.converted, c.sent) : "0%"} conv.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
