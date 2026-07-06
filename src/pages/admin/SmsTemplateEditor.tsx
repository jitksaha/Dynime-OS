// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  MessageSquare, Save, Loader2, Search, Filter, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Eye, Code, RefreshCw, Tag, Zap, Info, Plus, X,
} from "lucide-react";

interface SmsTemplate {
  id: string;
  event_key: string;
  event_label: string;
  category: string;
  template_body: string;
  variables: string[];
  is_active: boolean;
  description: string | null;
  updated_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  authentication: { label: "Authentication", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: "🔐" },
  billing: { label: "Billing", color: "bg-green-500/10 text-green-600 dark:text-green-400", icon: "💳" },
  hrm: { label: "HRM", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: "👥" },
  crm: { label: "CRM", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", icon: "🤝" },
  projects: { label: "Projects", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", icon: "📋" },
  pos: { label: "POS / Orders", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400", icon: "🛒" },
  general: { label: "General", color: "bg-muted text-muted-foreground", icon: "📨" },
};

function VariableTag({ name, onCopy }: { name: string; onCopy?: () => void }) {
  const copyVar = () => {
    navigator.clipboard.writeText(`{{${name}}}`);
    toast.success(`Copied {{${name}}} to clipboard`);
    onCopy?.();
  };
  return (
    <button
      onClick={copyVar}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-mono hover:bg-primary/20 transition-colors"
      title={`Click to copy {{${name}}}`}
    >
      <Code className="h-2.5 w-2.5" />
      {`{{${name}}}`}
    </button>
  );
}

/* ─── Centralized System Variables Manager ─── */
function SystemVariablesManager({
  templates,
  onUpdateVariables,
}: {
  templates: SmsTemplate[];
  onUpdateVariables: (id: string, variables: string[]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newVar, setNewVar] = useState("");
  const [saving, setSaving] = useState(false);

  // Collect all unique variables across all templates
  const allVars = Array.from(new Set(templates.flatMap((t) => t.variables))).sort();

  // Map: variable → list of template ids using it
  const varUsage: Record<string, string[]> = {};
  for (const t of templates) {
    for (const v of t.variables) {
      if (!varUsage[v]) varUsage[v] = [];
      varUsage[v].push(t.id);
    }
  }

  const addVarToAll = async () => {
    const v = newVar.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!v) return;
    setNewVar("");
    // No-op if already everywhere — just inform
    if (allVars.includes(v)) {
      toast.info(`Variable {{${v}}} already exists`);
      return;
    }
    setSaving(true);
    // Add to all templates
    for (const t of templates) {
      if (!t.variables.includes(v)) {
        await onUpdateVariables(t.id, [...t.variables, v]);
      }
    }
    setSaving(false);
    toast.success(`Added {{${v}}} to all templates`);
  };

  const removeVarFromAll = async (varName: string) => {
    setSaving(true);
    for (const t of templates) {
      if (t.variables.includes(varName)) {
        await onUpdateVariables(t.id, t.variables.filter((v) => v !== varName));
      }
    }
    setSaving(false);
    toast.success(`Removed {{${varName}}} from all templates`);
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Tag className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">System Variables Manager</span>
          <p className="text-xs text-muted-foreground">
            {allVars.length} variables used across {templates.length} templates — manage all in one place
          </p>
        </div>
        <span className="text-xs font-medium text-primary mr-2">{allVars.length} vars</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Add new global variable */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> Add Variable to All Templates
            </p>
            <div className="flex items-center gap-2">
              <input
                value={newVar}
                onChange={(e) => setNewVar(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVarToAll())}
                placeholder="new_variable_name"
                className="h-8 px-3 rounded-lg border border-input bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56"
              />
              <button
                onClick={addVarToAll}
                disabled={!newVar.trim() || saving}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add to All
              </button>
            </div>
          </div>

          {/* All variables grid */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> All System Variables ({allVars.length})
            </p>
            {allVars.length === 0 ? (
              <p className="text-xs text-muted-foreground">No variables defined yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {allVars.map((v) => (
                  <div
                    key={v}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <VariableTag name={v} />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {varUsage[v]?.length || 0} template{(varUsage[v]?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => removeVarFromAll(v)}
                      disabled={saving}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive disabled:opacity-40"
                      title={`Remove {{${v}}} from all templates`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Adding a variable here makes it available in every template. Removing it removes from all templates. Per-template variables can still be managed inside each card.
          </p>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onSave,
  onToggle,
}: {
  template: SmsTemplate;
  onSave: (id: string, body: string, variables: string[]) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState(template.template_body);
  const [variables, setVariables] = useState<string[]>(template.variables);
  const [newVar, setNewVar] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  // Sync variables from parent when they change (e.g. via SystemVariablesManager)
  useEffect(() => {
    setVariables(template.variables);
  }, [template.variables]);

  const isDirty = body !== template.template_body || JSON.stringify(variables) !== JSON.stringify(template.variables);
  const cat = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.general;

  const addVariable = () => {
    const v = newVar.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!v || variables.includes(v)) return;
    setVariables([...variables, v]);
    setNewVar("");
  };

  const removeVariable = (name: string) => {
    setVariables(variables.filter((v) => v !== name));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(template.id, body, variables);
    setSaving(false);
  };

  const previewText = () => {
    let result = body;
    const sampleValues: Record<string, string> = {
      app_name: "Dynime", otp_code: "482917", expiry_minutes: "5",
      customer_name: "John Doe", invoice_number: "INV-0042", currency: "$",
      amount: "150.00", due_date: "Mar 15, 2026", payment_link: "https://pay.example.com/xyz",
      description: "Pro Plan Subscription", transaction_id: "TXN-9283741",
      plan_name: "Business Pro", expiry_date: "Apr 1, 2026",
      company_name: "Acme Corp", employee_name: "Jane Smith", portal_link: "https://app.example.com",
      leave_type: "Annual", start_date: "Mar 10", end_date: "Mar 14", approver_name: "Mike Johnson",
      reason: "Scheduling conflict", date: "Mar 2, 2026",
      deal_name: "Enterprise Deal", deal_value: "25,000",
      task_name: "Design Review", project_name: "Q2 Launch",
      order_id: "ORD-1234", item_count: "3", total: "89.99",
      tracking_link: "https://track.example.com", courier_name: "FedEx",
      tracking_number: "FX123456789", message: "Hello! This is a test notification.",
      new_balance: "500.00", severity: "moderate", period: "February 2026",
    };
    for (const v of variables) {
      result = result.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), sampleValues[v] || `[${v}]`);
    }
    return result;
  };

  const charCount = body.length;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card hover:border-primary/20 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-lg">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{template.event_label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{template.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(template.id, !template.is_active); }}
            className={`p-1 rounded transition-colors ${template.is_active ? "text-green-500" : "text-muted-foreground"}`}
            title={template.is_active ? "Active — click to disable" : "Disabled — click to enable"}
          >
            {template.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {/* Variables */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Template Variables (click to copy)
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {variables.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 group">
                  <VariableTag name={v} />
                  <button
                    onClick={() => removeVariable(v)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-destructive"
                    title={`Remove {{${v}}}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={newVar}
                onChange={(e) => setNewVar(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVariable())}
                placeholder="new_variable_name"
                className="h-7 px-2 rounded-md border border-input bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-44"
              />
              <button
                onClick={addVariable}
                disabled={!newVar.trim()}
                className="h-7 px-2.5 rounded-md bg-primary/10 text-primary text-xs font-medium flex items-center gap-1 hover:bg-primary/20 transition-colors disabled:opacity-40"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>

          {/* Template Body Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground">Message Template</label>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] ${charCount > 160 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {charCount} chars {charCount > 160 ? `(${Math.ceil(charCount / 160)} SMS)` : "(1 SMS)"}
                </span>
                <button
                  onClick={() => setPreview(!preview)}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <Eye className="h-3 w-3" /> {preview ? "Edit" : "Preview"}
                </button>
              </div>
            </div>

            {preview ? (
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm text-foreground font-mono whitespace-pre-wrap">
                {previewText()}
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your SMS template..."
              />
            )}
          </div>

          {/* Info + Save */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> Use {"{{variable}}"} syntax. Standard SMS limit: 160 chars.
            </p>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SmsTemplateEditor() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sms_templates")
      .select("*")
      .order("category")
      .order("event_label");
    if (error) toast.error("Failed to load SMS templates");
    setTemplates((data as SmsTemplate[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSave = async (id: string, body: string, variables: string[]) => {
    const { error } = await supabase
      .from("sms_templates")
      .update({ template_body: body, variables })
      .eq("id", id);
    if (error) { toast.error("Failed to save template"); return; }
    toast.success("Template saved successfully");
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, template_body: body, variables } : t));
  };

  const handleUpdateVariables = async (id: string, variables: string[]) => {
    const { error } = await supabase
      .from("sms_templates")
      .update({ variables })
      .eq("id", id);
    if (error) { toast.error("Failed to update variables"); return; }
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, variables } : t));
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("sms_templates")
      .update({ is_active: active })
      .eq("id", id);
    if (error) { toast.error("Failed to toggle template"); return; }
    toast.success(active ? "Template enabled" : "Template disabled");
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, is_active: active } : t));
  };

  const categories = ["all", ...new Set(templates.map((t) => t.category))];

  const filtered = templates.filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.event_label.toLowerCase().includes(q) || t.event_key.toLowerCase().includes(q) || t.template_body.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">SMS Templates</h1>
            <p className="text-xs text-muted-foreground">Customize SMS messages for all platform events</p>
          </div>
        </div>
        <button onClick={fetchTemplates} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card">
          <p className="text-2xl font-bold text-foreground">{templates.length}</p>
          <p className="text-xs text-muted-foreground">Total Templates</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <p className="text-2xl font-bold text-green-500">{templates.filter(t => t.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <p className="text-2xl font-bold text-muted-foreground">{templates.filter(t => !t.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Disabled</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <p className="text-2xl font-bold text-primary">{new Set(templates.map(t => t.category)).size}</p>
          <p className="text-xs text-muted-foreground">Categories</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          {categories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat] || { label: "All", color: "", icon: "" };
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {cat === "all" ? "All" : `${cfg.icon} ${cfg.label}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* System Variables Manager */}
      {!loading && templates.length > 0 && (
        <SystemVariablesManager templates={templates} onUpdateVariables={handleUpdateVariables} />
      )}

      {/* Template List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No templates found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} onSave={handleSave} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 rounded-xl border border-border bg-muted/20">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">How SMS Templates Work</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Templates use <code className="px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[10px]">{"{{variable}}"}</code> syntax for dynamic content</li>
              <li>Standard SMS is 160 characters. Longer messages are sent as multi-part SMS (billed accordingly)</li>
              <li>Templates are used automatically when the platform sends SMS for the corresponding event</li>
              <li>Disabling a template will prevent SMS from being sent for that event</li>
              <li>Companies using the platform SMS gateway are charged per SMS based on your pricing config</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
