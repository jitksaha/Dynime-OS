import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, XCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface TaxProfile {
  id: string;
  name: string;
  region: string;
  tax_rates: { name: string; rate: number; tax_type: string; is_compound: boolean }[];
}

interface Payment {
  id: string;
  payment_number: string;
  description: string;
  counterparty: string;
  amount: number;
  tax_amount: number;
  tax_profile_id: string | null;
  payment_type: string;
  method: string;
  payment_date: string;
  status: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  Completed: { icon: CheckCircle2, color: "bg-success/10 text-success" },
  Pending: { icon: Clock, color: "bg-warning/10 text-warning" },
  Failed: { icon: XCircle, color: "bg-destructive/10 text-destructive" },
};

function calcTax(amount: number, profile: TaxProfile | undefined): number {
  if (!profile || !profile.tax_rates?.length) return 0;
  let tax = 0;
  for (const rate of profile.tax_rates) {
    if (rate.tax_type === "percentage") {
      const base = rate.is_compound ? amount + tax : amount;
      tax += base * (rate.rate / 100);
    } else {
      tax += rate.rate;
    }
  }
  return Math.round(tax * 100) / 100;
}

// fmt defined inside component for dynamic currency

export default function Payments() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { formatPrice: fmt } = useTenantCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Incoming");
  const [method, setMethod] = useState("Bank Transfer");
  const [selectedTaxProfile, setSelectedTaxProfile] = useState("");

  const fetchData = async () => {
    if (!tenantId) return;
    const [payRes, tpRes] = await Promise.all([
      supabase.from("payments").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("tax_profiles").select("id, name, region").eq("tenant_id", tenantId),
    ]);
    if (payRes.data) setPayments(payRes.data as Payment[]);
    if (tpRes.data) {
      const { data: rates } = await supabase.from("tax_rates").select("*").eq("tenant_id", tenantId);
      setTaxProfiles(tpRes.data.map((p: any) => ({ ...p, tax_rates: (rates || []).filter((r: any) => r.tax_profile_id === p.id) })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const currentProfile = taxProfiles.find(p => p.id === selectedTaxProfile);
  const amountNum = parseFloat(amount) || 0;
  const taxAmount = calcTax(amountNum, currentProfile);

  const handleSubmit = async () => {
    if (!tenantId || !description || !counterparty) return;
    const { error } = await supabase.from("payments").insert(buildInsert({
      payment_number: `PAY-${String(500 + payments.length + 1)}`,
      description,
      counterparty,
      amount: amountNum + taxAmount,
      tax_amount: taxAmount,
      tax_profile_id: selectedTaxProfile || null,
      payment_type: type,
      method,
    }));
    if (error) { toast.error(error.message); return; }
    toast.success("Payment added");
    setDialogOpen(false);
    setDescription(""); setCounterparty(""); setAmount(""); setType("Incoming"); setMethod("Bank Transfer"); setSelectedTaxProfile("");
    fetchData();
  };

  const incoming = payments.filter(p => p.payment_type === "Incoming").reduce((a, b) => a + b.amount, 0);
  const outgoing = payments.filter(p => p.payment_type === "Outgoing").reduce((a, b) => a + b.amount, 0);
  const pending = payments.filter(p => p.status === "Pending").reduce((a, b) => a + b.amount, 0);
  const totalTax = payments.reduce((a, b) => a + (Number(b.tax_amount) || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track payments with tax breakdowns</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Add Payment
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Received", value: fmt(incoming), color: "text-success" },
          { label: "Total Paid", value: fmt(outgoing), color: "text-destructive" },
          { label: "Net Cash Flow", value: `${incoming >= outgoing ? "+" : ""}${fmt(incoming - outgoing)}`, color: "text-foreground" },
          { label: "Total Tax", value: fmt(totalTax), color: "text-warning" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No payments yet. Add your first payment record.</p></div>
      ) : (
        <>
          <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Counterparty</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => {
                  const sc = statusConfig[p.status] || statusConfig.Pending;
                  return (
                    <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground">{p.payment_number}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground">{p.counterparty}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          {p.payment_type === "Incoming" ? <ArrowDownLeft className="h-3.5 w-3.5 text-success" /> : <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />}
                          <span className={p.payment_type === "Incoming" ? "text-success" : "text-destructive"}>{p.payment_type}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-sm text-right font-semibold ${p.payment_type === "Incoming" ? "text-success" : "text-foreground"}`}>
                        {p.payment_type === "Incoming" ? "+" : "-"}{fmt(p.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right text-warning">{fmt(Number(p.tax_amount) || 0)}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.method}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                          <sc.icon className="h-3 w-3" />{p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {payments.map((p) => {
              const sc = statusConfig[p.status] || statusConfig.Pending;
              return (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.payment_type === "Incoming" ? <ArrowDownLeft className="h-4 w-4 text-success shrink-0" /> : <ArrowUpRight className="h-4 w-4 text-destructive shrink-0" />}
                      <p className="text-sm font-medium text-foreground truncate">{p.counterparty}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-sm font-bold ${p.payment_type === "Incoming" ? "text-success" : "text-foreground"}`}>
                        {p.payment_type === "Incoming" ? "+" : "-"}{fmt(p.amount)}
                      </span>
                      {Number(p.tax_amount) > 0 && <p className="text-[10px] text-warning">Tax: {fmt(Number(p.tax_amount))}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">{p.description}</p>
                  <div className="flex items-center gap-3 mt-3 ml-6 text-xs text-muted-foreground">
                    <span>{p.method}</span>
                    <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${sc.color}`}>
                      <sc.icon className="h-3 w-3" />{p.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Payment Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Add Payment</h2>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10"><Plus className="h-5 w-5 rotate-45" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Invoice payment" required className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Counterparty</label>
                <input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="e.g. Acme Corp" required className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Amount ($)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" step="0.01" required className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="Incoming">Incoming</option>
                    <option value="Outgoing">Outgoing</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Method</label>
                  <select value={method} onChange={e => setMethod(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {["Bank Transfer", "Credit Card", "PayPal", "SSLCommerz", "Cash"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tax Profile</label>
                  <select value={selectedTaxProfile} onChange={e => setSelectedTaxProfile(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">No Tax</option>
                    {taxProfiles.map(tp => <option key={tp.id} value={tp.id}>{tp.name} ({tp.region})</option>)}
                  </select>
                </div>
              </div>
              {taxAmount > 0 && (
                <div className="bg-secondary/30 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground"><span>Base Amount</span><span>{fmt(amountNum)}</span></div>
                  <div className="flex justify-between text-warning"><span>Tax</span><span>+{fmt(taxAmount)}</span></div>
                  <div className="flex justify-between font-bold text-foreground border-t border-border pt-1"><span>Total</span><span>{fmt(amountNum + taxAmount)}</span></div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDialogOpen(false)} className="flex-1 h-10 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Add Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
