import { useState, useEffect } from "react";
import { Plus, Clock, Sun, Moon, Edit2, ToggleLeft, ToggleRight, Users } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";

interface ShiftType {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  is_night_shift: boolean;
  color: string;
  is_active: boolean;
}

interface ShiftAssignment {
  id: string;
  employee_name: string;
  shift_type_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
}

export default function ShiftManagement() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const [shifts, setShifts] = useState<ShiftType[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [tab, setTab] = useState<"shifts" | "assignments">("shifts");

  const fetchAll = async () => {
    if (!tenantId) return;
    const [s, a, e] = await Promise.all([
      supabase.from("shift_types").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("shift_assignments").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name, department").eq("tenant_id", tenantId).eq("status", "Active"),
    ]);
    if (s.data) setShifts(s.data as ShiftType[]);
    if (a.data) setAssignments(a.data as ShiftAssignment[]);
    if (e.data) setEmployees(e.data as Employee[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [tenantId]);

  const toggleShift = async (id: string, active: boolean) => {
    const { error } = await supabase.from("shift_types").update({ is_active: !active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Shift ${!active ? "activated" : "deactivated"}`);
    fetchAll();
  };

  const shiftFields = [
    { name: "name", label: "Shift Name", placeholder: "e.g. Morning Shift", required: true },
    { name: "start_time", label: "Start Time", placeholder: "e.g. 09:00", required: true },
    { name: "end_time", label: "End Time", placeholder: "e.g. 17:00", required: true },
    { name: "grace_period", label: "Grace Period (minutes)", type: "number" as const, placeholder: "e.g. 15", required: true },
    { name: "is_night", label: "Night Shift?", type: "select" as const, options: ["No", "Yes"], required: true },
  ];

  const assignFields = [
    { name: "employee_name", label: "Employee", type: "autocomplete" as const, placeholder: "Search employees...", required: true, autocompleteOptions: employees.map(e => ({ value: e.id, label: e.full_name, sublabel: e.department || undefined })) },
    { name: "shift_type", label: "Shift Type", type: "select" as const, options: shifts.filter(s => s.is_active).map(s => s.name), required: true },
    { name: "start_date", label: "Start Date", type: "date" as const, required: true },
    { name: "end_date", label: "End Date (optional)", type: "date" as const },
  ];

  const getShiftName = (id: string) => shifts.find(s => s.id === id)?.name || "—";

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Shift Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Define shifts and assign employees to schedules</p>
        </div>
        <button
          onClick={() => tab === "shifts" ? setShiftDialogOpen(true) : setAssignDialogOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> {tab === "shifts" ? "Add Shift" : "Assign Shift"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Shifts", value: shifts.length, color: "text-foreground" },
          { label: "Active Shifts", value: shifts.filter(s => s.is_active).length, color: "text-success" },
          { label: "Night Shifts", value: shifts.filter(s => s.is_night_shift).length, color: "text-info" },
          { label: "Assigned Staff", value: assignments.filter(a => a.is_active).length, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg w-fit">
        {(["shifts", "assignments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "shifts" ? "Shift Types" : "Assignments"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : tab === "shifts" ? (
        shifts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No shifts defined yet.</p></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shifts.map(s => (
              <div key={s.id} className={`bg-card border border-border rounded-xl p-4 ${!s.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {s.is_night_shift ? <Moon className="h-4 w-4 text-info" /> : <Sun className="h-4 w-4 text-warning" />}
                    <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                  </div>
                  <button onClick={() => toggleShift(s.id, s.is_active)} className="text-muted-foreground hover:text-foreground">
                    {s.is_active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {s.start_time} – {s.end_time}</div>
                  <div>Grace period: {s.grace_period_minutes} min</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    {assignments.filter(a => a.shift_type_id === s.id && a.is_active).length} assigned
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        assignments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No shift assignments yet.</p></div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{getShiftName(a.shift_type_id)} • From {new Date(a.start_date).toLocaleDateString()}{a.end_date ? ` to ${new Date(a.end_date).toLocaleDateString()}` : " (ongoing)"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {a.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      <FormDialog open={shiftDialogOpen} onClose={() => setShiftDialogOpen(false)} title="Add Shift Type" fields={shiftFields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("shift_types").insert(buildInsert({
            name: data.name, start_time: data.start_time, end_time: data.end_time,
            grace_period_minutes: parseInt(data.grace_period) || 15,
            is_night_shift: data.is_night === "Yes",
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Shift type created");
          setShiftDialogOpen(false);
          fetchAll();
        }}
      />

      <FormDialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} title="Assign Shift" fields={assignFields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const shift = shifts.find(s => s.name === data.shift_type);
          if (!shift) { toast.error("Invalid shift type"); return; }
          const { error } = await supabase.from("shift_assignments").insert(buildInsert({
            employee_name: data.employee_name,
            shift_type_id: shift.id,
            start_date: data.start_date,
            end_date: data.end_date || null,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Shift assigned");
          setAssignDialogOpen(false);
          fetchAll();
        }}
      />
    </div>
  );
}
