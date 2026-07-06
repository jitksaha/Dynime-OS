import { useState, useEffect } from "react";
import { Layers, Plus, Pencil, Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  description: string | null;
  head_name: string | null;
  employee_count: number;
}

export default function CompanyDepartments() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "", head_name: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase.from("departments").select("*").eq("tenant_id", profile.tenant_id);
    if (data) setDepartments(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.tenant_id]);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", head_name: "" }); setShowForm(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ name: d.name, description: d.description || "", head_name: d.head_name || "" }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !profile?.tenant_id) { toast.error("Name required"); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("departments").update({ name: form.name, description: form.description || null, head_name: form.head_name || null }).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Updated");
    } else {
      const { error } = await supabase.from("departments").insert({ name: form.name, description: form.description || null, head_name: form.head_name || null, tenant_id: profile.tenant_id });
      if (error) toast.error(error.message); else toast.success("Created");
    }
    setSaving(false); setShowForm(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchData(); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">{departments.length} departments</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="h-4 w-4" /> Add</button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{editing ? "Edit" : "Create"} Department</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-md text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Head</label><input value={form.head_name} onChange={(e) => setForm({ ...form, head_name: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
        </div>
      )}

      <div className="space-y-2">
        {departments.map((d) => (
          <div key={d.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Layers className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.description || "No description"} {d.head_name ? `· Head: ${d.head_name}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {d.employee_count}</span>
              <button onClick={() => openEdit(d)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {departments.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No departments yet</p>}
      </div>
    </div>
  );
}
