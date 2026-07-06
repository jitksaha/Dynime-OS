import { useState } from "react";
import { X, Download, FileText, BarChart3, TrendingUp, PieChart, Layers, Search, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  frequency: string;
  data_source: string;
  columns: string[];
  group_by: string;
  popular?: boolean;
}

const TEMPLATES: Template[] = [
  { id: "t1", name: "Revenue by Department", description: "Monthly revenue breakdown per department with trend analysis", category: "Finance", type: "Bar Chart", frequency: "Monthly", data_source: "invoices", columns: ["client_name", "amount", "status"], group_by: "status", popular: true },
  { id: "t2", name: "Employee Attendance Heatmap", description: "Weekly attendance patterns across teams", category: "HR", type: "Heatmap", frequency: "Weekly", data_source: "attendance", columns: ["employee_name", "status", "working_hours", "attendance_date"], group_by: "status", popular: true },
  { id: "t3", name: "Sales Pipeline Funnel", description: "Conversion rates across deal stages", category: "Sales", type: "Funnel", frequency: "Weekly", data_source: "deals", columns: ["name", "value", "stage", "priority"], group_by: "stage", popular: true },
  { id: "t4", name: "Campaign ROI Dashboard", description: "Compare budget vs conversions across channels", category: "Marketing", type: "Stacked Bar", frequency: "Monthly", data_source: "campaigns", columns: ["name", "channel", "budget", "converted"], group_by: "channel" },
  { id: "t5", name: "Expense Category Breakdown", description: "Pie chart of spending by category", category: "Finance", type: "Pie Chart", frequency: "Monthly", data_source: "expenses", columns: ["category", "amount", "vendor"], group_by: "category", popular: true },
  { id: "t6", name: "Invoice Aging Report", description: "Outstanding invoices by age bracket", category: "Finance", type: "Bar Chart", frequency: "Weekly", data_source: "invoices", columns: ["client_name", "amount", "due_date", "status"], group_by: "status" },
  { id: "t7", name: "Project Progress Tracker", description: "Status and progress of active projects", category: "Projects", type: "Table", frequency: "Weekly", data_source: "projects", columns: ["name", "status", "progress", "budget", "end_date"], group_by: "status" },
  { id: "t8", name: "Payroll Summary", description: "Total payroll cost by department", category: "HR", type: "Bar Chart", frequency: "Monthly", data_source: "employees", columns: ["name", "department", "salary"], group_by: "department" },
  { id: "t9", name: "Support Ticket Volume", description: "Daily ticket creation and resolution trends", category: "Support", type: "Line Chart", frequency: "Daily", data_source: "tickets", columns: ["subject", "priority", "status", "created_at"], group_by: "priority" },
  { id: "t10", name: "Budget vs Actual Spending", description: "Compare allocated budgets against actual spend", category: "Finance", type: "Stacked Bar", frequency: "Monthly", data_source: "budgets", columns: ["name", "allocated_amount", "spent_amount", "category"], group_by: "category" },
  { id: "t11", name: "Cross-Module KPI Dashboard", description: "Key metrics from all modules in one view", category: "Cross-Module", type: "Gauge", frequency: "Monthly", data_source: "invoices", columns: ["amount", "status"], group_by: "" },
  { id: "t12", name: "Payment Method Distribution", description: "Breakdown of payments by method", category: "Finance", type: "Pie Chart", frequency: "Monthly", data_source: "payments", columns: ["method", "amount", "status"], group_by: "method" },
  { id: "t13", name: "Deal Win Rate Analysis", description: "Win/loss ratio and avg deal value over time", category: "Sales", type: "Area Chart", frequency: "Monthly", data_source: "deals", columns: ["name", "value", "stage", "source"], group_by: "source" },
  { id: "t14", name: "Employee Headcount by Department", description: "Team size distribution across departments", category: "HR", type: "Pie Chart", frequency: "Quarterly", data_source: "employees", columns: ["name", "department", "status"], group_by: "department" },
  { id: "t15", name: "Marketing Channel Performance", description: "Open, click, and conversion rates per channel", category: "Marketing", type: "Line Chart", frequency: "Weekly", data_source: "campaigns", columns: ["name", "channel", "opened", "clicked", "converted"], group_by: "channel" },
];

const categoryColors: Record<string, string> = {
  Finance: "bg-success/10 text-success",
  HR: "bg-primary/10 text-primary",
  Sales: "bg-warning/10 text-warning",
  Marketing: "bg-info/10 text-info",
  Support: "bg-accent/10 text-accent-foreground",
  Projects: "bg-destructive/10 text-destructive",
  "Cross-Module": "bg-chart-4/10 text-chart-4",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onUseTemplate: (template: Template) => void;
}

export default function ReportTemplateLibrary({ open, onClose, onUseTemplate }: Props) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  if (!open) return null;

  const categories = ["All", ...new Set(TEMPLATES.map(t => t.category))];
  const filtered = TEMPLATES.filter(t => {
    if (catFilter !== "All" && t.category !== catFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const downloadTemplate = (t: Template) => {
    const json = JSON.stringify({
      name: t.name, description: t.description, category: t.category, type: t.type, frequency: t.frequency,
      data_source: t.data_source, columns: t.columns, group_by: t.group_by,
    }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-template-${t.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded "${t.name}" template`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Template Library</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{TEMPLATES.length} pre-built report templates</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-input bg-background text-sm">
            {categories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(t => (
              <div key={t.id} className="relative p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group">
                {t.popular && (
                  <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-warning/10 text-warning flex items-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" /> Popular
                  </span>
                )}
                <h3 className="text-sm font-semibold text-foreground pr-16">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[t.category] || "bg-secondary text-muted-foreground"}`}>{t.category}</span>
                  <span className="text-[10px] text-muted-foreground">{t.type}</span>
                  <span className="text-[10px] text-muted-foreground">· {t.frequency}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                  <button onClick={() => { onUseTemplate(t); onClose(); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                    <Copy className="h-3 w-3" /> Use Template
                  </button>
                  <button onClick={() => downloadTemplate(t)} className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-md border border-input text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                    <Download className="h-3 w-3" /> JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No templates match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { Template };
