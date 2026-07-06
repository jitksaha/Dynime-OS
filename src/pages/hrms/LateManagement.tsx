import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useEmployeeOptions } from "@/hooks/useEmployeeOptions";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";

interface LateRecord {
  id: string;
  employee_name: string;
  late_date: string;
  scheduled_time: string;
  actual_time: string;
  late_minutes: number;
  reason: string | null;
  excused: boolean;
}

export default function LateManagement() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { autocompleteOptions } = useEmployeeOptions();
  const [records, setRecords] = useState<LateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRecords = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("late_records").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setRecords(data as LateRecord[]);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [tenantId]);

  const toggleExcuse = async (id: string, excused: boolean) => {
    const { error } = await supabase.from("late_records").update({ excused: !excused }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!excused ? "Marked as excused" : "Marked as unexcused");
    fetchRecords();
  };

  const totalLate = records.length;
  const excusedCount = records.filter(r => r.excused).length;
  const avgMinutes = records.length > 0 ? Math.round(records.reduce((s, r) => s + r.late_minutes, 0) / records.length) : 0;
  const thisMonth = records.filter(r => {
    const d = new Date(r.late_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const fields = [
    { name: "employee_name", label: "Employee", type: "autocomplete" as const, placeholder: "Search employees...", required: true, autocompleteOptions },
    { name: "late_date", label: "Date", type: "date" as const, required: true },
    { name: "scheduled_time", label: "Scheduled Time", placeholder: "e.g. 09:00", required: true },
    { name: "actual_time", label: "Actual Arrival", placeholder: "e.g. 09:25", required: true },
    { name: "reason", label: "Reason", type: "textarea" as const, placeholder: "Reason for late arrival..." },
  ];

  const getAvatar = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Late Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage employee late arrivals</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Record Late
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Late Records", value: totalLate, color: "text-foreground" },
          { label: "This Month", value: thisMonth, color: "text-warning" },
          { label: "Excused", value: excusedCount, color: "text-success" },
          { label: "Avg Late (min)", value: avgMinutes, color: "text-destructive" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No late records yet.</p></div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center text-xs font-semibold text-warning">{getAvatar(r.employee_name)}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.late_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.excused ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {r.excused ? "Excused" : "Unexcused"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>Scheduled: {r.scheduled_time}</span>
                <span>Arrived: <span className="text-warning font-medium">{r.actual_time}</span></span>
                <span className="font-semibold text-destructive">{r.late_minutes} min late</span>
              </div>
              {r.reason && <p className="text-xs text-muted-foreground mt-1 italic">{r.reason}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleExcuse(r.id, r.excused)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${r.excused ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-success/10 text-success hover:bg-success/20"}`}>
                  {r.excused ? "Mark Unexcused" : "Mark Excused"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Record Late Arrival" fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const [sH, sM] = (data.scheduled_time || "09:00").split(":").map(Number);
          const [aH, aM] = (data.actual_time || "09:00").split(":").map(Number);
          const lateMinutes = Math.max(0, (aH * 60 + aM) - (sH * 60 + sM));
          const { error } = await supabase.from("late_records").insert(buildInsert({
            employee_name: data.employee_name,
            late_date: data.late_date,
            scheduled_time: data.scheduled_time,
            actual_time: data.actual_time,
            late_minutes: lateMinutes,
            reason: data.reason || null,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success(`Late record added (${lateMinutes} min)`);
          setDialogOpen(false);
          fetchRecords();
        }}
      />
    </div>
  );
}
