// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Roster { id: string; employee_name: string; employee_id: string; shift_date: string; start_time: string; end_time: string; shift_type: string; status: string; notes: string; }

export default function ShiftRosterPlanner() {
  const { tenantId, userId } = useTenant();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: "", shift_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "17:00", shift_type: "regular" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("shift_rosters" as any).select("*").eq("tenant_id", tenantId).order("shift_date", { ascending: false });
    setRosters((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createShift = async () => {
    if (!form.employee_name || !tenantId) return;
    const { error } = await supabase.from("shift_rosters" as any).insert({ ...form, tenant_id: tenantId, created_by: userId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Shift assigned");
    setShowForm(false);
    fetchData();
  };

  const SHIFT_COLORS: Record<string, string> = { regular: "bg-blue-100 text-blue-700", morning: "bg-amber-100 text-amber-700", evening: "bg-purple-100 text-purple-700", night: "bg-indigo-100 text-indigo-700", overtime: "bg-destructive/10 text-destructive" };

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /> Shift & Roster Planner</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule shifts, manage availability, and track overtime</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> Assign Shift</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{rosters.length}</p><p className="text-xs text-muted-foreground">Total Shifts</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{new Set(rosters.map(r => r.employee_name)).size}</p><p className="text-xs text-muted-foreground">Employees</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-warning">{rosters.filter(r => r.shift_type === "overtime").length}</p><p className="text-xs text-muted-foreground">Overtime</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{rosters.filter(r => r.status === "completed").length}</p><p className="text-xs text-muted-foreground">Completed</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">Assign New Shift</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Employee name" value={form.employee_name} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input type="date" value={form.shift_date} onChange={e => setForm(p => ({ ...p, shift_date: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <select value={form.shift_type} onChange={e => setForm(p => ({ ...p, shift_type: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="regular">Regular</option><option value="morning">Morning</option><option value="evening">Evening</option><option value="night">Night</option><option value="overtime">Overtime</option>
            </select>
            <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createShift} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rosters.length === 0 ? (
          <div className="text-center py-12"><CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No shifts scheduled</p></div>
        ) : rosters.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{r.employee_name.charAt(0)}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{r.employee_name}</p>
              <p className="text-xs text-muted-foreground">{r.shift_date} · {r.start_time} – {r.end_time}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${SHIFT_COLORS[r.shift_type] || "bg-secondary text-foreground"}`}>{r.shift_type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
