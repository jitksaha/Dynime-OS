import { useState } from "react";
import { X, ChevronRight, ChevronLeft, BarChart3, TrendingUp, PieChart, FileText, Layers, Database, Columns, Filter as FilterIcon, Palette, Check, Download, Sparkles } from "lucide-react";

interface ReportBuilderProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: ReportConfig) => void;
}

export interface ReportConfig {
  name: string;
  description: string;
  category: string;
  type: string;
  frequency: string;
  data_source: string;
  columns: string[];
  filters: ReportFilter[];
  group_by: string;
  sort_by: string;
  sort_order: string;
  limit: number;
  color_scheme: string;
}

interface ReportFilter {
  column: string;
  operator: string;
  value: string;
}

const STEPS = ["Basics", "Data Source", "Columns & Filters", "Visualization", "Review"];

const DATA_SOURCES: Record<string, { label: string; icon: React.ElementType; columns: string[] }> = {
  invoices: { label: "Invoices", icon: FileText, columns: ["client_name", "amount", "tax_amount", "status", "due_date", "created_at", "invoice_number"] },
  expenses: { label: "Expenses", icon: TrendingUp, columns: ["category", "amount", "tax_amount", "vendor", "status", "expense_date", "description"] },
  deals: { label: "Deals / CRM", icon: BarChart3, columns: ["name", "value", "stage", "priority", "source", "contact_name", "created_at", "days_in_stage"] },
  employees: { label: "Employees", icon: Layers, columns: ["name", "department", "position", "salary", "status", "hire_date", "employee_type"] },
  payments: { label: "Payments", icon: Database, columns: ["amount", "method", "status", "client_name", "payment_date", "reference"] },
  attendance: { label: "Attendance", icon: Columns, columns: ["employee_name", "status", "check_in", "check_out", "working_hours", "attendance_date", "attendance_type"] },
  projects: { label: "Projects", icon: Layers, columns: ["name", "status", "priority", "progress", "budget", "start_date", "end_date", "assigned_to"] },
  campaigns: { label: "Campaigns", icon: Sparkles, columns: ["name", "channel", "status", "budget", "sent", "opened", "clicked", "converted"] },
  tickets: { label: "Helpdesk Tickets", icon: FileText, columns: ["subject", "priority", "status", "category", "assigned_to", "created_at", "resolved_at"] },
  budgets: { label: "Budgets", icon: Database, columns: ["name", "category", "allocated_amount", "spent_amount", "period", "status", "start_date"] },
};

const CHART_TYPES = [
  { value: "Bar Chart", icon: BarChart3, desc: "Compare values across categories" },
  { value: "Line Chart", icon: TrendingUp, desc: "Track trends over time" },
  { value: "Pie Chart", icon: PieChart, desc: "Show proportions of a whole" },
  { value: "Table", icon: FileText, desc: "Raw data in tabular format" },
  { value: "Stacked Bar", icon: BarChart3, desc: "Compare totals with breakdown" },
  { value: "Area Chart", icon: TrendingUp, desc: "Filled line for volume trends" },
  { value: "Heatmap", icon: Layers, desc: "Density visualization on grid" },
  { value: "Funnel", icon: BarChart3, desc: "Stage-based conversion" },
  { value: "Gauge", icon: PieChart, desc: "KPI target vs actual" },
];

const CATEGORIES = ["Finance", "HR", "Sales", "Marketing", "Support", "Projects", "Cross-Module"];
const FREQUENCIES = ["One-time", "Daily", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Yearly"];
const OPERATORS = ["equals", "not equals", "greater than", "less than", "contains", "between"];
const COLOR_SCHEMES = ["default", "ocean", "sunset", "forest", "monochrome", "neon"];

export default function ReportBuilder({ open, onClose, onSubmit }: ReportBuilderProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<ReportConfig>({
    name: "", description: "", category: "Finance", type: "Bar Chart", frequency: "Monthly",
    data_source: "invoices", columns: [], filters: [], group_by: "", sort_by: "", sort_order: "desc", limit: 100, color_scheme: "default",
  });

  if (!open) return null;

  const availableColumns = DATA_SOURCES[config.data_source]?.columns || [];
  const canProceed = () => {
    if (step === 0) return config.name.length > 0;
    if (step === 1) return !!config.data_source;
    return true;
  };

  const toggleColumn = (col: string) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.includes(col) ? prev.columns.filter(c => c !== col) : [...prev.columns, col],
    }));
  };

  const addFilter = () => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, { column: availableColumns[0] || "", operator: "equals", value: "" }],
    }));
  };

  const updateFilter = (i: number, key: keyof ReportFilter, val: string) => {
    setConfig(prev => {
      const f = [...prev.filters];
      f[i] = { ...f[i], [key]: val };
      return { ...prev, filters: f };
    });
  };

  const removeFilter = (i: number) => {
    setConfig(prev => ({ ...prev, filters: prev.filters.filter((_, idx) => idx !== i) }));
  };

  const handleSubmit = () => {
    if (config.columns.length === 0) {
      setConfig(prev => ({ ...prev, columns: availableColumns.slice(0, 5) }));
    }
    onSubmit(config);
    setStep(0);
    setConfig({ name: "", description: "", category: "Finance", type: "Bar Chart", frequency: "Monthly", data_source: "invoices", columns: [], filters: [], group_by: "", sort_by: "", sort_order: "desc", limit: 100, color_scheme: "default" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Report Builder</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10"><X className="h-5 w-5" /></button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-border shrink-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <button onClick={() => i < step && setStep(i)} className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Report Name *</label>
                <input value={config.name} onChange={e => setConfig(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Monthly Revenue by Client" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea value={config.description} onChange={e => setConfig(p => ({ ...p, description: e.target.value }))} placeholder="What does this report track?" rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                  <select value={config.category} onChange={e => setConfig(p => ({ ...p, category: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Schedule</label>
                  <select value={config.frequency} onChange={e => setConfig(p => ({ ...p, frequency: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Select the primary data source for your report.</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(DATA_SOURCES).map(([key, src]) => {
                  const Icon = src.icon;
                  const selected = config.data_source === key;
                  return (
                    <button key={key} onClick={() => setConfig(p => ({ ...p, data_source: key, columns: [], filters: [], group_by: "", sort_by: "" }))} className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                      <div className={`p-2 rounded-lg ${selected ? "bg-primary/20" : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{src.label}</p>
                        <p className="text-[10px] text-muted-foreground">{src.columns.length} fields available</p>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Select Columns</label>
                <p className="text-xs text-muted-foreground mb-3">Choose which fields to include in the report. Leave empty to include all.</p>
                <div className="flex flex-wrap gap-2">
                  {availableColumns.map(col => {
                    const selected = config.columns.includes(col);
                    return (
                      <button key={col} onClick={() => toggleColumn(col)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"}`}>
                        {col.replace(/_/g, " ")}
                        {selected && <Check className="h-3 w-3 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Group By</label>
                  <select value={config.group_by} onChange={e => setConfig(p => ({ ...p, group_by: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">None</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Sort By</label>
                  <select value={config.sort_by} onChange={e => setConfig(p => ({ ...p, sort_by: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Default</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Sort Order</label>
                  <select value={config.sort_order} onChange={e => setConfig(p => ({ ...p, sort_order: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Row Limit</label>
                  <input type="number" value={config.limit} onChange={e => setConfig(p => ({ ...p, limit: parseInt(e.target.value) || 100 }))} min={10} max={1000} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              </div>

              {/* Filters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Filters</label>
                  <button onClick={addFilter} className="text-xs text-primary hover:underline">+ Add Filter</button>
                </div>
                {config.filters.length === 0 && <p className="text-xs text-muted-foreground">No filters applied. All records will be included.</p>}
                <div className="space-y-2">
                  {config.filters.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select value={f.column} onChange={e => updateFilter(i, "column", e.target.value)} className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-xs">
                        {availableColumns.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                      </select>
                      <select value={f.operator} onChange={e => updateFilter(i, "operator", e.target.value)} className="h-9 w-28 rounded-lg border border-input bg-background px-2 text-xs">
                        {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input value={f.value} onChange={e => updateFilter(i, "value", e.target.value)} placeholder="Value" className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-xs" />
                      <button onClick={() => removeFilter(i)} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Chart Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {CHART_TYPES.map(ct => {
                    const Icon = ct.icon;
                    const sel = config.type === ct.value;
                    return (
                      <button key={ct.value} onClick={() => setConfig(p => ({ ...p, type: ct.value }))} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${sel ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"}`}>
                        <Icon className={`h-5 w-5 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-[11px] font-medium text-foreground">{ct.value}</span>
                        <span className="text-[9px] text-muted-foreground leading-tight">{ct.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Color Scheme</label>
                <div className="flex gap-2">
                  {COLOR_SCHEMES.map(cs => (
                    <button key={cs} onClick={() => setConfig(p => ({ ...p, color_scheme: cs }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${config.color_scheme === cs ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/40"}`}>
                      {cs}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Review Your Report</h3>
              <div className="bg-muted/30 rounded-xl p-4 space-y-2.5 text-sm">
                {[
                  ["Name", config.name],
                  ["Description", config.description || "—"],
                  ["Category", config.category],
                  ["Data Source", DATA_SOURCES[config.data_source]?.label || config.data_source],
                  ["Columns", config.columns.length > 0 ? config.columns.map(c => c.replace(/_/g, " ")).join(", ") : "All columns"],
                  ["Group By", config.group_by ? config.group_by.replace(/_/g, " ") : "None"],
                  ["Sort", config.sort_by ? `${config.sort_by.replace(/_/g, " ")} (${config.sort_order})` : "Default"],
                  ["Filters", config.filters.length > 0 ? `${config.filters.length} filter(s)` : "None"],
                  ["Chart Type", config.type],
                  ["Color Scheme", config.color_scheme],
                  ["Schedule", config.frequency],
                  ["Row Limit", String(config.limit)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground text-right max-w-[60%] truncate">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border shrink-0">
          <button onClick={() => step > 0 ? setStep(step - 1) : onClose()} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="flex items-center gap-1 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Sparkles className="h-4 w-4" /> Create Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
