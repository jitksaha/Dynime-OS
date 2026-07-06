import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Calendar, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Allocation { id: string; resource_name: string; resource_type: string; project_name: string; allocation_percent: number; start_date: string; end_date: string; status: string; notes: string; }

export default function ResourcePlanner() {
  const { tenantId, userId } = useTenant();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ resource_name: "", resource_type: "person", project_name: "", allocation_percent: "100", start_date: "", end_date: "" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("resource_allocations" as any).select("*").eq("tenant_id", tenantId).order("start_date");
    setAllocations((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createAllocation = async () => {
    if (!form.resource_name || !tenantId) return;
    const { error } = await supabase.from("resource_allocations" as any).insert({
      ...form, allocation_percent: Number(form.allocation_percent) || 100, tenant_id: tenantId, created_by: userId,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Resource allocated");
    setShowForm(false);
    fetchData();
  };

  const resourceGroups = allocations.reduce((acc, a) => { acc[a.resource_name] = (acc[a.resource_name] || 0) + a.allocation_percent; return acc; }, {} as Record<string, number>);
  const overbooked = Object.entries(resourceGroups).filter(([, pct]) => pct > 100);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Resource Planner</h1>
          <p className="text-sm text-muted-foreground mt-1">Visual capacity planning across people, rooms, and equipment</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> Allocate</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{allocations.length}</p><p className="text-xs text-muted-foreground">Allocations</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{Object.keys(resourceGroups).length}</p><p className="text-xs text-muted-foreground">Resources</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-destructive">{overbooked.length}</p><p className="text-xs text-muted-foreground">Overbooked</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{allocations.filter(a => a.status === "active").length}</p><p className="text-xs text-muted-foreground">Active</p></div>
      </div>

      {overbooked.length > 0 && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs font-medium text-destructive">⚠️ Overbooked: {overbooked.map(([name, pct]) => `${name} (${pct}%)`).join(", ")}</p>
        </div>
      )}

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">Allocate Resource</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Resource name" value={form.resource_name} onChange={e => setForm(p => ({ ...p, resource_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <select value={form.resource_type} onChange={e => setForm(p => ({ ...p, resource_type: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="person">Person</option><option value="room">Room</option><option value="equipment">Equipment</option>
            </select>
            <input placeholder="Project name" value={form.project_name} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input type="number" placeholder="Allocation %" value={form.allocation_percent} onChange={e => setForm(p => ({ ...p, allocation_percent: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" min="1" max="100" />
            <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createAllocation} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Allocate</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {allocations.length === 0 ? (
          <div className="text-center py-12"><Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No resource allocations yet</p></div>
        ) : allocations.map(a => (
          <div key={a.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{a.resource_name.charAt(0)}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{a.resource_name}</p>
              <p className="text-xs text-muted-foreground">{a.project_name || "Unassigned"} · {a.start_date} → {a.end_date}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${a.allocation_percent > 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(a.allocation_percent, 100)}%` }} /></div>
              <span className="text-xs font-medium text-foreground">{a.allocation_percent}%</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground">{a.resource_type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
