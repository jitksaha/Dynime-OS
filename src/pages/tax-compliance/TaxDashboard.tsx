// @ts-nocheck
import { useState, useEffect } from "react";
import { Globe, Percent, FileCheck, Calculator, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { Spinner } from "@/components/ui/spinner";
import { useNavigate } from "react-router-dom";

export default function TaxDashboard() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const { formatPrice } = useTenantCurrency();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    profileCount: 0, rateCount: 0, complianceCount: 0,
    overdueCount: 0, pendingCount: 0, totalLiability: 0,
    totalCollected: 0, totalPaid: 0,
  });

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      const [profiles, rates, compliance] = await Promise.all([
        supabase.from("tax_profiles").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        supabase.from("tax_rates").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        supabase.from("tax_compliance_records").select("*").eq("tenant_id", tenantId),
      ]);
      const records = (compliance.data as any[]) || [];
      setStats({
        profileCount: profiles.count || 0,
        rateCount: rates.count || 0,
        complianceCount: records.length,
        overdueCount: records.filter((r) => r.status === "overdue").length,
        pendingCount: records.filter((r) => r.status === "pending").length,
        totalLiability: records.reduce((s, r) => s + (r.net_liability || 0), 0),
        totalCollected: records.reduce((s, r) => s + (r.total_tax_collected || 0), 0),
        totalPaid: records.reduce((s, r) => s + (r.total_tax_paid || 0), 0),
      });
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const cards = [
    { icon: Globe, label: "Country Profiles", value: stats.profileCount, path: "/tax/profiles", color: "text-blue-600 bg-blue-500/10" },
    { icon: Percent, label: "Tax Rates", value: stats.rateCount, path: "/tax/rates", color: "text-purple-600 bg-purple-500/10" },
    { icon: FileCheck, label: "Compliance Records", value: stats.complianceCount, path: "/tax/compliance", color: "text-green-600 bg-green-500/10" },
    { icon: Calculator, label: "Tax Calculator", value: "→", path: "/tax/calculator", color: "text-primary bg-primary/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax Compliance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your tax compliance status</p>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.path)}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/20 hover:bg-primary/5 transition-all"
          >
            <div className={`p-2 rounded-lg w-fit ${c.color}`}><c.icon className="h-4 w-4" /></div>
            <p className="text-2xl font-bold text-foreground mt-2">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {(stats.overdueCount > 0 || stats.pendingCount > 0) && (
        <div className="space-y-2">
          {stats.overdueCount > 0 && (
            <div className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{stats.overdueCount} overdue filing{stats.overdueCount > 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Review and file these immediately to avoid penalties</p>
              </div>
              <button onClick={() => navigate("/tax/compliance")} className="ml-auto text-xs font-medium text-destructive hover:underline">View →</button>
            </div>
          )}
          {stats.pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <FileCheck className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{stats.pendingCount} pending filing{stats.pendingCount > 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">These filings are awaiting submission</p>
              </div>
              <button onClick={() => navigate("/tax/compliance")} className="ml-auto text-xs font-medium text-amber-600 hover:underline">View →</button>
            </div>
          )}
        </div>
      )}

      {/* Financial Summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Financial Summary</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Tax Collected</p>
            <p className="text-xl font-bold text-foreground">{formatPrice(stats.totalCollected)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Tax Paid</p>
            <p className="text-xl font-bold text-foreground">{formatPrice(stats.totalPaid)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Net Tax Liability</p>
            <p className={`text-xl font-bold ${stats.totalLiability > 0 ? "text-destructive" : "text-green-600"}`}>
              {formatPrice(stats.totalLiability)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
