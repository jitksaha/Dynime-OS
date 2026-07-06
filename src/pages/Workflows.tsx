import { useState, useEffect, useMemo } from "react";
import { Plus, GitBranch, CheckCircle2, AlertCircle, Clock, Zap, ArrowRight, Trash2, Play, Pause, Search, Filter, Copy, Eye, ChevronDown, ChevronRight, Layers, Timer, LayoutTemplate } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

interface WorkflowStep {
  id: string;
  label: string;
  type: "action" | "condition" | "delay" | "notification";
  status: "pending" | "completed" | "active" | "skipped";
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  steps: number;
  status: string;
  last_run: string | null;
  total_runs: number;
  created_at: string;
}

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Draft: "bg-primary/10 text-primary",
  Paused: "bg-warning/10 text-warning",
};

const statusIcon: Record<string, React.ElementType> = {
  Active: CheckCircle2,
  Draft: AlertCircle,
  Paused: Clock,
};

const WORKFLOW_TEMPLATES = [
  { name: "Employee Onboarding", trigger: "Employee Created", steps: 5, description: "Automated onboarding: assign mentor, send welcome email, setup accounts, schedule orientation, first-week check-in" },
  { name: "Lead Follow-up", trigger: "New Lead", steps: 4, description: "Auto-assign lead, send intro email, schedule follow-up call, update CRM status" },
  { name: "Invoice Overdue Reminder", trigger: "Invoice Overdue", steps: 3, description: "Send reminder email at 7 days, escalate at 14 days, notify finance at 30 days" },
  { name: "Ticket Escalation", trigger: "Ticket Created", steps: 3, description: "Auto-assign agent, SLA timer start, escalate if unresolved in 24h" },
  { name: "Deal Won Celebration", trigger: "Deal Won", steps: 3, description: "Notify team, generate invoice, update revenue dashboard" },
  { name: "Weekly Digest", trigger: "Scheduled (Weekly)", steps: 2, description: "Compile weekly metrics, send digest email to stakeholders" },
];

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  "Employee Created": Layers,
  "New Lead": Zap,
  "Invoice Overdue": Timer,
  "Ticket Created": AlertCircle,
  "Deal Won": CheckCircle2,
  "Scheduled (Daily)": Clock,
  "Scheduled (Weekly)": Clock,
  "Scheduled (Monthly)": Clock,
};

function generateMockSteps(count: number, trigger: string): WorkflowStep[] {
  const stepLabels: Record<string, string[]> = {
    "Employee Created": ["Create profile", "Assign mentor", "Send welcome email", "Setup accounts", "Schedule orientation", "First-week check-in"],
    "New Lead": ["Auto-assign", "Send intro email", "Schedule call", "Update CRM", "Follow-up reminder"],
    "Invoice Overdue": ["Send reminder", "Second reminder", "Escalate to finance", "Final notice"],
    "Ticket Created": ["Auto-assign agent", "Start SLA timer", "Escalate if needed", "Close ticket"],
    "Deal Won": ["Notify team", "Generate invoice", "Update dashboard", "Send contract"],
    default: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
  };
  const labels = stepLabels[trigger] || stepLabels.default;
  const types: WorkflowStep["type"][] = ["action", "condition", "delay", "notification"];
  return Array.from({ length: Math.min(count, 6) }, (_, i) => ({
    id: `step-${i}`,
    label: labels[i] || `Step ${i + 1}`,
    type: types[i % types.length],
    status: i === 0 ? "completed" : i === 1 ? "active" : "pending",
  }));
}

const stepTypeColor: Record<string, string> = {
  action: "bg-primary/10 border-primary/30 text-primary",
  condition: "bg-warning/10 border-warning/30 text-warning",
  delay: "bg-info/10 border-info/30 text-info",
  notification: "bg-success/10 border-success/30 text-success",
};

const stepStatusDot: Record<string, string> = {
  completed: "bg-success",
  active: "bg-primary animate-pulse",
  pending: "bg-muted-foreground/30",
  skipped: "bg-muted-foreground/20",
};

export default function Workflows() {
  const { tenantId, buildInsert, applyBranchFilter, activeBranchId, isAllBranches, supabase } = useTenant();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [triggerFilter, setTriggerFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const fetchWorkflows = async () => {
    if (!tenantId) return;
    let q = supabase.from("workflows").select("*").eq("tenant_id", tenantId);
    // Include workflows scoped to active branch + global (branch_id IS NULL) workflows.
    if (activeBranchId && !isAllBranches) {
      q = q.or(`branch_id.eq.${activeBranchId},branch_id.is.null`);
    }
    const { data, error } = await q.order("created_at", { ascending: false });
    if (!error && data) setWorkflows(data as Workflow[]);
    setLoading(false);
  };

  useEffect(() => { fetchWorkflows(); }, [tenantId, activeBranchId, isAllBranches]);


  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase.from("workflows").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Workflow deleted");
    fetchWorkflows();
  };

  const toggleStatus = async (wf: Workflow) => {
    const next = wf.status === "Active" ? "Paused" : wf.status === "Paused" ? "Draft" : "Active";
    const { error } = await supabase.from("workflows").update({ status: next }).eq("id", wf.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Workflow ${next.toLowerCase()}`);
    fetchWorkflows();
  };

  const duplicateWorkflow = async (wf: Workflow) => {
    if (!tenantId) return;
    const { error } = await supabase.from("workflows").insert(buildInsert({
      name: `${wf.name} (Copy)`,
      description: wf.description,
      trigger_type: wf.trigger_type,
      steps: wf.steps,
      status: "Draft",
    }));
    if (error) { toast.error(error.message); return; }
    toast.success("Workflow duplicated");
    fetchWorkflows();
  };

  const createFromTemplate = async (template: typeof WORKFLOW_TEMPLATES[0]) => {
    if (!tenantId) return;
    const { error } = await supabase.from("workflows").insert(buildInsert({
      name: template.name,
      description: template.description,
      trigger_type: template.trigger,
      steps: template.steps,
      status: "Draft",
    }));
    if (error) { toast.error(error.message); return; }
    toast.success(`"${template.name}" created from template`);
    setShowTemplates(false);
    fetchWorkflows();
  };

  const filtered = useMemo(() => {
    return workflows.filter(w => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase()) && !w.trigger_type.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "All" && w.status !== statusFilter) return false;
      if (triggerFilter !== "All" && w.trigger_type !== triggerFilter) return false;
      return true;
    });
  }, [workflows, search, statusFilter, triggerFilter]);

  const triggers = useMemo(() => ["All", ...new Set(workflows.map(w => w.trigger_type))], [workflows]);

  const fields = [
    { name: "name", label: "Workflow Name", placeholder: "e.g. New Lead Follow-up", required: true },
    { name: "description", label: "Description", type: "textarea" as const, placeholder: "What does this workflow do?" },
    { name: "trigger", label: "Trigger", type: "select" as const, options: ["Employee Created", "New Lead", "Invoice Overdue", "Ticket Created", "Deal Won", "Scheduled (Daily)", "Scheduled (Weekly)", "Scheduled (Monthly)"], required: true },
    { name: "steps", label: "Number of Steps", type: "number" as const, placeholder: "e.g. 3" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate your business processes with visual flows</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </button>
          <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> New Workflow
          </button>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Start Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORKFLOW_TEMPLATES.map((t) => {
              const TIcon = TRIGGER_ICONS[t.trigger] || Zap;
              return (
                <button key={t.name} onClick={() => createFromTemplate(t)} className="text-left p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-primary/10"><TIcon className="h-4 w-4 text-primary" /></div>
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />{t.trigger}
                    <span>·</span>
                    <span>{t.steps} steps</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Workflows", value: workflows.length.toString(), color: "text-foreground" },
          { label: "Active", value: workflows.filter(w => w.status === "Active").length.toString(), color: "text-success" },
          { label: "Total Runs", value: workflows.reduce((a, b) => a + b.total_runs, 0).toLocaleString(), color: "text-primary" },
          { label: "Avg Steps", value: workflows.length ? (workflows.reduce((a, b) => a + b.steps, 0) / workflows.length).toFixed(1) : "0", color: "text-info" },
        ].map((s) => (
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
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workflows..." className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Paused">Paused</option>
          </select>
          <select value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            {triggers.map(t => <option key={t} value={t}>{t === "All" ? "All Triggers" : t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">{search || statusFilter !== "All" ? "No workflows match your filters." : "No workflows yet. Create your first or pick a template."}</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wf) => {
            const StatusIcon = statusIcon[wf.status] || AlertCircle;
            const TriggerIcon = TRIGGER_ICONS[wf.trigger_type] || Zap;
            const isExpanded = expandedId === wf.id;
            const mockSteps = generateMockSteps(wf.steps, wf.trigger_type);
            return (
              <div key={wf.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors">
                {/* Header */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                        <GitBranch className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{wf.name}</h3>
                        {wf.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{wf.description}</p>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor[wf.status] || ""}`}>
                      <StatusIcon className="h-3 w-3" />{wf.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1"><TriggerIcon className="h-3 w-3" />{wf.trigger_type}</div>
                    <div className="flex items-center gap-1"><ArrowRight className="h-3 w-3" />{wf.steps} steps</div>
                    <div>Last run: {wf.last_run ? new Date(wf.last_run).toLocaleDateString() : "Never"}</div>
                    <div>{wf.total_runs} total runs</div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <button onClick={() => setExpandedId(isExpanded ? null : wf.id)} className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {isExpanded ? "Hide Flow" : "View Flow"}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => duplicateWorkflow(wf)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleStatus(wf)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title={wf.status === "Active" ? "Pause" : "Activate"}>
                        {wf.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteWorkflow(wf.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visual Flow Builder */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-5 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Visual Flow</h4>
                    </div>
                    {/* Flow Steps */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Trigger node */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-primary/40 bg-primary/10">
                        <TriggerIcon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary">Trigger: {wf.trigger_type}</span>
                      </div>
                      {mockSteps.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stepTypeColor[step.type]}`}>
                            <div className={`h-2 w-2 rounded-full ${stepStatusDot[step.status]}`} />
                            <span className="text-xs font-medium">{step.label}</span>
                            <span className="text-[10px] opacity-60 uppercase">{step.type}</span>
                          </div>
                        </div>
                      ))}
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-success/40 bg-success/10">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-xs font-medium text-success">Complete</span>
                      </div>
                    </div>
                    {/* Run History Preview */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Recent Execution Timeline</h5>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 14 }, (_, i) => {
                          const hasRun = Math.random() > 0.4;
                          const success = Math.random() > 0.15;
                          return (
                            <div key={i} className={`h-6 flex-1 rounded-sm ${hasRun ? (success ? "bg-success/40" : "bg-destructive/40") : "bg-muted"}`} title={`${14 - i} days ago: ${hasRun ? (success ? "Success" : "Failed") : "No run"}`} />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>14d ago</span>
                        <span>Today</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Workflow"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("workflows").insert(buildInsert({
            name: data.name,
            description: data.description || null,
            trigger_type: data.trigger,
            steps: parseInt(data.steps) || 1,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Workflow created");
          setDialogOpen(false);
          fetchWorkflows();
        }}
      />
    </div>
  );
}
