// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { FileText, Plus, Layers, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Template { id: string; name: string; category: string; template_type: string; content: string; merge_fields: any[]; is_active: boolean; usage_count: number; created_at: string; }

export default function DocumentAutomation() {
  const { tenantId, userId } = useTenant();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "general", template_type: "contract", content: "" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("document_templates" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setTemplates((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createTemplate = async () => {
    if (!form.name || !tenantId) return;
    const { error } = await supabase.from("document_templates" as any).insert({ ...form, tenant_id: tenantId, created_by: userId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Template created");
    setShowForm(false);
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Document Automation</h1>
          <p className="text-sm text-muted-foreground mt-1">Auto-generate contracts, proposals, and NDAs from templates</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Template</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{templates.length}</p><p className="text-xs text-muted-foreground">Templates</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{templates.filter(t => t.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-primary">{templates.reduce((a, t) => a + t.usage_count, 0)}</p><p className="text-xs text-muted-foreground">Total Uses</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Document Template</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Template name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="general">General</option><option value="legal">Legal</option><option value="hr">HR</option><option value="sales">Sales</option>
            </select>
            <select value={form.template_type} onChange={e => setForm(p => ({ ...p, template_type: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="contract">Contract</option><option value="proposal">Proposal</option><option value="nda">NDA</option><option value="offer_letter">Offer Letter</option><option value="invoice">Invoice</option>
            </select>
          </div>
          <textarea placeholder="Template content with {{merge_fields}}..." value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            className="w-full h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none font-mono" />
          <div className="flex gap-2">
            <button onClick={createTemplate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {templates.length === 0 ? (
          <div className="text-center py-12"><FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No templates yet</p></div>
        ) : templates.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className={`p-2 rounded-lg ${t.is_active ? "bg-primary/10" : "bg-secondary"}`}><Layers className={`h-4 w-4 ${t.is_active ? "text-primary" : "text-muted-foreground"}`} /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.template_type} · {t.category} · Used {t.usage_count}x</p>
            </div>
            <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground" title="Duplicate"><Copy className="h-4 w-4" /></button>
            <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{t.is_active ? "Active" : "Draft"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
