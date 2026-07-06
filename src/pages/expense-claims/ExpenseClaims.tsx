// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Receipt, Plus, Camera, Car, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Claim { id: string; employee_name: string; title: string; total_amount: number; currency: string; status: string; category: string; mileage_km: number | null; per_diem_days: number | null; approved_by: string | null; approved_at: string | null; notes: string; created_at: string; }

const STATUS_COLORS: Record<string, string> = { draft: "bg-secondary text-muted-foreground", submitted: "bg-blue-100 text-blue-700", approved: "bg-success/10 text-success", rejected: "bg-destructive/10 text-destructive", paid: "bg-primary/10 text-primary" };

export default function ExpenseClaimsPage() {
  const { tenantId, userId } = useTenant();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: "", title: "", total_amount: "", category: "travel", currency: "USD" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("expense_claims" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setClaims((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createClaim = async () => {
    if (!form.title || !form.employee_name || !tenantId) return;
    const { error } = await supabase.from("expense_claims" as any).insert({
      ...form, total_amount: Number(form.total_amount) || 0, tenant_id: tenantId, created_by: userId, status: "submitted",
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim submitted");
    setShowForm(false);
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("expense_claims" as any).update({ status, ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}) } as any).eq("id", id);
    toast.success(`Claim ${status}`);
    fetchData();
  };

  const totalPending = claims.filter(c => c.status === "submitted").reduce((a, c) => a + c.total_amount, 0);
  const totalApproved = claims.filter(c => ["approved", "paid"].includes(c.status)).reduce((a, c) => a + c.total_amount, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> Expense Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit, review, and approve employee expense claims</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Claim</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{claims.length}</p><p className="text-xs text-muted-foreground">Total Claims</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">${totalApproved.toLocaleString()}</p><p className="text-xs text-muted-foreground">Approved</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-destructive">{claims.filter(c => c.status === "rejected").length}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">Submit Expense Claim</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Employee name" value={form.employee_name} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Claim title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input type="number" placeholder="Amount" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="travel">Travel</option><option value="meals">Meals</option><option value="supplies">Supplies</option><option value="equipment">Equipment</option><option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={createClaim} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Submit</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {claims.length === 0 ? (
          <div className="text-center py-12"><Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No expense claims yet</p></div>
        ) : claims.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{c.employee_name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.employee_name} · {c.category} · {new Date(c.created_at).toLocaleDateString()}</p>
            </div>
            <p className="text-sm font-bold text-foreground">{c.currency} {c.total_amount.toLocaleString()}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || "bg-secondary text-foreground"}`}>{c.status}</span>
            {c.status === "submitted" && (
              <div className="flex gap-1">
                <button onClick={() => updateStatus(c.id, "approved")} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => updateStatus(c.id, "rejected")} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
