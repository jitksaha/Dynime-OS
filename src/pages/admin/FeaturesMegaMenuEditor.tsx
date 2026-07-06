import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Save, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { useAppInfo } from "@/hooks/useAppInfo";
import type { MegaMenuItem } from "@/components/MegaMenuDropdown";

const availableIcons = [
  "Users", "Target", "Megaphone", "GitBranch", "Receipt", "Headphones",
  "FolderKanban", "FileText", "BarChart3", "MessageSquare", "ShoppingCart",
  "Calendar", "Wallet", "Percent", "Briefcase", "Globe", "Zap", "Shield",
  "Settings", "Star", "Heart", "GraduationCap", "Factory", "ShoppingBag",
  "Laptop", "Landmark", "Hotel", "HardHat", "Truck", "HandHeart", "Building2", "Scale",
];

/** Build default features using dynamic app name */
function buildDefaults(appName: string): MegaMenuItem[] {
  return [
    { icon: "Users", title: `${appName} HRM`, desc: "Employee management & payroll", path: "/features/hrm", color: "hsl(243,75%,58%)" },
    { icon: "Target", title: `${appName} CRM`, desc: "Sales pipeline & contacts", path: "/features/crm", color: "hsl(142,71%,45%)" },
    { icon: "Megaphone", title: `${appName} Marketing`, desc: "Campaigns & analytics", path: "/features/marketing", color: "hsl(270,80%,60%)" },
    { icon: "GitBranch", title: `${appName} Workflows`, desc: "Automation builder", path: "/features/workflows", color: "hsl(38,92%,50%)" },
    { icon: "Receipt", title: `${appName} Accounting`, desc: "Invoicing & expenses", path: "/features/accounting", color: "hsl(199,89%,48%)" },
    { icon: "Headphones", title: `${appName} Helpdesk`, desc: "Tickets & support", path: "/features/helpdesk", color: "hsl(0,72%,50%)" },
    { icon: "FolderKanban", title: `${appName} Projects`, desc: "Tasks & collaboration", path: "/features/projects", color: "hsl(200,80%,55%)" },
    { icon: "FileText", title: `${appName} Documents`, desc: "File storage & sharing", path: "/features/documents", color: "hsl(38,92%,50%)" },
    { icon: "BarChart3", title: `${appName} Reports`, desc: "Dashboards & insights", path: "/features/reports", color: "hsl(290,65%,55%)" },
    { icon: "MessageSquare", title: `${appName} Team Chat`, desc: "Real-time messaging", path: "/features/team-chat", color: "hsl(270,80%,60%)" },
    { icon: "ShoppingCart", title: `${appName} POS`, desc: "POS & inventory", path: "/features/pos", color: "hsl(38,92%,50%)" },
    { icon: "Calendar", title: `${appName} Calendar`, desc: "Events & scheduling", path: "/features/calendar", color: "hsl(199,89%,48%)" },
    { icon: "Wallet", title: `${appName} Wallet`, desc: "Payments & billing", path: "/features/wallet", color: "hsl(142,71%,45%)" },
    { icon: "Percent", title: `${appName} Tax`, desc: "Multi-jurisdiction tax", path: "/features/tax-compliance", color: "hsl(0,72%,50%)" },
  ];
}

const emptyItem: MegaMenuItem = { title: "", desc: "", path: "/features/", icon: "Users", color: "hsl(243,75%,58%)", visible: true };

export default function FeaturesMegaMenuEditor() {
  const { appInfo } = useAppInfo();
  const appName = appInfo.app_name || "Dynime";
  const [items, setItems] = useState<MegaMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<MegaMenuItem>(emptyItem);
  const [showAdd, setShowAdd] = useState(false);
  const [newData, setNewData] = useState<MegaMenuItem>({ ...emptyItem });

  const fetchItems = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "feature_mega_menu")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      setItems(data.value as unknown as MegaMenuItem[]);
    } else {
      // Auto-seed with defaults using dynamic app name
      const defaults = buildDefaults(appName);
      setItems(defaults);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [appName]);

  const saveItems = async (updated: MegaMenuItem[]) => {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "feature_mega_menu", value: updated as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) { toast.error(error.message); return false; }
    setItems(updated);
    return true;
  };

  const handleAdd = async () => {
    if (!newData.title || !newData.path) { toast.error("Title and path are required"); return; }
    const ok = await saveItems([...items, newData]);
    if (ok) { toast.success("Feature added"); setShowAdd(false); setNewData({ ...emptyItem }); }
  };

  const handleSaveEdit = async () => {
    if (editIdx === null) return;
    const updated = [...items];
    updated[editIdx] = editData;
    const ok = await saveItems(updated);
    if (ok) { toast.success("Updated"); setEditIdx(null); }
  };

  const handleDelete = async (idx: number) => {
    const ok = await saveItems(items.filter((_, i) => i !== idx));
    if (ok) toast.success("Deleted");
  };

  const toggleVisibility = async (idx: number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
    await saveItems(updated);
  };

  const handleSyncDefaults = async () => {
    const defaults = buildDefaults(appName);
    const ok = await saveItems(defaults);
    if (ok) toast.success("Reset to defaults with current app name");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Features.</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the Features dropdown items on the public navigation. Items sync dynamically with "{appName}".</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSyncDefaults} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 text-muted-foreground" title="Reset to defaults using current app name">
            <RefreshCw className="h-4 w-4" /> Sync Defaults
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Feature
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Feature Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Title</label>
              <input value={newData.title} onChange={e => setNewData({ ...newData, title: e.target.value })} placeholder={`e.g. ${appName} HRM`} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Path</label>
              <input value={newData.path} onChange={e => setNewData({ ...newData, path: e.target.value })} placeholder="/features/hrm" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Icon</label>
              <select value={newData.icon} onChange={e => setNewData({ ...newData, icon: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {availableIcons.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Color (HSL)</label>
              <input value={newData.color} onChange={e => setNewData({ ...newData, color: e.target.value })} placeholder="hsl(243,75%,58%)" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <input value={newData.desc} onChange={e => setNewData({ ...newData, desc: e.target.value })} placeholder="Short description..." className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No feature items configured.</p>
          <p className="text-xs mt-1">Click "Sync Defaults" to populate with default features.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">All Features ({items.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {items.map((item, idx) => (
              <div key={idx} className="px-5 py-4">
                {editIdx === idx ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" placeholder="Title" />
                      <input value={editData.path} onChange={e => setEditData({ ...editData, path: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" placeholder="Path" />
                      <select value={editData.icon} onChange={e => setEditData({ ...editData, icon: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                        {availableIcons.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={editData.color} onChange={e => setEditData({ ...editData, color: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" placeholder="Color" />
                      <input value={editData.desc} onChange={e => setEditData({ ...editData, desc: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" placeholder="Description" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"><Save className="h-3 w-3" /> Save</button>
                      <button onClick={() => setEditIdx(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium"><X className="h-3 w-3" /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + "15" }}>
                        <span className="text-xs font-bold" style={{ color: item.color }}>{item.icon.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                          {item.visible === false && <span className="ml-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Hidden</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.path} • {item.icon}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleVisibility(idx)} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors text-xs">
                        {item.visible !== false ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => { setEditIdx(idx); setEditData(item); }} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
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