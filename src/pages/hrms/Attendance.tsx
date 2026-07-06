import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, AlertCircle, Calendar, Plus, BarChart3 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeOptions } from "@/hooks/useEmployeeOptions";
import { useDepartments } from "@/hooks/useDepartments";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";

interface AttendanceRecord {
  id: string;
  employee_name: string;
  employee_department: string | null;
  attendance_date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  notes: string | null;
  attendance_type: string;
  working_hours: number;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  present: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  late: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  absent: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  leave: { icon: AlertCircle, color: "text-info", bg: "bg-info/10" },
};

const calculateWorkingHours = (checkIn: string | null, checkOut: string | null): number => {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  const diff = (outH * 60 + outM) - (inH * 60 + inM);
  return Math.max(0, Math.round((diff / 60) * 100) / 100);
};

export default function Attendance() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { profile } = useAuth();
  const { autocompleteOptions } = useEmployeeOptions();
  const { departments } = useDepartments(tenantId);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [punchIn, setPunchIn] = useState(false);

  const fetchRecords = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("attendance_date", { ascending: false })
      .limit(100);
    if (!error && data) setRecords(data as AttendanceRecord[]);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [tenantId]);

  const handlePunch = async () => {
    if (!tenantId) return;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);

    if (!punchIn) {
      const { error } = await supabase.from("attendance_records").insert(buildInsert({
        employee_name: profile?.full_name || "Unknown",
        employee_department: null,
        attendance_date: now.toISOString().split("T")[0],
        status: "present",
        check_in: timeStr,
        attendance_type: "automatic",
        working_hours: 0,
      }));
      if (error) { toast.error(error.message); return; }
      toast.success("Punched in at " + timeStr);
      setPunchIn(true);
    } else {
      const today = now.toISOString().split("T")[0];
      const todayRec = records.find(r => r.attendance_date === today && r.employee_name === (profile?.full_name || "Unknown"));
      const hours = todayRec ? calculateWorkingHours(todayRec.check_in, timeStr) : 0;
      const { error } = await supabase
        .from("attendance_records")
        .update({ check_out: timeStr, working_hours: hours })
        .eq("tenant_id", tenantId)
        .eq("attendance_date", today)
        .eq("employee_name", profile?.full_name || "Unknown");
      if (error) { toast.error(error.message); return; }
      toast.success(`Punched out (${hours.toFixed(1)} hrs)`);
      setPunchIn(false);
    }
    fetchRecords();
  };

  const fields = [
    {
      name: "employee_name", label: "Employee", type: "autocomplete" as const, placeholder: "Search employees...", required: true,
      autocompleteOptions,
      onAutocompleteSelect: (opt: { value: string; label: string; sublabel?: string }, setFormData: (updater: (prev: Record<string, string>) => Record<string, string>) => void) => {
        if (opt.sublabel) setFormData((prev) => ({ ...prev, department: opt.sublabel! }));
      },
    },
    { name: "department", label: "Department", type: "select" as const, options: departments.slice(0, 50), required: true },
    { name: "date", label: "Date", type: "date" as const, required: true },
    { name: "check_in", label: "Check In Time", placeholder: "e.g. 09:00", required: true },
    { name: "check_out", label: "Check Out Time", placeholder: "e.g. 18:00", required: true },
    { name: "status", label: "Status", type: "select" as const, options: ["present", "late", "absent", "leave"], required: true },
    { name: "notes", label: "Notes", type: "textarea" as const, placeholder: "Optional notes..." },
  ];

  const todayRecords = records.filter(r => r.attendance_date === new Date().toISOString().split("T")[0]);
  const presentCount = todayRecords.filter(r => r.status === "present").length;
  const lateCount = todayRecords.filter(r => r.status === "late").length;
  const absentCount = todayRecords.filter(r => r.status === "absent").length;
  const autoCount = records.filter(r => r.attendance_type === "automatic").length;
  const manualCount = records.filter(r => r.attendance_type === "manual").length;
  const avgHours = todayRecords.length > 0
    ? (todayRecords.reduce((s, r) => s + (Number(r.working_hours) || 0), 0) / todayRecords.length).toFixed(1)
    : "0";

  const summaryStats = [
    { label: "Present Today", value: presentCount.toString(), color: "text-success" },
    { label: "Late Today", value: lateCount.toString(), color: "text-warning" },
    { label: "Absent Today", value: absentCount.toString(), color: "text-destructive" },
    { label: "Avg Hours Today", value: `${avgHours}h`, color: "text-info" },
  ];

  const getAvatar = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatic tracking via check-in/out • Manual entries supported
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => setDialogOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
            <Plus className="h-4 w-4" /> Manual Record
          </button>
          <button
            onClick={handlePunch}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              punchIn
                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            <Clock className="h-4 w-4" />
            {punchIn ? "Punch Out" : "Punch In"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryStats.map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" />Automatic: {autoCount}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />Manual: {manualCount}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No attendance records yet. Punch in or add a record to get started.</p></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Attendance Records</h2>
              <span className="text-xs text-muted-foreground">{records.length} records</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Check In</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Check Out</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Hours</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((rec) => {
                  const cfg = statusConfig[rec.status] || statusConfig.present;
                  const Icon = cfg.icon;
                  return (
                    <tr key={rec.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {getAvatar(rec.employee_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{rec.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{rec.employee_department || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(rec.attendance_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="h-3 w-3" />
                          <span className="capitalize">{rec.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{rec.check_in || "—"}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{rec.check_out || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{rec.working_hours ? `${Number(rec.working_hours).toFixed(1)}h` : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${rec.attendance_type === "manual" ? "text-warning bg-warning/10" : "text-info bg-info/10"}`}>
                          {rec.attendance_type === "manual" ? "Manual" : "Auto"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {records.map((rec) => {
              const cfg = statusConfig[rec.status] || statusConfig.present;
              const Icon = cfg.icon;
              return (
                <div key={rec.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {getAvatar(rec.employee_name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{rec.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{rec.employee_department || "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        <span className="capitalize">{rec.status}</span>
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${rec.attendance_type === "manual" ? "text-warning bg-warning/10" : "text-info bg-info/10"}`}>
                        {rec.attendance_type === "manual" ? "Manual" : "Auto"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(rec.attendance_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    {rec.check_in && <span>In: {rec.check_in}</span>}
                    {rec.check_out && <span>Out: {rec.check_out}</span>}
                    {rec.working_hours > 0 && <span className="font-semibold text-foreground">{Number(rec.working_hours).toFixed(1)}h</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${cfg.bg}`}>
              <cfg.icon className={`h-3 w-3 ${cfg.color}`} />
            </div>
            <span className="capitalize">{key}</span>
          </div>
        ))}
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add Manual Attendance Record"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const hours = calculateWorkingHours(data.check_in, data.check_out);
          const { error } = await supabase.from("attendance_records").insert(buildInsert({
            employee_name: data.employee_name,
            employee_department: data.department,
            attendance_date: data.date,
            status: data.status,
            check_in: data.check_in || null,
            check_out: data.check_out || null,
            notes: data.notes || null,
            attendance_type: "manual",
            working_hours: hours,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success(`Manual record added (${hours.toFixed(1)} hrs)`);
          setDialogOpen(false);
          fetchRecords();
        }}
      />
    </div>
  );
}
