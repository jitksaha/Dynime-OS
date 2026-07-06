import { useState, useEffect } from "react";
import { Plus, Trash2, X, Clock, Mail, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

interface ScheduledReport {
  id: string;
  name: string;
  report_type: string;
  schedule: string;
  recipients: string[];
  is_active: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
}

const REPORT_TYPES = [
  { value: "payroll_summary", label: "Payroll Summary" },
  { value: "attendance_report", label: "Attendance Report" },
  { value: "expense_report", label: "Expense Report" },
  { value: "invoice_aging", label: "Invoice Aging" },
  { value: "profit_loss", label: "Profit & Loss" },
  { value: "employee_directory", label: "Employee Directory" },
  { value: "deal_pipeline", label: "Deal Pipeline" },
  { value: "budget_vs_actual", label: "Budget vs Actual" },
];

const SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export default function ScheduledReports() {
  const { tenantId, supabase, buildInsert } = useTenant();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [reportType, setReportType] = useState("");
  const [schedule, setSchedule] = useState("weekly");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);

  const fetchData = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("scheduled_reports").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const addRecipient = () => {
    if (recipientInput && recipientInput.includes("@")) {
      setRecipients([...recipients, recipientInput.trim()]);
      setRecipientInput("");
    }
  };

  const handleCreate = async () => {
    if (!name || !reportType || recipients.length === 0) { toast.error("Fill all fields and add at least one recipient"); return; }
    const nextRun = new Date();
    if (schedule === "daily") nextRun.setDate(nextRun.getDate() + 1);
    else if (schedule === "weekly") nextRun.setDate(nextRun.getDate() + 7);
    else if (schedule === "monthly") nextRun.setMonth(nextRun.getMonth() + 1);
    else nextRun.setDate(nextRun.getDate() + 14);

    const { error } = await supabase.from("scheduled_reports").insert(buildInsert({
      name, report_type: reportType, schedule, recipients, is_active: true, next_run_at: nextRun.toISOString(),
    }));
    if (error) { toast.error(error.message); return; }
    toast.success("Scheduled report created");
    setDialogOpen(false);
    setName(""); setReportType(""); setSchedule("weekly"); setRecipients([]);
    fetchData();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("scheduled_reports").update({ is_active: !active }).eq("id", id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("scheduled_reports").delete().eq("id", id);
    toast.success("Report schedule deleted");
    fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Scheduled Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Auto-email PDF reports on a schedule</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Schedule Report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No scheduled reports. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${r.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                    <h3 className="text-sm font-semibold text-foreground">{r.name}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize mt-0.5 block">
                    {REPORT_TYPES.find(t => t.value === r.report_type)?.label || r.report_type} • {r.schedule}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(r.id, r.is_active)} className="p-1.5 rounded text-muted-foreground hover:text-primary">
                    {r.is_active ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.recipients.map((email, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {email}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{r.last_sent_at ? `Last sent: ${new Date(r.last_sent_at).toLocaleDateString()}` : "Never sent"}</span>
                <span>{r.next_run_at ? `Next: ${new Date(r.next_run_at).toLocaleDateString()}` : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl animate-fade-in p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Schedule Report</h2>
              <button onClick={() => setDialogOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Report Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Payroll Summary" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Select type...</option>
                {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Schedule</label>
              <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {SCHEDULES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Recipients</label>
              <div className="flex gap-2">
                <input value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRecipient()} placeholder="email@example.com" className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                <button type="button" onClick={addRecipient} className="px-3 h-10 rounded-lg border border-input text-sm hover:bg-secondary">Add</button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {recipients.map((email, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary flex items-center gap-1">
                    {email}
                    <button onClick={() => setRecipients(recipients.filter((_, idx) => idx !== i))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <button onClick={handleCreate} disabled={!name || !reportType || recipients.length === 0} className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              Create Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
