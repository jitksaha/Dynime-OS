import { useState, useEffect } from "react";
import { CreditCard, Building2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";

interface SubWithTenant {
  id: string;
  tenant_id: string;
  billing_cycle: string;
  status: string;
  amount: number;
  payment_method: string | null;
  current_period_start: string;
  current_period_end: string | null;
  plan: { name: string } | null;
  tenant_name: string;
}

export default function AdminBilling() {
  const { formatPrice } = usePlatformCurrency();
  const [subs, setSubs] = useState<SubWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [subsRes, tenantsRes] = await Promise.all([
        supabase.from("tenant_subscriptions").select("*, plan:subscription_plans(name)").order("created_at", { ascending: false }),
        supabase.from("tenants").select("id, name"),
      ]);
      const tenantMap: Record<string, string> = {};
      (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t.name; });
      const enriched = (subsRes.data || []).map((s: any) => ({ ...s, tenant_name: tenantMap[s.tenant_id] || "Unknown" }));
      setSubs(enriched);
      setLoading(false);
    };
    fetch();
  }, []);

  const statusColor: Record<string, string> = {
    active: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
    trial: "bg-info/10 text-info",
    past_due: "bg-warning/10 text-warning",
  };

  const filtered = subs.filter((s) =>
    s.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.plan?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = subs.filter((s) => s.status === "active").reduce((a, b) => a + Number(b.amount || 0), 0);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">{subs.length} subscriptions · {formatPrice(totalRevenue)} active revenue</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search by company or plan..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No subscriptions found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div key={sub.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{sub.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{sub.plan?.name || "Unknown"} · {sub.billing_cycle}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[sub.status] || "bg-secondary text-muted-foreground"}`}>
                  {sub.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold text-foreground">{formatPrice(sub.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-foreground">{sub.payment_method || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period End</p>
                  <p className="text-foreground">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
