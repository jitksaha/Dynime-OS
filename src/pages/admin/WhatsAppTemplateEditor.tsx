// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  MessageSquare, Loader2, Save, Plus, Trash2, Copy, ChevronDown, ChevronUp,
} from "lucide-react";

interface WaTemplate {
  id: string;
  event_key: string;
  display_name: string;
  template_body: string;
  variables: string[];
  is_active: boolean;
  category: string;
}

const CATEGORIES = ["authentication", "transactional", "notification", "marketing"];

export default function WhatsAppTemplateEditor() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    event_key: "",
    display_name: "",
    template_body: "",
    variables: "",
    category: "transactional",
  });

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .order("category")
      .order("display_name");
    setTemplates((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const updateTemplate = (id: string, field: string, value: any) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const saveTemplate = async (t: WaTemplate) => {
    setSaving(t.id);
    const { error } = await supabase
      .from("whatsapp_templates")
      .update({
        display_name: t.display_name,
        template_body: t.template_body,
        variables: t.variables,
        is_active: t.is_active,
        category: t.category,
      })
      .eq("id", t.id);
    if (error) toast.error("Failed to save");
    else toast.success("Template saved");
    setSaving(null);
  };

  const addTemplate = async () => {
    if (!newTemplate.event_key || !newTemplate.display_name) {
      toast.error("Event key and display name are required");
      return;
    }
    const { error } = await supabase.from("whatsapp_templates").insert({
      event_key: newTemplate.event_key,
      display_name: newTemplate.display_name,
      template_body: newTemplate.template_body,
      variables: newTemplate.variables.split(",").map(v => v.trim()).filter(Boolean),
      category: newTemplate.category,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Template created");
      setShowAdd(false);
      setNewTemplate({ event_key: "", display_name: "", template_body: "", variables: "", category: "transactional" });
      fetchTemplates();
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    toast.success("Template deleted");
    fetchTemplates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-600" /> WhatsApp Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage message templates for WhatsApp notifications across all events.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Template
        </button>
      </div>

      {showAdd && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold">New Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Event Key</label>
              <input
                value={newTemplate.event_key}
                onChange={(e) => setNewTemplate(p => ({ ...p, event_key: e.target.value }))}
                placeholder="e.g. payment_reminder"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <input
                value={newTemplate.display_name}
                onChange={(e) => setNewTemplate(p => ({ ...p, display_name: e.target.value }))}
                placeholder="Payment Reminder"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              value={newTemplate.category}
              onChange={(e) => setNewTemplate(p => ({ ...p, category: e.target.value }))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Template Body</label>
            <textarea
              value={newTemplate.template_body}
              onChange={(e) => setNewTemplate(p => ({ ...p, template_body: e.target.value }))}
              rows={3}
              placeholder="Hi {{customer_name}}, your order..."
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Variables (comma-separated)</label>
            <input
              value={newTemplate.variables}
              onChange={(e) => setNewTemplate(p => ({ ...p, variables: e.target.value }))}
              placeholder="customer_name, order_number, amount"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={addTemplate}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Create
          </button>
        </div>
      )}

      {/* Group by category */}
      {CATEGORIES.map(cat => {
        const catTemplates = templates.filter(t => t.category === cat);
        if (catTemplates.length === 0) return null;

        return (
          <div key={cat}>
            <h2 className="text-lg font-semibold capitalize mb-3 text-green-700 dark:text-green-400">
              {cat}
            </h2>
            <div className="space-y-2">
              {catTemplates.map((t) => {
                const isExpanded = expanded === t.id;
                return (
                  <div key={t.id} className="rounded-lg border bg-card overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50"
                      onClick={() => setExpanded(isExpanded ? null : t.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{t.display_name}</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{t.event_key}</code>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                          {t.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t pt-3">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={t.is_active}
                              onChange={(e) => updateTemplate(t.id, "is_active", e.target.checked)}
                            />
                            <span className="text-sm">Active</span>
                          </label>
                          <select
                            value={t.category}
                            onChange={(e) => updateTemplate(t.id, "category", e.target.value)}
                            className="rounded-md border bg-background px-2 py-1 text-sm"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Template Body</label>
                          <textarea
                            value={t.template_body}
                            onChange={(e) => updateTemplate(t.id, "template_body", e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Variables</label>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {t.variables.map((v) => (
                              <button
                                key={v}
                                onClick={() => {
                                  navigator.clipboard.writeText(`{{${v}}}`);
                                  toast.success(`Copied {{${v}}}`);
                                }}
                                className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs font-mono hover:bg-accent"
                              >
                                <Copy className="h-3 w-3" /> {`{{${v}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveTemplate(t)}
                            disabled={saving === t.id}
                            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {saving === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => deleteTemplate(t.id)}
                            className="flex items-center gap-2 rounded-md border border-destructive text-destructive px-4 py-2 text-sm hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
