import { useState, useEffect } from "react";
import { Loader2, Plus, RefreshCw, FileText, Pause, Play } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";

export default function RecurringInvoices() {
  const { tenantId, supabase } = useTenant();
  const { user } = useAuth();
  const { formatPrice } = useTenantCurrency();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client: "", amount: "", frequency: "monthly", next_date: "" });

  const fetch = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("recurring_invoices").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { fetch(); }, [tenantId]);

  const handleSubmit = async () => {
    if (!tenantId || !user || !form.client || !form.amount || !form.next_date) return;
    const { error } = await supabase.from("recurring_invoices").insert({
      tenant_id: tenantId, created_by: user.id, client: form.client,
      amount: Number(form.amount), frequency: form.frequency, next_date: form.next_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Recurring invoice created!"); setShowForm(false);
    setForm({ client: "", amount: "", frequency: "monthly", next_date: "" }); fetch();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("recurring_invoices").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Paused" : "Activated"); fetch();
  };

  const activeTotal = items.filter(i => i.is_active).reduce((s, i) => s + Number(i.amount || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">Recurring Invoices</h1><p className="text-sm text-muted-foreground mt-0.5">Auto-generate invoices on schedule</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"><Plus className="h-4 w-4" /> New Recurring</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3"><RefreshCw className="h-4 w-4 text-primary" /></div>
          <p className="text-lg font-bold text-foreground">{items.filter(i => i.is_active).length}</p><p className="text-xs text-muted-foreground">Active Schedules</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-success/10 w-fit mb-3"><FileText className="h-4 w-4 text-success" /></div>
          <p className="text-lg font-bold text-foreground">{formatPrice(activeTotal)}</p><p className="text-xs text-muted-foreground">Monthly Recurring</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-info/10 w-fit mb-3"><FileText className="h-4 w-4 text-info" /></div>
          <p className="text-lg font-bold text-foreground">{items.reduce((s, i) => s + (i.total_generated || 0), 0)}</p><p className="text-xs text-muted-foreground">Total Generated</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">New Recurring Invoice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Client</label><input value={form.client} onChange={e => setForm({...form, client: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Frequency</label><select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="weekly">Weekly</option><option value="biweekly">Bi-Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Next Date</label><input type="date" value={form.next_date} onChange={e => setForm({...form, next_date: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="py-12 text-center"><RefreshCw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No recurring invoices</p></div>
        ) : items.map(i => (
          <div key={i.id} className="px-5 py-4 border-b border-border last:border-b-0 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{i.client}</p>
              <p className="text-xs text-muted-foreground">{formatPrice(i.amount)} · {i.frequency} · Next: {new Date(i.next_date).toLocaleDateString()}</p>
              <p className="text-[10px] text-muted-foreground">{i.total_generated} invoices generated</p>
            </div>
            <button onClick={() => toggleActive(i.id, i.is_active)} className={`p-2 rounded-lg transition-colors ${i.is_active ? 'bg-success/10 hover:bg-success/20 text-success' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
              {i.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${i.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{i.is_active ? 'Active' : 'Paused'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
