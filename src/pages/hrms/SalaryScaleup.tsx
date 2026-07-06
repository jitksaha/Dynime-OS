import { useState, useEffect } from "react";
import { Plus, TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
  salary: number | null;
}

interface SalaryIncrement {
  id: string;
  employee_name: string;
  previous_salary: number;
  new_salary: number;
  increment_percentage: number;
  increment_amount: number;
  effective_date: string;
  reason: string | null;
  status: string;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  Approved: { color: "bg-success/10 text-success", icon: CheckCircle2 },
  Pending: { color: "bg-warning/10 text-warning", icon: Clock },
  Rejected: { color: "bg-destructive/10 text-destructive", icon: XCircle },
};

// fmt is defined inside component to use dynamic currency

export default function SalaryScaleup() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { formatPrice: fmt } = useTenantCurrency();
  const [records, setRecords] = useState<SalaryIncrement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAll = async () => {
    if (!tenantId) return;
    const [r, e] = await Promise.all([
      supabase.from("salary_increments").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name, department, salary").eq("tenant_id", tenantId).eq("status", "Active"),
    ]);
    if (r.data) setRecords(r.data as SalaryIncrement[]);
    if (e.data) setEmployees(e.data as Employee[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [tenantId]);

  const updateStatus = async (id: string, status: string) => {
    const record = records.find(r => r.id === id);
    const { error } = await supabase.from("salary_increments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    // If approved, update employee salary
    if (status === "Approved" && record) {
      const emp = employees.find(e => e.full_name === record.employee_name);
      if (emp) {
        await supabase.from("employees").update({ salary: record.new_salary }).eq("id", emp.id);
      }
    }
    toast.success(`Increment ${status.toLowerCase()}`);
    fetchAll();
  };

  const totalIncrements = records.length;
  const approvedCount = records.filter(r => r.status === "Approved").length;
  const avgIncrement = records.length > 0 ? (records.reduce((s, r) => s + Number(r.increment_percentage), 0) / records.length).toFixed(1) : "0";

  const fields = [
    {
      name: "employee_name", label: "Employee", type: "autocomplete" as const, placeholder: "Search employees...", required: true,
      autocompleteOptions: employees.map(e => ({ value: e.id, label: e.full_name, sublabel: e.department || undefined })),
      onAutocompleteSelect: (opt: { value: string; label: string }, setFormData: (updater: (prev: Record<string, string>) => Record<string, string>) => void) => {
        const emp = employees.find(e => e.id === opt.value);
        if (emp) setFormData(prev => ({ ...prev, current_salary: String(emp.salary || 0) }));
      },
    },
    { name: "current_salary", label: "Current Salary", type: "number" as const, placeholder: "Auto-filled", required: true },
    { name: "increment_pct", label: "Increment (%)", type: "number" as const, placeholder: "e.g. 15", required: true },
    { name: "effective_date", label: "Effective Date", type: "date" as const, required: true },
    { name: "reason", label: "Reason", type: "select" as const, options: ["Annual Appraisal", "Promotion", "Performance Bonus", "Market Adjustment", "Retention", "Other"], required: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Salary Scaleup</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage salary increments and promotions</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New Increment
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Increments", value: totalIncrements, color: "text-foreground" },
          { label: "Approved", value: approvedCount, color: "text-success" },
          { label: "Pending", value: records.filter(r => r.status === "Pending").length, color: "text-warning" },
          { label: "Avg Increment", value: `${avgIncrement}%`, color: "text-primary" },
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
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No salary increments yet.</p></div>
      ) : (
        <div className="space-y-3">
          {records.map(r => {
            const sc = statusConfig[r.status] || statusConfig.Pending;
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{r.reason} • Effective {new Date(r.effective_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                    <sc.icon className="h-3 w-3" />{r.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs mt-2">
                  <span className="text-muted-foreground">Previous: <span className="font-medium text-foreground">{fmt(Number(r.previous_salary))}</span></span>
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-muted-foreground">New: <span className="font-bold text-success">{fmt(Number(r.new_salary))}</span></span>
                  <span className="text-primary font-semibold">+{Number(r.increment_percentage).toFixed(1)}%</span>
                </div>
                {r.status === "Pending" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => updateStatus(r.id, "Approved")} className="flex-1 py-1.5 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">Approve</button>
                    <button onClick={() => updateStatus(r.id, "Rejected")} className="flex-1 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">Reject</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Salary Increment" fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const currentSalary = parseFloat(data.current_salary) || 0;
          const pct = parseFloat(data.increment_pct) || 0;
          const incrementAmount = (currentSalary * pct) / 100;
          const newSalary = currentSalary + incrementAmount;
          const emp = employees.find(e => e.full_name === data.employee_name);
          if (!emp) { toast.error("Employee not found"); return; }
          const { error } = await supabase.from("salary_increments").insert(buildInsert({
            employee_id: emp.id,
            employee_name: data.employee_name,
            previous_salary: currentSalary,
            new_salary: newSalary,
            increment_percentage: pct,
            increment_amount: incrementAmount,
            effective_date: data.effective_date,
            reason: data.reason,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Salary increment submitted");
          setDialogOpen(false);
          fetchAll();
        }}
      />
    </div>
  );
}
