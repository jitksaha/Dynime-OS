// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import {
  BarChart3,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Branch = { id: string; name: string };
type Stats = {
  deals_count: number;
  deals_value: number;
  deals_won: number;
  invoices_count: number;
  invoices_revenue: number;
  invoices_paid: number;
  pos_orders: number;
  pos_revenue: number;
};

const EMPTY: Stats = {
  deals_count: 0,
  deals_value: 0,
  deals_won: 0,
  invoices_count: 0,
  invoices_revenue: 0,
  invoices_paid: 0,
  pos_orders: 0,
  pos_revenue: 0,
};

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Year to date", days: 0 },
];

export default function BranchReports() {
  const { profile } = useAuth();
  const tenantId = (profile as any)?.tenant_id;
  const { branches } = useActiveBranch();
  const { formatPrice } = useTenantCurrency();
  const [days, setDays] = useState(30);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [byBranch, setByBranch] = useState<Record<string, Stats>>({});

  // Default selection — first 3 branches
  useEffect(() => {
    if (branches.length && selected.length === 0) {
      setSelected(branches.slice(0, Math.min(3, branches.length)).map((b) => b.id));
    }
  }, [branches]);

  const sinceISO = useMemo(() => {
    const now = new Date();
    const d = days === 0 ? new Date(now.getFullYear(), 0, 1) : new Date(now.getTime() - days * 86400000);
    return d.toISOString();
  }, [days]);

  const loadStats = async () => {
    if (!tenantId || selected.length === 0) return;
    setLoading(true);

    const results: Record<string, Stats> = {};

    await Promise.all(
      selected.map(async (branchId) => {
        const baseDeals = supabase
          .from("deals")
          .select("value, stage")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .gte("created_at", sinceISO);
        const baseInv = supabase
          .from("invoices")
          .select("amount, status")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .gte("created_at", sinceISO);
        const basePos = supabase
          .from("pdm_orders")
          .select("total")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .gte("created_at", sinceISO);

        const [d, i, p] = await Promise.all([baseDeals, baseInv, basePos]);
        const deals = (d.data as any[]) || [];
        const inv = (i.data as any[]) || [];
        const pos = (p.data as any[]) || [];

        results[branchId] = {
          deals_count: deals.length,
          deals_value: deals.reduce((s, x) => s + Number(x.value || 0), 0),
          deals_won: deals.filter((x) => /won|closed/i.test(x.stage || "")).length,
          invoices_count: inv.length,
          invoices_revenue: inv.reduce((s, x) => s + Number(x.amount || 0), 0),
          invoices_paid: inv.filter((x) => /paid/i.test(x.status || "")).length,
          pos_orders: pos.length,
          pos_revenue: pos.reduce((s, x) => s + Number(x.total || 0), 0),
        };
      })
    );

    setByBranch(results);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, [tenantId, selected.join(","), days]);

  const toggleBranch = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const selectedBranches = branches.filter((b) => selected.includes(b.id));

  // Totals + best/worst markers
  const metrics = useMemo(() => {
    return [
      { key: "invoices_revenue", label: "Invoiced Revenue", money: true },
      { key: "invoices_count", label: "Invoices", money: false },
      { key: "invoices_paid", label: "Paid Invoices", money: false },
      { key: "pos_revenue", label: "POS Revenue", money: true },
      { key: "pos_orders", label: "POS Orders", money: false },
      { key: "deals_value", label: "Pipeline Value", money: true },
      { key: "deals_count", label: "Deals", money: false },
      { key: "deals_won", label: "Won Deals", money: false },
    ] as const;
  }, []);

  const getValue = (bid: string, key: keyof Stats) => byBranch[bid]?.[key] ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Branch Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare KPIs side-by-side across branches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.days} value={String(r.days)}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Branch selector */}
      <div className="border border-border rounded-xl p-4 bg-card">
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Branches to compare
          <Badge variant="secondary" className="ml-1">
            {selected.length} selected
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => {
            const on = selected.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggleBranch(b.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted/50 border-border text-foreground"
                }`}
              >
                <Checkbox checked={on} className="pointer-events-none h-3.5 w-3.5" />
                {b.name}
              </button>
            );
          })}
          {branches.length === 0 && (
            <p className="text-sm text-muted-foreground">No branches yet.</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : selectedBranches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Pick at least one branch to view its KPIs.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-x-auto bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-muted-foreground">
                <th className="p-3 font-medium sticky left-0 bg-muted/50 z-10">Metric</th>
                {selectedBranches.map((b) => (
                  <th key={b.id} className="p-3 font-medium text-right min-w-[140px]">
                    <div className="flex items-center justify-end gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      {b.name}
                    </div>
                  </th>
                ))}
                {selectedBranches.length > 1 && (
                  <th className="p-3 font-medium text-right min-w-[120px]">Total</th>
                )}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const values = selectedBranches.map((b) => Number(getValue(b.id, m.key)));
                const max = Math.max(...values);
                const min = Math.min(...values);
                const total = values.reduce((s, v) => s + v, 0);
                return (
                  <tr key={m.key} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground sticky left-0 bg-card z-10">
                      {m.label}
                    </td>
                    {selectedBranches.map((b, i) => {
                      const v = values[i];
                      const isBest = values.length > 1 && v === max && max > 0;
                      const isWorst = values.length > 1 && v === min && min !== max;
                      return (
                        <td key={b.id} className="p-3 text-right tabular-nums">
                          <span className="text-foreground font-medium">
                            {m.money ? formatPrice(v) : v.toLocaleString()}
                          </span>
                          {isBest && (
                            <ArrowUpRight className="inline h-3.5 w-3.5 ml-1 text-success" />
                          )}
                          {isWorst && (
                            <ArrowDownRight className="inline h-3.5 w-3.5 ml-1 text-destructive" />
                          )}
                        </td>
                      );
                    })}
                    {selectedBranches.length > 1 && (
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {m.money ? formatPrice(total) : total.toLocaleString()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
