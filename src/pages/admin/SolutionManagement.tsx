import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Save, X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface Solution {
  slug: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const availableIcons = [
  "Heart", "GraduationCap", "Factory", "ShoppingBag", "Laptop", "Landmark",
  "Hotel", "HardHat", "Truck", "HandHeart", "Building2", "Scale",
];

export default function SolutionManagement() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<Solution>({ slug: "", name: "", icon: "Heart", description: "", color: "hsl(0,72%,50%)" });
  const [showAdd, setShowAdd] = useState(false);
  const [newData, setNewData] = useState<Solution>({ slug: "", name: "", icon: "Heart", description: "", color: "hsl(200,80%,55%)" });

  const fetchSolutions = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "industry_solutions")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      setSolutions(data.value as unknown as Solution[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSolutions(); }, []);

  const saveSolutions = async (updated: Solution[]) => {
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: updated as any, updated_at: new Date().toISOString() })
      .eq("key", "industry_solutions");
    if (error) { toast.error(error.message); return false; }
    setSolutions(updated);
    return true;
  };

  const handleAdd = async () => {
    if (!newData.name || !newData.slug) { toast.error("Name and slug are required"); return; }
    if (solutions.some(s => s.slug === newData.slug)) { toast.error("Slug already exists"); return; }
    const ok = await saveSolutions([...solutions, newData]);
    if (ok) {
      toast.success("Industry solution added");
      setShowAdd(false);
      setNewData({ slug: "", name: "", icon: "Heart", description: "", color: "hsl(200,80%,55%)" });
    }
  };

  const handleSaveEdit = async () => {
    if (editIdx === null) return;
    const updated = [...solutions];
    updated[editIdx] = editData;
    const ok = await saveSolutions(updated);
    if (ok) { toast.success("Updated"); setEditIdx(null); }
  };

  const handleDelete = async (idx: number) => {
    const updated = solutions.filter((_, i) => i !== idx);
    const ok = await saveSolutions(updated);
    if (ok) toast.success("Deleted");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Industry Solutions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the Solutions mega menu on the public website</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Solution
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border-2 border-destructive/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Industry Solution</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name</label>
              <input value={newData.name} onChange={e => setNewData({ ...newData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "") })} placeholder="e.g. Healthcare" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Slug</label>
              <input value={newData.slug} onChange={e => setNewData({ ...newData, slug: e.target.value })} placeholder="e.g. healthcare" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Icon</label>
              <select value={newData.icon} onChange={e => setNewData({ ...newData, icon: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {availableIcons.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Color (HSL)</label>
              <input value={newData.color} onChange={e => setNewData({ ...newData, color: e.target.value })} placeholder="hsl(0,72%,50%)" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <input value={newData.description} onChange={e => setNewData({ ...newData, description: e.target.value })} placeholder="Short description..." className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-destructive border-t-transparent rounded-full animate-spin" /></div>
      ) : solutions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No industry solutions configured.</p></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All Solutions ({solutions.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {solutions.map((s, idx) => (
              <div key={s.slug} className="px-5 py-4">
                {editIdx === idx ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                      <select value={editData.icon} onChange={e => setEditData({ ...editData, icon: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                        {availableIcons.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <input value={editData.color} onChange={e => setEditData({ ...editData, color: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                    </div>
                    <input value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"><Save className="h-3 w-3" /> Save</button>
                      <button onClick={() => setEditIdx(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium"><X className="h-3 w-3" /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + "15" }}>
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.icon.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">/{s.slug} • {s.icon}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditIdx(idx); setEditData(s); }} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(idx)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
