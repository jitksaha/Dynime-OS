import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Schedule { id: string; contract_name: string; customer_name: string; total_value: number; recognized_amount: number; deferred_amount: number; recognition_method: string; start_date: string; end_date: string; status: string; }

export default function RevenueRecognition() {
  const { tenantId, userId } = useTenant();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ contract_name: "", customer_name: "", total_value: "", recognition_method: "straight_line", start_date: "", end_date: "" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("revenue_schedules" as any).select("*").eq("tenant_id", tenantId).order("start_date", { ascending: false });
    setSchedules((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createSchedule = async () => {
    if (!form.contract_name || !form.customer_name || !tenantId) return;
    const total = Number(form.total_value) || 0;
    const { error } = await supabase.from("revenue_schedules" as any).insert({
      ...form, total_value: total, deferred_amount: total, tenant_id: tenantId, created_by: userId,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Revenue schedule created");
    setShowForm(false);
    fetchData();
  };

  const totalRevenue = schedules.reduce((a, s) => a + s.total_value, 0);
  const totalRecognized = schedules.reduce((a, s) => a + s.recognized_amount, 0);
  const totalDeferred = schedules.reduce((a, s) => a + s.deferred_amount, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Revenue Recognition</h1>
          <p className="text-sm text-muted-foreground mt-1">Track deferred revenue, milestone-based recognition, and ASC 606 compliance</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Schedule</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Contract Value</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">${totalRecognized.toLocaleString()}</p><p className="text-xs text-muted-foreground">Recognized</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-warning">${totalDeferred.toLocaleString()}</p><p className="text-xs text-muted-foreground">Deferred</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Revenue Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Contract name" value={form.contract_name} onChange={e => setForm(p => ({ ...p, contract_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Customer name" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input type="number" placeholder="Total value" value={form.total_value} onChange={e => setForm(p => ({ ...p, total_value: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <select value={form.recognition_method} onChange={e => setForm(p => ({ ...p, recognition_method: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="straight_line">Straight Line</option><option value="milestone">Milestone-Based</option><option value="usage">Usage-Based</option>
            </select>
            <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createSchedule} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {schedules.length === 0 ? (
          <div className="text-center py-12"><BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No revenue schedules yet</p></div>
        ) : schedules.map(s => {
          const pct = s.total_value > 0 ? Math.round((s.recognized_amount / s.total_value) * 100) : 0;
          return (
            <div key={s.id} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.contract_name}</p>
                  <p className="text-xs text-muted-foreground">{s.customer_name} · {s.recognition_method.replace("_", " ")} · {s.start_date} → {s.end_date}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{s.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium text-foreground">{pct}%</span>
                <span className="text-xs text-muted-foreground">${s.recognized_amount.toLocaleString()} / ${s.total_value.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
