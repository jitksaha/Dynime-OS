import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface TaxProfile {
  id: string;
  name: string;
  region: string;
  tax_rates: { name: string; rate: number; tax_type: string; is_compound: boolean }[];
}

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  tax_amount: number;
  tax_profile_id: string | null;
  employee_name: string | null;
  expense_date: string;
  status: string;
}

const statusColor: Record<string, string> = {
  Approved: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Rejected: "bg-destructive/10 text-destructive",
};

const categoryColor: Record<string, string> = {
  "Meals & Entertainment": "bg-info/10 text-info",
  Travel: "bg-primary/10 text-primary",
  Software: "bg-accent/10 text-accent",
  Office: "bg-secondary text-muted-foreground",
  Marketing: "bg-warning/10 text-warning",
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

export default function Expenses() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { formatPrice: fmt } = useTenantCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [selectedTaxProfile, setSelectedTaxProfile] = useState("");

  const fetchData = async () => {
    if (!tenantId) return;
    const [expRes, tpRes] = await Promise.all([
      supabase.from("expenses").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("tax_profiles").select("id, name, region").eq("tenant_id", tenantId),
    ]);
    if (expRes.data) setExpenses(expRes.data as Expense[]);
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
    if (!tenantId || !description || !category) return;
    const { error } = await supabase.from("expenses").insert(buildInsert({
      description,
      category,
      amount: amountNum + taxAmount,
      tax_amount: taxAmount,
      tax_profile_id: selectedTaxProfile || null,
      expense_date: date || new Date().toISOString().split("T")[0],
    }));
    if (error) { toast.error(error.message); return; }
    toast.success("Expense added");
    setDialogOpen(false);
    setDescription(""); setCategory(""); setAmount(""); setDate(""); setSelectedTaxProfile("");
    fetchData();
  };

  const totalApproved = expenses.filter(e => e.status === "Approved").reduce((a, b) => a + b.amount, 0);
  const totalPending = expenses.filter(e => e.status === "Pending").reduce((a, b) => a + b.amount, 0);
  const totalTax = expenses.reduce((a, b) => a + (Number(b.tax_amount) || 0), 0);
  const thisMonth = expenses.reduce((a, b) => a + b.amount, 0);

  const categories = ["Meals & Entertainment", "Travel", "Software", "Office", "Marketing"];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Track expenses with tax deductions</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total", value: fmt(thisMonth), color: "text-foreground" },
          { label: "Approved", value: fmt(totalApproved), color: "text-success" },
          { label: "Pending", value: fmt(totalPending), color: "text-warning" },
          { label: "Total Tax", value: fmt(totalTax), color: "text-info" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No expenses yet. Add your first expense.</p></div>
      ) : (
        <>
          <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{exp.description}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor[exp.category] || "bg-secondary text-muted-foreground"}`}>{exp.category}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right font-semibold text-foreground">{fmt(exp.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-right text-warning">{fmt(Number(exp.tax_amount) || 0)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(exp.expense_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[exp.status] || "bg-secondary text-muted-foreground"}`}>{exp.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {expenses.map((exp) => (
              <div key={exp.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${statusColor[exp.status] || ""}`}>{exp.status}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs ${categoryColor[exp.category] || ""} px-2 py-0.5 rounded-full`}>{exp.category}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">{fmt(exp.amount)}</span>
                    {Number(exp.tax_amount) > 0 && <p className="text-[10px] text-warning">Tax: {fmt(Number(exp.tax_amount))}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Expense Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Add Expense</h2>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10"><Plus className="h-5 w-5 rotate-45" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Client dinner" required className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Amount ($)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="250" step="0.01" required className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
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
                <button onClick={handleSubmit} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Add Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
