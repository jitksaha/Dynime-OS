import { useState, useEffect } from "react";
import { Plus, Copy, Check, KeyRound, X, Pencil, Search, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import FormDialog from "@/components/FormDialog";
import DepartmentSelect from "@/components/DepartmentSelect";
import EmployeePhotoUpload from "@/components/EmployeePhotoUpload";
import EmployeeFilters from "@/components/EmployeeFilters";
import EmployeeListActions from "@/components/EmployeeListActions";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useDepartments } from "@/hooks/useDepartments";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  department: string | null;
  status: string;
  phone: string | null;
  salary: number | null;
  hire_date: string | null;
  employment_type: string;
  avatar_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  join_date: string | null;
  contract_end_date: string | null;
  notes: string | null;
}

const EMPLOYMENT_TYPES = [
  "Permanent", "Intern", "Part-time", "Contract", "Freelancer",
  "Executive Management", "Consultant", "Temporary", "Probation",
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const STATUSES = ["Active", "Inactive", "On Leave", "Terminated"];

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success",
  "On Leave": "bg-warning/10 text-warning",
  Remote: "bg-info/10 text-info",
  Inactive: "bg-muted text-muted-foreground",
  Terminated: "bg-destructive/10 text-destructive",
};

export default function HRMSEmployees() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { departments } = useDepartments(tenantId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [credentials, setCredentials] = useState<{ email: string; temp_password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("");
  const hasActiveFilters = !!(statusFilter || departmentFilter || employmentTypeFilter);

  // Verification request state
  const [verifyTarget, setVerifyTarget] = useState<Employee | null>(null);
  const [verifyType, setVerifyType] = useState<"identity" | "address" | "kyb">("identity");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [sendingVerify, setSendingVerify] = useState(false);

  // Edit state
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "", email: "", department: "", job_title: "", phone: "", status: "Active", salary: "", hire_date: "", employment_type: "Permanent",
    gender: "", date_of_birth: "", national_id: "", address: "", city: "", country: "", emergency_contact_name: "", emergency_contact_phone: "",
    bank_name: "", bank_account_name: "", bank_account_number: "", join_date: "", contract_end_date: "", notes: "", avatar_url: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase.from("employees").select("id, full_name, email, department, job_title, status, phone, salary, hire_date, employment_type, avatar_url, gender, date_of_birth, national_id, address, city, country, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_name, bank_account_number, join_date, contract_end_date, notes").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setEmployees(data as Employee[]);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, [tenantId]);

  const fields = [
    { name: "full_name", label: "Full Name", placeholder: "e.g. John Doe", required: true },
    { name: "email", label: "Email", type: "email" as const, placeholder: "e.g. john@company.com", required: true },
    { name: "phone", label: "Phone", placeholder: "e.g. +1234567890" },
    { name: "gender", label: "Gender", type: "select" as const, options: GENDERS },
    { name: "date_of_birth", label: "Date of Birth", type: "date" as const },
    { name: "national_id", label: "National ID / Passport", placeholder: "e.g. AB1234567" },
    { name: "job_title", label: "Job Title", placeholder: "e.g. Software Engineer" },
    { name: "department", label: "Department", type: "select" as const, options: departments.slice(0, 50) },
    { name: "employment_type", label: "Employment Type", type: "select" as const, options: EMPLOYMENT_TYPES, required: true },
    { name: "status", label: "Status", type: "select" as const, options: STATUSES, required: true },
    { name: "salary", label: "Monthly Salary", type: "number" as const, placeholder: "e.g. 50000" },
    { name: "join_date", label: "Join Date", type: "date" as const },
    { name: "contract_end_date", label: "Contract End Date", type: "date" as const },
    { name: "address", label: "Street Address", placeholder: "e.g. 123 Main St" },
    { name: "city", label: "City", placeholder: "e.g. Dhaka" },
    { name: "country", label: "Country", placeholder: "e.g. Bangladesh" },
    { name: "emergency_contact_name", label: "Emergency Contact Name", placeholder: "e.g. Jane Doe" },
    { name: "emergency_contact_phone", label: "Emergency Contact Phone", placeholder: "e.g. +1234567890" },
    { name: "bank_name", label: "Bank Name", placeholder: "e.g. HSBC" },
    { name: "bank_account_name", label: "Account Holder Name", placeholder: "e.g. John Doe" },
    { name: "bank_account_number", label: "Account Number", placeholder: "e.g. 1234567890" },
    { name: "notes", label: "Notes", type: "textarea" as const, placeholder: "Any additional notes..." },
  ];

  const getAvatar = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleAddEmployee = async (data: Record<string, string>) => {
    if (!tenantId) return;

    const { error } = await supabase.from("employees").insert(buildInsert({
      full_name: data.full_name, email: data.email, job_title: data.job_title || null,
      department: data.department || null, phone: data.phone || null, status: data.status || "Active",
      employment_type: data.employment_type || "Permanent", salary: data.salary ? parseFloat(data.salary) : null,
      avatar_url: avatarUrl || null,
      gender: data.gender || null, date_of_birth: data.date_of_birth || null, national_id: data.national_id || null,
      address: data.address || null, city: data.city || null, country: data.country || null,
      emergency_contact_name: data.emergency_contact_name || null, emergency_contact_phone: data.emergency_contact_phone || null,
      bank_name: data.bank_name || null, bank_account_name: data.bank_account_name || null,
      bank_account_number: data.bank_account_number || null, join_date: data.join_date || null,
      contract_end_date: data.contract_end_date || null, notes: data.notes || null, hire_date: data.join_date || null,
    }));

    if (error) { toast.error(error.message); return; }

    if (createAccount) {
      const res = await supabase.functions.invoke("invite-user", {
        body: { email: data.email, role: "employee", tenant_id: tenantId, full_name: data.full_name },
      });
      if (res.error || res.data?.error) {
        toast.warning("Employee added but login account creation failed: " + (res.data?.error || res.error?.message));
      } else {
        setCredentials({ email: res.data.email, temp_password: res.data.temp_password });
        toast.success("Employee added with login account!");
        setDialogOpen(false); setAvatarUrl(""); fetchEmployees();
        return;
      }
    }

    toast.success("Employee added");
    setDialogOpen(false); setAvatarUrl(""); fetchEmployees();
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setEditForm({
      full_name: emp.full_name, email: emp.email, department: emp.department || "", job_title: emp.job_title || "",
      phone: emp.phone || "", status: emp.status || "Active", salary: emp.salary?.toString() || "",
      hire_date: emp.hire_date || "", employment_type: emp.employment_type || "Permanent",
      avatar_url: emp.avatar_url || "",
      gender: emp.gender || "", date_of_birth: emp.date_of_birth || "", national_id: emp.national_id || "",
      address: emp.address || "", city: emp.city || "", country: emp.country || "",
      emergency_contact_name: emp.emergency_contact_name || "", emergency_contact_phone: emp.emergency_contact_phone || "",
      bank_name: emp.bank_name || "", bank_account_name: emp.bank_account_name || "",
      bank_account_number: emp.bank_account_number || "", join_date: emp.join_date || emp.hire_date || "",
      contract_end_date: emp.contract_end_date || "", notes: emp.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editEmployee || !editForm.full_name || !editForm.email) { toast.error("Name and email required"); return; }
    setSaving(true);
    const { error } = await supabase.from("employees").update({
      full_name: editForm.full_name, email: editForm.email, department: editForm.department || null,
      job_title: editForm.job_title || null, phone: editForm.phone || null, status: editForm.status || "Active",
      salary: editForm.salary ? parseFloat(editForm.salary) : null, hire_date: editForm.hire_date || editForm.join_date || null,
      employment_type: editForm.employment_type || "Permanent", avatar_url: editForm.avatar_url || null,
      gender: editForm.gender || null, date_of_birth: editForm.date_of_birth || null, national_id: editForm.national_id || null,
      address: editForm.address || null, city: editForm.city || null, country: editForm.country || null,
      emergency_contact_name: editForm.emergency_contact_name || null, emergency_contact_phone: editForm.emergency_contact_phone || null,
      bank_name: editForm.bank_name || null, bank_account_name: editForm.bank_account_name || null,
      bank_account_number: editForm.bank_account_number || null, join_date: editForm.join_date || null,
      contract_end_date: editForm.contract_end_date || null, notes: editForm.notes || null,
    }).eq("id", editEmployee.id);
    if (error) toast.error(error.message);
    else { toast.success("Employee updated"); setEditEmployee(null); fetchEmployees(); }
    setSaving(false);
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary Password: ${credentials.temp_password}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleAskVerification = async () => {
    if (!verifyTarget || !tenantId) return;
    setSendingVerify(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("employee_verification_requests").insert({
      tenant_id: tenantId, employee_id: verifyTarget.id, employee_name: verifyTarget.full_name,
      verification_type: verifyType, requested_by: user?.id || "", notes: verifyNotes || null,
    });
    setSendingVerify(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Verification request sent to ${verifyTarget.full_name}`);
    setVerifyTarget(null); setVerifyNotes(""); setVerifyType("identity");
  };

  const uniqueDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  const filtered = employees.filter((e) => {
    const matchesSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.job_title || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesDept = !departmentFilter || e.department === departmentFilter;
    const matchesType = !employmentTypeFilter || e.employment_type === employmentTypeFilter;
    return matchesSearch && matchesStatus && matchesDept && matchesType;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your organization's workforce ({employees.length} total)</p>
        </div>
        <div className="flex items-center gap-2">
          <EmployeeListActions employees={filtered} />
          <button onClick={() => { setDialogOpen(true); setCredentials(null); setAvatarUrl(""); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <EmployeeFilters
          departments={uniqueDepartments}
          statusFilter={statusFilter} departmentFilter={departmentFilter} employmentTypeFilter={employmentTypeFilter}
          onStatusChange={setStatusFilter} onDepartmentChange={setDepartmentFilter} onEmploymentTypeChange={setEmploymentTypeFilter}
          onClear={() => { setStatusFilter(""); setDepartmentFilter(""); setEmploymentTypeFilter(""); }}
          hasActiveFilters={hasActiveFilters}
        />
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground">{filtered.length} of {employees.length} employees shown</p>
        )}
      </div>

      {/* Credentials display */}
      {credentials && (
        <div className="bg-chart-2/10 border border-chart-2/30 rounded-xl p-5 space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-chart-2" /> Employee Login Credentials
          </h3>
          <p className="text-xs text-muted-foreground">Share these credentials securely with the employee.</p>
          <div className="bg-background rounded-lg p-4 font-mono text-sm space-y-1">
            <p><span className="text-muted-foreground">Email:</span> {credentials.email}</p>
            <p><span className="text-muted-foreground">Temp Password:</span> {credentials.temp_password}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyCredentials} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
              {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </button>
            <button onClick={() => setCredentials(null)} className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {/* Edit Employee Panel */}
      {editEmployee && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Edit Employee — {editEmployee.full_name}</h3>
            <button onClick={() => setEditEmployee(null)} className="p-1 rounded-md text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
          <EmployeePhotoUpload value={editForm.avatar_url} onChange={(v) => setEditForm({ ...editForm, avatar_url: v })} employeeId={editEmployee.id} tenantId={tenantId || undefined} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Full Name *", key: "full_name" },
              { label: "Email *", key: "email", type: "email" },
              { label: "Phone", key: "phone" },
              { label: "Job Title", key: "job_title" },
              { label: "Salary", key: "salary", type: "number" },
              { label: "Hire Date", key: "hire_date", type: "date" },
              { label: "Gender", key: "gender" },
              { label: "Date of Birth", key: "date_of_birth", type: "date" },
              { label: "National ID", key: "national_id" },
              { label: "Address", key: "address" },
              { label: "City", key: "city" },
              { label: "Country", key: "country" },
              { label: "Emergency Contact", key: "emergency_contact_name" },
              { label: "Emergency Phone", key: "emergency_contact_phone" },
              { label: "Bank Name", key: "bank_name" },
              { label: "Account Name", key: "bank_account_name" },
              { label: "Account Number", key: "bank_account_number" },
              { label: "Join Date", key: "join_date", type: "date" },
              { label: "Contract End", key: "contract_end_date", type: "date" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <input type={f.type || "text"} value={(editForm as any)[f.key]} onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Department</label>
              <DepartmentSelect value={editForm.department} onChange={(v) => setEditForm({ ...editForm, department: v })} departments={departments} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Employment Type *</label>
              <select value={editForm.employment_type} onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={saving} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditEmployee(null)} className="h-10 px-5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-primary/10">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">{employees.length === 0 ? "No employees yet. Add your first employee." : "No employees match your search."}</p></div>
      ) : (
        <>
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => openEdit(emp)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.full_name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{getAvatar(emp.full_name)}</div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{emp.department}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{emp.job_title}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[emp.status] || "bg-secondary text-muted-foreground"}`}>{emp.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={(e) => { e.stopPropagation(); setVerifyTarget(emp); }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-success hover:bg-success/10 transition-colors">
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent><p>Ask Employee Verification</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((emp) => (
              <div key={emp.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => openEdit(emp)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">{getAvatar(emp.full_name)}</div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[emp.status] || ""}`}>{emp.status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{emp.department}</span>
                  <span>{emp.email}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add Employee"
        fields={fields}
        layout="grid-3"
        onSubmit={handleAddEmployee}
        extraContent={
          <div className="space-y-4">
            <EmployeePhotoUpload value={avatarUrl} onChange={setAvatarUrl} tenantId={tenantId || undefined} />
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 cursor-pointer">
              <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
              <div>
                <p className="text-sm font-medium text-foreground">Create login account</p>
                <p className="text-xs text-muted-foreground">Generate login credentials so the employee can access the portal</p>
              </div>
            </label>
          </div>
        }
      />

      {/* Ask Employee Verification Dialog */}
      {verifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setVerifyTarget(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 space-y-4 shadow-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><ShieldCheck className="h-5 w-5 text-success" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Ask Employee Verification</h3>
                <p className="text-xs text-muted-foreground">Request {verifyTarget.full_name} to verify</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Verification Type</label>
                <select value={verifyType} onChange={(e) => setVerifyType(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="identity">Identity Verification (KYC)</option>
                  <option value="address">Address Verification</option>
                  <option value="kyb">Business Verification (KYB)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notes for Employee (optional)</label>
                <textarea value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="e.g. Please submit your national ID for identity verification" rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleAskVerification} disabled={sendingVerify}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {sendingVerify ? "Sending..." : "Send Verification Request"}
              </button>
              <button onClick={() => setVerifyTarget(null)}
                className="h-10 px-4 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
