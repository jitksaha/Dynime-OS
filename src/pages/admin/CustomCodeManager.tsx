import { useState, useEffect } from "react";
import { Code, Plus, Trash2, Save, ToggleLeft, ToggleRight, FileCode2, Paintbrush } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface Snippet {
  id: string;
  type: "css" | "js";
  name: string;
  code: string;
  is_active: boolean;
  scope: string;
  created_at: string;
}

const EMPTY_SNIPPET: Omit<Snippet, "id" | "created_at"> = {
  type: "css",
  name: "",
  code: "",
  is_active: true,
  scope: "global",
};

export default function CustomCodeManager() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"css" | "js">("css");
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSnippets = async () => {
    const { data, error } = await supabase
      .from("custom_code_snippets")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setSnippets(data as Snippet[]);
    setLoading(false);
  };

  useEffect(() => { fetchSnippets(); }, []);

  const filtered = snippets.filter((s) => s.type === activeTab);

  const handleNew = () => {
    setEditing({ ...EMPTY_SNIPPET, type: activeTab, id: "", created_at: "" } as Snippet);
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);

    if (isNew) {
      const { error } = await supabase.from("custom_code_snippets").insert({
        type: editing.type,
        name: editing.name,
        code: editing.code,
        is_active: editing.is_active,
        scope: editing.scope,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Snippet created");
    } else {
      const { error } = await supabase.from("custom_code_snippets").update({
        name: editing.name,
        code: editing.code,
        is_active: editing.is_active,
        scope: editing.scope,
      }).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Snippet updated");
    }

    setEditing(null);
    setIsNew(false);
    setSaving(false);
    fetchSnippets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this snippet?")) return;
    const { error } = await supabase.from("custom_code_snippets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Snippet deleted");
    if (editing?.id === id) { setEditing(null); setIsNew(false); }
    fetchSnippets();
  };

  const _toggleActive = async (snippet: Snippet) => {
    const { error } = await supabase.from("custom_code_snippets").update({ is_active: !snippet.is_active }).eq("id", snippet.id);
    if (error) { toast.error(error.message); return; }
    fetchSnippets();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Custom Code Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Add custom CSS & JavaScript snippets for quick design tweaks and small features</p>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Snippet
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
        {[
          { key: "css" as const, label: "CSS", icon: Paintbrush },
          { key: "js" as const, label: "JavaScript", icon: FileCode2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setEditing(null); setIsNew(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Snippet List */}
        <div className="space-y-3">
          {filtered.length === 0 && !editing && (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Code className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No {activeTab.toUpperCase()} snippets yet</p>
              <button onClick={handleNew} className="text-sm text-primary font-medium mt-2 hover:underline">Create one</button>
            </div>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => { setEditing(s); setIsNew(false); }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${editing?.id === s.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {s.type === "css" ? <Paintbrush className="h-4 w-4 text-primary shrink-0" /> : <FileCode2 className="h-4 w-4 text-primary shrink-0" />}
                  <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {s.is_active ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate font-mono">{s.code.slice(0, 60) || "(empty)"}</p>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {editing ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{isNew ? "New" : "Edit"} {editing.type.toUpperCase()} Snippet</h2>
                <div className="flex items-center gap-2">
                  {!isNew && (
                    <button onClick={() => handleDelete(editing.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. Hide footer on mobile"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1">Scope</label>
                    <select
                      value={editing.scope}
                      onChange={(e) => setEditing({ ...editing, scope: e.target.value })}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="global">Global</option>
                      <option value="dashboard">Dashboard Only</option>
                      <option value="portal">Portal Only</option>
                      <option value="public">Public Pages Only</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                    className={`flex items-center gap-2 h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${editing.is_active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-input bg-background text-muted-foreground"}`}
                  >
                    {editing.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {editing.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Code</label>
                <textarea
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  placeholder={editing.type === "css"
                    ? "/* Custom CSS */\n.my-class {\n  color: red;\n}"
                    : "// Custom JavaScript\nconsole.log('Hello!');"
                  }
                  rows={16}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-mono leading-relaxed resize-y"
                  spellCheck={false}
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>⚠️ Caution:</strong> {editing.type === "js" ? "Custom JavaScript runs in the browser and can affect functionality. Test thoroughly before activating." : "Custom CSS overrides may affect the app layout. Use specific selectors to avoid conflicts."}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Select a snippet to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
