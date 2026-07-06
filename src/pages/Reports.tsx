import { useState, useEffect, useMemo } from "react";
import { Plus, BarChart3, TrendingUp, PieChart, FileText, Download, Calendar, Trash2, RefreshCw, Search, Layers, Clock, Send, Eye, Sparkles, Upload, Database, ChevronDown } from "lucide-react";
import { exportToCSV, exportDataToPDF } from "@/lib/export-utils";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import ReportBuilder, { type ReportConfig } from "@/components/ReportBuilder";
import ReportTemplateLibrary, { type Template } from "@/components/ReportTemplateLibrary";

interface Report {
  id: string;
  name: string;
  category: string;
  type: string;
  frequency: string;
  status: string;
  last_generated: string | null;
  created_at: string;
  description?: string;
  data_source?: string;
  columns?: string[];
  filters?: any[];
  group_by?: string;
  sort_by?: string;
  sort_order?: string;
  row_limit?: number;
  color_scheme?: string;
}

const statusColor: Record<string, string> = {
  Ready: "bg-success/10 text-success",
  Generating: "bg-info/10 text-info",
  Scheduled: "bg-warning/10 text-warning",
  Draft: "bg-muted text-muted-foreground",
};

const categoryColor: Record<string, string> = {
  Finance: "bg-success/10 text-success",
  HR: "bg-primary/10 text-primary",
  Sales: "bg-warning/10 text-warning",
  Marketing: "bg-info/10 text-info",
  Support: "bg-accent/10 text-accent-foreground",
  Projects: "bg-destructive/10 text-destructive",
  "Cross-Module": "bg-chart-4/10 text-chart-4",
};

const typeIcon: Record<string, React.ElementType> = {
  "Bar Chart": BarChart3, "Line Chart": TrendingUp, "Pie Chart": PieChart,
  Table: FileText, Funnel: BarChart3, Gauge: PieChart, Heatmap: Layers,
  "Stacked Bar": BarChart3, "Area Chart": TrendingUp,
};

export default function Reports() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase.from("reports").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setReports(data as Report[]);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [tenantId]);

  const deleteReport = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Report deleted");
    fetchReports();
  };

  const generateReport = async (report: Report) => {
    await supabase.from("reports").update({ status: "Generating" }).eq("id", report.id);
    toast.info("Generating report...");
    fetchReports();
    setTimeout(async () => {
      await supabase.from("reports").update({ status: "Ready", last_generated: new Date().toISOString() }).eq("id", report.id);
      toast.success(`"${report.name}" is ready`);
      fetchReports();
    }, 2000);
  };

  const scheduleReport = async (report: Report) => {
    await supabase.from("reports").update({ status: "Scheduled" }).eq("id", report.id);
    toast.success(`Report scheduled (${report.frequency})`);
    fetchReports();
  };

  const handleBuilderSubmit = async (config: ReportConfig) => {
    if (!tenantId) return;
    const { error } = await supabase.from("reports").insert(buildInsert({
      name: config.name, category: config.category, type: config.type, frequency: config.frequency,
    }));
    if (error) { toast.error(error.message); return; }
    toast.success(`"${config.name}" created with ${config.columns.length || "all"} columns`);
    setBuilderOpen(false);
    fetchReports();
  };

  const handleUseTemplate = async (template: Template) => {
    if (!tenantId) return;
    const { error } = await supabase.from("reports").insert(buildInsert({
      name: template.name, category: template.category, type: template.type, frequency: template.frequency,
    }));
    if (error) { toast.error(error.message); return; }
    toast.success(`"${template.name}" created from template`);
    fetchReports();
  };

  const handleImportTemplate = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !tenantId) return;
      try {
        const text = await file.text();
        const t = JSON.parse(text);
        if (!t.name || !t.category) { toast.error("Invalid template file"); return; }
        const { error } = await supabase.from("reports").insert(buildInsert({
          name: t.name, category: t.category, type: t.type || "Table", frequency: t.frequency || "Monthly",
        }));
        if (error) { toast.error(error.message); return; }
        toast.success(`Imported "${t.name}"`);
        fetchReports();
      } catch { toast.error("Failed to parse template file"); }
    };
    input.click();
  };

  const exportAllReports = (format: "csv" | "pdf" = "csv") => {
    if (reports.length === 0) { toast.error("No reports to export"); return; }
    const exportData = reports.map(r => ({
      Name: r.name, Category: r.category, Type: r.type, Schedule: r.frequency,
      Status: r.status, "Last Generated": r.last_generated || "Never",
      Created: new Date(r.created_at).toLocaleDateString(),
    }));
    if (format === "pdf") {
      exportDataToPDF(exportData, "Reports Summary");
    } else {
      exportToCSV(exportData, "all-reports");
    }
    toast.success(`Exported ${reports.length} reports as ${format.toUpperCase()}`);
  };

  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "All" && r.category !== categoryFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, search, categoryFilter, statusFilter]);

  const categories = useMemo(() => ["All", ...new Set(reports.map(r => r.category))], [reports]);

  const renderMiniChart = (type: string) => {
    if (type === "Bar Chart" || type === "Stacked Bar") {
      return (
        <div className="flex items-end gap-1 h-16">
          {[65, 40, 80, 55, 90, 45, 70].map((h, i) => (
            <div key={i} className="flex-1 bg-primary/30 hover:bg-primary/50 rounded-t transition-colors" style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    }
    if (type === "Line Chart" || type === "Area Chart") {
      return (
        <svg viewBox="0 0 200 50" className="w-full h-16">
          <polyline fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth="2" points="0,40 30,25 60,35 90,12 120,20 150,8 180,16 200,4 200,50 0,50" />
        </svg>
      );
    }
    if (type === "Pie Chart" || type === "Gauge") {
      return (
        <div className="flex justify-center h-16">
          <div className="h-14 w-14 rounded-full border-4 border-primary/30 relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent border-r-transparent" style={{ transform: "rotate(45deg)" }} />
          </div>
        </div>
      );
    }
    if (type === "Heatmap") {
      return (
        <div className="grid grid-cols-7 gap-0.5 h-16">
          {Array.from({ length: 21 }, (_, i) => (
            <div key={i} className="rounded-sm" style={{ backgroundColor: `hsl(var(--primary) / ${Math.random() * 0.6 + 0.1})` }} />
          ))}
        </div>
      );
    }
    if (type === "Funnel") {
      return (
        <div className="flex flex-col items-center gap-0.5 h-16 justify-center">
          {[100, 75, 50, 30].map((w, i) => (
            <div key={i} className="rounded-sm bg-primary/30" style={{ width: `${w}%`, height: "3px" }} />
          ))}
        </div>
      );
    }
    return (
      <div className="flex items-end gap-1 h-16">
        {[30, 60, 45, 80, 50].map((h, i) => (
          <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Build, schedule & export custom business intelligence reports</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleImportTemplate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-card text-xs font-medium text-foreground hover:bg-primary/10 transition-colors">
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button onClick={() => exportAllReports("csv")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-card text-xs font-medium text-foreground hover:bg-primary/10 transition-colors">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={() => exportAllReports("pdf")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-card text-xs font-medium text-foreground hover:bg-primary/10 transition-colors">
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
          <button onClick={() => setTemplatesOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-xs font-medium text-foreground hover:bg-primary/10 transition-colors">
            <Layers className="h-3.5 w-3.5" /> Templates
          </button>
          <button onClick={() => setBuilderOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Sparkles className="h-4 w-4" /> Report Builder
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Reports", value: reports.length, color: "text-foreground" },
          { label: "Ready", value: reports.filter(r => r.status === "Ready").length, color: "text-success" },
          { label: "Scheduled", value: reports.filter(r => r.status === "Scheduled").length, color: "text-warning" },
          { label: "Generating", value: reports.filter(r => r.status === "Generating").length, color: "text-info" },
          { label: "Categories", value: new Set(reports.map(r => r.category)).size, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports..." className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground">
          {categories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground">
          <option value="All">All Status</option>
          <option value="Ready">Ready</option>
          <option value="Generating">Generating</option>
          <option value="Scheduled">Scheduled</option>
        </select>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <BarChart3 className="h-10 w-10 mx-auto opacity-40" />
          <p className="text-sm">{search ? "No reports match your search." : "No reports yet. Use the Report Builder or Templates to get started."}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setBuilderOpen(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Sparkles className="h-4 w-4 inline mr-1" /> Build Report
            </button>
            <button onClick={() => setTemplatesOpen(true)} className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-primary/10">
              Browse Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(report => {
            const TypeIcon = typeIcon[report.type] || BarChart3;
            const isPreviewing = previewId === report.id;
            return (
              <div key={report.id} className="module-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{report.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${categoryColor[report.category] || "bg-secondary text-muted-foreground"}`}>{report.category}</span>
                        <span className="text-[10px] text-muted-foreground">{report.type}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor[report.status] || "bg-muted text-muted-foreground"}`}>{report.status}</span>
                </div>

                {/* Mini chart */}
                <button onClick={() => setPreviewId(isPreviewing ? null : report.id)} className="w-full mb-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  {renderMiniChart(report.type)}
                </button>

                {/* Expanded preview with config details */}
                {isPreviewing && (
                  <div className="mb-3 p-3 rounded-lg bg-muted/20 border border-border text-xs space-y-1 animate-fade-in">
                    <div className="flex justify-between"><span className="text-muted-foreground">Data Source</span><span className="text-foreground font-medium">{report.data_source || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Group By</span><span className="text-foreground font-medium">{report.group_by || "None"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Columns</span><span className="text-foreground font-medium">{report.columns?.length || "All"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Filters</span><span className="text-foreground font-medium">{report.filters?.length || 0}</span></div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{report.last_generated ? new Date(report.last_generated).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Not yet"}</div>
                  <span>·</span>
                  <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{report.frequency}</div>
                </div>

                <div className="flex gap-1.5 pt-3 border-t border-border">
                  <button onClick={() => generateReport(report)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-input text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                    <RefreshCw className="h-3 w-3" /> Generate
                  </button>
                  <button onClick={() => scheduleReport(report)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-input text-xs text-muted-foreground hover:bg-warning/10 hover:text-warning transition-colors">
                    <Send className="h-3 w-3" /> Schedule
                  </button>
                  <button onClick={() => setPreviewId(isPreviewing ? null : report.id)} className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-input text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                    <Eye className="h-3 w-3" />
                  </button>
                  <button onClick={() => exportToCSV([{ Name: report.name, Category: report.category, Type: report.type, Frequency: report.frequency, Status: report.status, "Last Generated": report.last_generated || "Never" }], `report-${report.id}`)} className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-input text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                    <Download className="h-3 w-3" />
                  </button>
                  <button onClick={() => deleteReport(report.id)} className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-input text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Builder Wizard */}
      <ReportBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} onSubmit={handleBuilderSubmit} />

      {/* Template Library */}
      <ReportTemplateLibrary open={templatesOpen} onClose={() => setTemplatesOpen(false)} onUseTemplate={handleUseTemplate} />
    </div>
  );
}
