import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, DollarSign, Package, Loader2, RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface KPI {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

export default function AdvancedAnalytics() {
  const { tenantId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [moduleStats, setModuleStats] = useState<Record<string, Record<string, string | number>>>({});

  const fetchAnalytics = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [
        { count: employeeCount },
        { count: dealCount },
        { data: deals },
        { count: invoiceCount },
        { data: invoices },
        { count: expenseCount },
        { data: expenses },
        { count: ticketCount },
        { count: projectCount },
      ] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("deals").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("deals").select("value, stage").eq("tenant_id", tenantId),
        supabase.from("invoices").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("invoices").select("amount, status").eq("tenant_id", tenantId),
        supabase.from("expenses").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("expenses").select("amount, category, status").eq("tenant_id", tenantId),
        supabase.from("tickets").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ]);

      const totalDealValue = deals?.reduce((s, d) => s + (d.value || 0), 0) || 0;
      const wonDeals = deals?.filter(d => d.stage === "Closed Won") || [];
      const wonValue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
      const totalInvoiceRevenue = invoices?.filter(i => i.status === "Paid").reduce((s, i) => s + (i.amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0;

      setKpis([
        { label: "Total Employees", value: employeeCount || 0, icon: Users, color: "text-blue-500" },
        { label: "Pipeline Value", value: formatPrice(totalDealValue), icon: TrendingUp, color: "text-emerald-500" },
        { label: "Revenue (Paid)", value: formatPrice(totalInvoiceRevenue), icon: DollarSign, color: "text-primary" },
        { label: "Total Expenses", value: formatPrice(totalExpenses), icon: Package, color: "text-amber-500" },
      ]);

      setModuleStats({
        crm: { total: dealCount || 0, "won value": wonValue, "pipeline value": totalDealValue },
        invoices: { total: invoiceCount || 0, paid: invoices?.filter(i => i.status === "Paid").length || 0 },
        expenses: { total: expenseCount || 0, "total amount": totalExpenses },
        helpdesk: { total: ticketCount || 0 },
        projects: { total: projectCount || 0 },
      });
    } catch (e) {
      console.error("Analytics fetch error:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, [tenantId]);

  const exportCSV = () => {
    const rows = kpis.map(k => `${k.label},${k.value}`);
    const csv = "Metric,Value\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "analytics-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Advanced Analytics</h1>
            <p className="text-xs text-muted-foreground">Cross-module KPI dashboard</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAnalytics} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(moduleStats).map(([module, stats]) => (
          <div key={module} className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground capitalize mb-3">{module}</h3>
            <div className="space-y-2">
              {Object.entries(stats).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{key}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {typeof val === "number" && (key.includes("value") || key.includes("amount")) ? formatPrice(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
