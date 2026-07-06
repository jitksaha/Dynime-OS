import { useState, useEffect } from "react";
import { Download, Search, Plus, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/export-utils";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
  salary: number | null;
}

interface PayrollRecord {
  id: string;
  employee_name: string;
  employee_department: string | null;
  pay_period: string;
  basic_salary: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  status: string;
}

const statusColor: Record<string, string> = {
  Processed: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Draft: "bg-secondary text-muted-foreground",
};

// fmt is defined inside component to use dynamic currency

export default function Payroll() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const navigate = useNavigate();
  const { formatPrice: fmt } = useTenantCurrency();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, department, salary")
      .eq("tenant_id", tenantId)
      .eq("status", "Active");
    setEmployees((data as Employee[]) || []);
  };

  const fetchRecords = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (!error && data) setRecords(data as PayrollRecord[]);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); fetchEmployees(); }, [tenantId]);

  const filtered = records.filter(r =>
    r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.employee_department || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPayroll = records.reduce((a, b) => a + Number(b.net_pay), 0);
  const processedCount = records.filter(r => r.status === "Processed").length;
  const pendingCount = records.filter(r => r.status === "Pending").length;
  const totalDeductions = records.reduce((a, b) => a + Number(b.deductions), 0);

  const summaryStats = [
    { label: "Total Payroll", value: fmt(totalPayroll), sub: "Current period", color: "text-foreground" },
    { label: "Processed", value: processedCount.toString(), sub: `${records.length > 0 ? ((processedCount / records.length) * 100).toFixed(0) : 0}% complete`, color: "text-success" },
    { label: "Pending", value: pendingCount.toString(), sub: "Awaiting approval", color: "text-warning" },
    { label: "Total Deductions", value: fmt(totalDeductions), sub: "Tax + benefits", color: "text-muted-foreground" },
  ];

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.full_name,
    sublabel: e.department || undefined,
  }));

  const fields = [
    {
      name: "employee_name",
      label: "Employee Name",
      type: "autocomplete" as const,
      placeholder: "Search employees...",
      required: true,
      autocompleteOptions: employeeOptions,
      onAutocompleteSelect: (opt: { value: string; label: string; sublabel?: string }, setFormData: (updater: (prev: Record<string, string>) => Record<string, string>) => void) => {
        const emp = employees.find((e) => e.id === opt.value);
        if (emp) {
          setFormData((prev) => ({
            ...prev,
            department: emp.department || "",
            basic_salary: emp.salary ? String(emp.salary) : "",
          }));
        }
      },
    },
    { name: "department", label: "Department", type: "select" as const, options: ["Engineering", "Sales", "Marketing", "HR", "Design", "Finance", "Support"], required: true },
    { name: "pay_period", label: "Pay Period", placeholder: "e.g. Feb 2026", required: true },
    { name: "basic_salary", label: "Basic Salary", type: "number" as const, placeholder: "e.g. 8000", required: true },
    { name: "hra", label: "HRA", type: "number" as const, placeholder: "e.g. 2400", required: true },
    { name: "allowances", label: "Allowances", type: "number" as const, placeholder: "e.g. 1000", required: true },
    { name: "deductions", label: "Deductions", type: "number" as const, placeholder: "e.g. 1500", required: true },
  ];

  const getAvatar = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("payroll_records").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payroll ${status.toLowerCase()}`);
    fetchRecords();
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">Salary processing and payslip management</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate("/hrm/payroll-settings")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
          >
            <Settings className="h-4 w-4" /> Payroll Settings
          </button>
          <button
            onClick={() => exportToCSV(records.map(r => ({
              Employee: r.employee_name, Department: r.employee_department, Period: r.pay_period,
              Basic: r.basic_salary, HRA: r.hra, Allowances: r.allowances, Deductions: r.deductions, Net: r.net_pay, Status: r.status,
            })), "payroll")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setDialogOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Payroll
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryStats.map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees..."
          className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No payroll records yet.</p></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Basic</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">HRA</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Allowances</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deductions</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Pay</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{getAvatar(p.employee_name)}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.employee_name}</p>
                          <p className="text-xs text-muted-foreground">{p.employee_department || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right text-foreground">{fmt(Number(p.basic_salary))}</td>
                    <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">{fmt(Number(p.hra))}</td>
                    <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">{fmt(Number(p.allowances))}</td>
                    <td className="px-4 py-3.5 text-sm text-right text-destructive">{fmt(Number(p.deductions))}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-semibold text-foreground">{fmt(Number(p.net_pay))}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[p.status] || statusColor.Draft}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.status === "Draft" && (
                        <button onClick={() => updateStatus(p.id, "Pending")} className="px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors">Submit</button>
                      )}
                      {p.status === "Pending" && (
                        <button onClick={() => updateStatus(p.id, "Processed")} className="px-2 py-1 rounded text-xs font-medium text-success hover:bg-success/10 transition-colors">Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{getAvatar(p.employee_name)}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{p.employee_department || "—"}</p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor[p.status] || statusColor.Draft}`}>{p.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Basic:</span> <span className="ml-1 font-medium text-foreground">{fmt(Number(p.basic_salary))}</span></div>
                  <div><span className="text-muted-foreground">HRA:</span> <span className="ml-1 text-foreground">{fmt(Number(p.hra))}</span></div>
                  <div><span className="text-muted-foreground">Allowances:</span> <span className="ml-1 text-foreground">{fmt(Number(p.allowances))}</span></div>
                  <div><span className="text-muted-foreground">Deductions:</span> <span className="ml-1 text-destructive">{fmt(Number(p.deductions))}</span></div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div>
                    <span className="text-xs text-muted-foreground">Net Pay: </span>
                    <span className="text-sm font-bold text-foreground">{fmt(Number(p.net_pay))}</span>
                  </div>
                  {p.status === "Draft" && (
                    <button onClick={() => updateStatus(p.id, "Pending")} className="px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">Submit</button>
                  )}
                  {p.status === "Pending" && (
                    <button onClick={() => updateStatus(p.id, "Processed")} className="px-3 py-1 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">Approve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add Payroll Record"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const basic = parseFloat(data.basic_salary) || 0;
          const hra = parseFloat(data.hra) || 0;
          const allowances = parseFloat(data.allowances) || 0;
          const deductions = parseFloat(data.deductions) || 0;
          const net = basic + hra + allowances - deductions;
          const { error } = await supabase.from("payroll_records").insert(buildInsert({
            employee_name: data.employee_name,
            employee_department: data.department,
            pay_period: data.pay_period,
            basic_salary: basic,
            hra,
            allowances,
            deductions,
            net_pay: net,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Payroll record added");
          setDialogOpen(false);
          fetchRecords();
        }}
      />
    </div>
  );
}
