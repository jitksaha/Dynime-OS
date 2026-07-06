import { useState, useEffect } from "react";
import { GitBranch, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const MODULES = ["HR", "Finance", "CRM", "Marketing", "Projects", "General"];

interface Workflow {
  id: string;
  name: string;
  module: string;
  description: string | null;
  steps: any[];
  is_active: boolean;
}

export default function CompanyApprovalWorkflows() {
  const { user, profile } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [form, setForm] = useState({ name: "", module: "General", description: "", steps: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase.from("approval_workflows").select("*").eq("tenant_id", profile.tenant_id);
    if (data) setWorkflows(data.map((w: any) => ({ ...w, steps: Array.isArray(w.steps) ? w.steps : [] })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.tenant_id]);

  const openCreate = () => { setEditing(null); setForm({ name: "", module: "General", description: "", steps: "" }); setShowForm(true); };
  const openEdit = (w: Workflow) => { setEditing(w); setForm({ name: w.name, module: w.module, description: w.description || "", steps: w.steps.map((s: any) => s.name || s).join(", ") }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !profile?.tenant_id) { toast.error("Name required"); return; }
    setSaving(true);
    const stepsArr = form.steps.split(",").map((s) => s.trim()).filter(Boolean).map((name, i) => ({ order: i + 1, name }));
    if (editing) {
      const { error } = await supabase.from("approval_workflows").update({ name: form.name, module: form.module, description: form.description || null, steps: stepsArr }).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Updated");
    } else {
      const { error } = await supabase.from("approval_workflows").insert({ name: form.name, module: form.module, description: form.description || null, steps: stepsArr, tenant_id: profile.tenant_id, created_by: user!.id });
      if (error) toast.error(error.message); else toast.success("Created");
    }
    setSaving(false); setShowForm(false); fetchData();
  };

  const toggleActive = async (w: Workflow) => {
    await supabase.from("approval_workflows").update({ is_active: !w.is_active }).eq("id", w.id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("approval_workflows").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchData(); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Approval Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure approval processes for your company</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="h-4 w-4" /> Add Workflow</button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{editing ? "Edit" : "Create"} Workflow</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-md text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Module</label><select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">{MODULES.map((m) => <option key={m}>{m}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Steps (comma-separated)</label><input value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} placeholder="Manager, HR, Director" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
        </div>
      )}

      <div className="space-y-2">
        {workflows.map((w) => (
          <div key={w.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${w.is_active ? "bg-chart-2/10" : "bg-muted"}`}>
                <GitBranch className={`h-4 w-4 ${w.is_active ? "text-chart-2" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.module} · {w.steps.length} step{w.steps.length !== 1 ? "s" : ""}</p>
                {w.steps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {w.steps.map((s: any, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{s.name || s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => toggleActive(w)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10">{w.is_active ? <ToggleRight className="h-4 w-4 text-chart-2" /> : <ToggleLeft className="h-4 w-4" />}</button>
              <button onClick={() => openEdit(w)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(w.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {workflows.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No workflows yet</p>}
      </div>
    </div>
  );
}
