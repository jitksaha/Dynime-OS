import { useState, useEffect, useCallback } from "react";
import { Banknote, Plus, AlertCircle, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Case { id: string; customer_name: string; customer_email: string; amount_due: number; days_overdue: number; status: string; escalation_level: number; last_contacted_at: string | null; notes: string; created_at: string; }

const STATUS_COLORS: Record<string, string> = { friendly: "bg-blue-100 text-blue-700", firm: "bg-warning/10 text-warning", final: "bg-destructive/10 text-destructive", resolved: "bg-success/10 text-success", payment_plan: "bg-purple-100 text-purple-700" };

export default function CollectionsDunning() {
  const { tenantId, userId } = useTenant();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", amount_due: "", days_overdue: "0" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("collection_cases" as any).select("*").eq("tenant_id", tenantId).order("days_overdue", { ascending: false });
    setCases((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createCase = async () => {
    if (!form.customer_name || !tenantId) return;
    const { error } = await supabase.from("collection_cases" as any).insert({
      customer_name: form.customer_name, customer_email: form.customer_email,
      amount_due: Number(form.amount_due) || 0, days_overdue: Number(form.days_overdue) || 0,
      tenant_id: tenantId, created_by: userId,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Collection case created");
    setShowForm(false);
    fetchData();
  };

  const escalate = async (c: Case) => {
    const nextLevel = c.escalation_level + 1;
    const nextStatus = nextLevel >= 3 ? "final" : nextLevel >= 2 ? "firm" : "friendly";
    await supabase.from("collection_cases" as any).update({ escalation_level: nextLevel, status: nextStatus, last_contacted_at: new Date().toISOString() } as any).eq("id", c.id);
    toast.success("Escalated to level " + nextLevel);
    fetchData();
  };

  const totalOutstanding = cases.filter(c => c.status !== "resolved").reduce((a, c) => a + c.amount_due, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Banknote className="h-6 w-6 text-primary" /> Collections & Dunning</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated payment reminders and escalation workflows</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Case</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{cases.length}</p><p className="text-xs text-muted-foreground">Total Cases</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-destructive">${totalOutstanding.toLocaleString()}</p><p className="text-xs text-muted-foreground">Outstanding</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-warning">{cases.filter(c => c.days_overdue > 30).length}</p><p className="text-xs text-muted-foreground">30+ Days</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{cases.filter(c => c.status === "resolved").length}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Collection Case</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Customer name" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Email" value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input type="number" placeholder="Amount due" value={form.amount_due} onChange={e => setForm(p => ({ ...p, amount_due: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="number" placeholder="Days overdue" value={form.days_overdue} onChange={e => setForm(p => ({ ...p, days_overdue: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createCase} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {cases.length === 0 ? (
          <div className="text-center py-12"><Banknote className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No collection cases</p></div>
        ) : cases.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className={`p-2 rounded-lg ${c.days_overdue > 60 ? "bg-destructive/10" : c.days_overdue > 30 ? "bg-warning/10" : "bg-blue-100"}`}>
              {c.days_overdue > 60 ? <AlertCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-warning" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{c.customer_name}</p>
              <p className="text-xs text-muted-foreground">{c.customer_email} · {c.days_overdue} days overdue · Level {c.escalation_level}</p>
            </div>
            <p className="text-sm font-bold text-foreground">${c.amount_due.toLocaleString()}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || "bg-secondary text-foreground"}`}>{c.status}</span>
            {c.status !== "resolved" && (
              <button onClick={() => escalate(c)} className="px-2 py-1 text-xs rounded-md bg-warning/10 text-warning hover:bg-warning/20">Escalate</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
