import { useState, useEffect } from "react";
import { Loader2, Plus, PiggyBank, TrendingUp, AlertCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";

export default function BudgetTracking() {
  const { tenantId, supabase } = useTenant();
  const { user } = useAuth();
  const { formatPrice } = useTenantCurrency();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "General", allocated_amount: "", period: "monthly", start_date: "" });

  const fetch = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("budgets").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setBudgets(data || []); setLoading(false);
  };
  useEffect(() => { fetch(); }, [tenantId]);

  const handleSubmit = async () => {
    if (!tenantId || !user || !form.name || !form.allocated_amount) return;
    const { error } = await supabase.from("budgets").insert({
      tenant_id: tenantId, created_by: user.id, name: form.name, category: form.category,
      allocated_amount: Number(form.allocated_amount), period: form.period,
      start_date: form.start_date || new Date().toISOString().split('T')[0],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Budget created!"); setShowForm(false);
    setForm({ name: "", category: "General", allocated_amount: "", period: "monthly", start_date: "" }); fetch();
  };

  const handleSpendUpdate = async (id: string, newSpent: string) => {
    await supabase.from("budgets").update({ spent_amount: Number(newSpent) }).eq("id", id);
    fetch();
  };

  const totalAllocated = budgets.filter(b => b.status === 'Active').reduce((s, b) => s + Number(b.allocated_amount || 0), 0);
  const totalSpent = budgets.filter(b => b.status === 'Active').reduce((s, b) => s + Number(b.spent_amount || 0), 0);
  const overBudget = budgets.filter(b => Number(b.spent_amount) > Number(b.allocated_amount)).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">Budget Tracking</h1><p className="text-sm text-muted-foreground mt-0.5">Set and track department budgets</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"><Plus className="h-4 w-4" /> New Budget</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3"><PiggyBank className="h-4 w-4 text-primary" /></div>
          <p className="text-lg font-bold text-foreground">{formatPrice(totalAllocated)}</p><p className="text-xs text-muted-foreground">Total Allocated</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-warning/10 w-fit mb-3"><TrendingUp className="h-4 w-4 text-warning" /></div>
          <p className="text-lg font-bold text-foreground">{formatPrice(totalSpent)}</p><p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-[10px] text-muted-foreground mt-1">{totalAllocated > 0 ? Math.round((totalSpent/totalAllocated)*100) : 0}% utilized</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-destructive/10 w-fit mb-3"><AlertCircle className="h-4 w-4 text-destructive" /></div>
          <p className="text-lg font-bold text-foreground">{overBudget}</p><p className="text-xs text-muted-foreground">Over Budget</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">New Budget</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Marketing Q1" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"><option>General</option><option>Marketing</option><option>Operations</option><option>IT</option><option>HR</option><option>Sales</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Allocated Amount</label><input type="number" value={form.allocated_amount} onChange={e => setForm({...form, allocated_amount: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Period</label><select value={form.period} onChange={e => setForm({...form, period: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {budgets.length === 0 ? (
          <div className="py-12 text-center bg-card border border-border rounded-xl"><PiggyBank className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No budgets created</p></div>
        ) : budgets.map(b => {
          const pct = Number(b.allocated_amount) > 0 ? Math.round((Number(b.spent_amount) / Number(b.allocated_amount)) * 100) : 0;
          const over = pct > 100;
          return (
            <div key={b.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.category} · {b.period}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{b.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Spent: {formatPrice(b.spent_amount)}</span>
                <span>Budget: {formatPrice(b.allocated_amount)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : pct > 80 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className={`text-xs font-medium ${over ? 'text-destructive' : 'text-muted-foreground'}`}>{pct}% utilized{over ? ' — Over Budget!' : ''}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
