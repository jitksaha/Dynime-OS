import { useState, useEffect } from "react";
import { BarChart3, Download, Calendar } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { exportToCSV } from "@/lib/export-utils";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface TaxSummary {
  profileName: string;
  region: string;
  invoiceTax: number;
  expenseTax: number;
  paymentTax: number;
  netTax: number;
}

// fmt defined inside component for dynamic currency

export default function TaxReports() {
  const { tenantId, supabase } = useTenant();
  const { formatPrice: fmt } = useTenantCurrency();
  const [summaries, setSummaries] = useState<TaxSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  const fetchData = async () => {
    if (!tenantId) return;
    setLoading(true);

    // Fetch tax profiles
    const { data: profiles } = await supabase
      .from("tax_profiles")
      .select("id, name, region")
      .eq("tenant_id", tenantId);

    if (!profiles || profiles.length === 0) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    // Fetch invoices with tax
    const { data: invoices } = await supabase
      .from("invoices")
      .select("tax_profile_id, tax_amount")
      .eq("tenant_id", tenantId)
      .gt("tax_amount", 0);

    // Fetch expenses with tax
    const { data: expenses } = await supabase
      .from("expenses")
      .select("tax_profile_id, tax_amount")
      .eq("tenant_id", tenantId)
      .gt("tax_amount", 0);

    // Fetch payments with tax
    const { data: payments } = await supabase
      .from("payments")
      .select("tax_profile_id, tax_amount")
      .eq("tenant_id", tenantId)
      .gt("tax_amount", 0);

    const result: TaxSummary[] = profiles.map((p: any) => {
      const invTax = (invoices || []).filter((i: any) => i.tax_profile_id === p.id).reduce((s: number, i: any) => s + Number(i.tax_amount), 0);
      const expTax = (expenses || []).filter((e: any) => e.tax_profile_id === p.id).reduce((s: number, e: any) => s + Number(e.tax_amount), 0);
      const payTax = (payments || []).filter((pm: any) => pm.tax_profile_id === p.id).reduce((s: number, pm: any) => s + Number(pm.tax_amount), 0);
      return {
        profileName: p.name,
        region: p.region,
        invoiceTax: invTax,
        expenseTax: expTax,
        paymentTax: payTax,
        netTax: invTax - expTax,
      };
    });

    setSummaries(result.filter(r => r.invoiceTax > 0 || r.expenseTax > 0 || r.paymentTax > 0));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId, period]);

  const totalInvoiceTax = summaries.reduce((a, b) => a + b.invoiceTax, 0);
  const totalExpenseTax = summaries.reduce((a, b) => a + b.expenseTax, 0);
  const totalNetTax = summaries.reduce((a, b) => a + b.netTax, 0);
  const totalPaymentTax = summaries.reduce((a, b) => a + b.paymentTax, 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Tax collected, paid, and net liability by region</p>
        </div>
        <button
          onClick={() => exportToCSV(summaries.map(s => ({
            "Tax Profile": s.profileName,
            Region: s.region,
            "Tax Collected (Invoices)": s.invoiceTax,
            "Tax Paid (Expenses)": s.expenseTax,
            "Tax on Payments": s.paymentTax,
            "Net Tax Liability": s.netTax,
          })), "tax-report")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Tax Collected", value: fmt(totalInvoiceTax), color: "text-success" },
          { label: "Tax Paid", value: fmt(totalExpenseTax), color: "text-destructive" },
          { label: "Tax on Payments", value: fmt(totalPaymentTax), color: "text-warning" },
          { label: "Net Liability", value: fmt(totalNetTax), color: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Report Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No tax data available. Start using tax profiles in your invoices and expenses.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax Profile</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Region</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax Collected</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax Paid</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Liability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaries.map((s, i) => (
                <tr key={i} className="hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{s.profileName}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.region}</td>
                  <td className="px-5 py-3.5 text-sm text-right font-semibold text-success">{fmt(s.invoiceTax)}</td>
                  <td className="px-5 py-3.5 text-sm text-right font-semibold text-destructive">{fmt(s.expenseTax)}</td>
                  <td className={`px-5 py-3.5 text-sm text-right font-bold ${s.netTax >= 0 ? "text-foreground" : "text-success"}`}>{fmt(s.netTax)}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-secondary/50 font-bold">
                <td className="px-5 py-3.5 text-sm text-foreground" colSpan={2}>Total</td>
                <td className="px-5 py-3.5 text-sm text-right text-success">{fmt(totalInvoiceTax)}</td>
                <td className="px-5 py-3.5 text-sm text-right text-destructive">{fmt(totalExpenseTax)}</td>
                <td className="px-5 py-3.5 text-sm text-right text-foreground">{fmt(totalNetTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
