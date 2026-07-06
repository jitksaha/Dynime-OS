import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, Plus, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Inspection { id: string; title: string; inspection_type: string; inspector_name: string; status: string; defects_found: number; pass_rate: number; root_cause: string; corrective_action: string; inspected_at: string; created_at: string; }

export default function QualityControl() {
  const { tenantId, userId } = useTenant();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", inspection_type: "product", inspector_name: "", defects_found: "0", pass_rate: "100" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("qc_inspections" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setInspections((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createInspection = async () => {
    if (!form.title || !tenantId) return;
    const { error } = await supabase.from("qc_inspections" as any).insert({
      ...form, defects_found: Number(form.defects_found), pass_rate: Number(form.pass_rate),
      tenant_id: tenantId, created_by: userId, inspected_at: new Date().toISOString(),
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Inspection recorded");
    setShowForm(false);
    fetchData();
  };

  const avgPassRate = inspections.length > 0 ? (inspections.reduce((a, i) => a + i.pass_rate, 0) / inspections.length).toFixed(1) : "0";
  const totalDefects = inspections.reduce((a, i) => a + i.defects_found, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" /> Quality Control</h1>
          <p className="text-sm text-muted-foreground mt-1">Inspection checklists, defect tracking, and root cause analysis</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Inspection</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{inspections.length}</p><p className="text-xs text-muted-foreground">Inspections</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className={`text-2xl font-bold ${Number(avgPassRate) >= 90 ? "text-success" : "text-warning"}`}>{avgPassRate}%</p><p className="text-xs text-muted-foreground">Avg Pass Rate</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-destructive">{totalDefects}</p><p className="text-xs text-muted-foreground">Total Defects</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{inspections.filter(i => i.status === "passed").length}</p><p className="text-xs text-muted-foreground">Passed</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">Record Inspection</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Inspection title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Inspector name" value={form.inspector_name} onChange={e => setForm(p => ({ ...p, inspector_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <select value={form.inspection_type} onChange={e => setForm(p => ({ ...p, inspection_type: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="product">Product</option><option value="process">Process</option><option value="service">Service</option><option value="facility">Facility</option>
            </select>
            <input type="number" placeholder="Defects found" value={form.defects_found} onChange={e => setForm(p => ({ ...p, defects_found: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="number" placeholder="Pass rate %" value={form.pass_rate} onChange={e => setForm(p => ({ ...p, pass_rate: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" min="0" max="100" />
          </div>
          <div className="flex gap-2">
            <button onClick={createInspection} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Record</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {inspections.length === 0 ? (
          <div className="text-center py-12"><ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No inspections recorded yet</p></div>
        ) : inspections.map(i => (
          <div key={i.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            {i.pass_rate >= 90 ? <CheckCircle className="h-5 w-5 text-success shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.inspection_type} · {i.inspector_name || "Unassigned"} · {i.defects_found} defects</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${i.pass_rate >= 90 ? "bg-success" : i.pass_rate >= 70 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${i.pass_rate}%` }} /></div>
              <span className="text-xs font-medium text-foreground">{i.pass_rate}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
