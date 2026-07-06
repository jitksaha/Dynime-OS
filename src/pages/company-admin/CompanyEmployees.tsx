import { useState, useEffect } from "react";
import { Users, Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useDepartments";
import DepartmentSelect from "@/components/DepartmentSelect";
import EmployeePhotoUpload from "@/components/EmployeePhotoUpload";
import EmployeeFilters from "@/components/EmployeeFilters";
import EmployeeListActions from "@/components/EmployeeListActions";
import { toast } from "sonner";

const EMPLOYMENT_TYPES = ["Permanent", "Intern", "Part-time", "Contract", "Freelancer", "Executive Management", "Consultant", "Temporary", "Probation"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const STATUSES = ["Active", "Inactive", "On Leave", "Terminated"];

interface Employee {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  job_title: string | null;
  status: string;
  phone: string | null;
  employment_type: string;
  salary: number | null;
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
  hire_date: string | null;
  notes: string | null;
}

const emptyForm = {
  full_name: "", email: "", department: "", job_title: "", phone: "", status: "Active",
  employment_type: "", salary: "", avatar_url: "", gender: "", date_of_birth: "", national_id: "",
  address: "", city: "", country: "", emergency_contact_name: "", emergency_contact_phone: "",
  bank_name: "", bank_account_name: "", bank_account_number: "", join_date: "", contract_end_date: "", notes: "",
};

export default function CompanyEmployees() {
  const { user, profile } = useAuth();
  const { departments } = useDepartments(profile?.tenant_id);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("");
  const hasActiveFilters = !!(statusFilter || departmentFilter || employmentTypeFilter);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase.from("employees")
      .select("id, full_name, email, department, job_title, status, phone, employment_type, salary, avatar_url, gender, date_of_birth, national_id, address, city, country, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_name, bank_account_number, join_date, contract_end_date, hire_date, notes")
      .eq("tenant_id", profile.tenant_id);
    if (data) setEmployees(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.tenant_id]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      full_name: e.full_name, email: e.email, department: e.department || "", job_title: e.job_title || "",
      phone: e.phone || "", status: e.status, employment_type: e.employment_type || "", salary: String(e.salary || ""),
      avatar_url: e.avatar_url || "",
      gender: e.gender || "", date_of_birth: e.date_of_birth || "", national_id: e.national_id || "",
      address: e.address || "", city: e.city || "", country: e.country || "",
      emergency_contact_name: e.emergency_contact_name || "", emergency_contact_phone: e.emergency_contact_phone || "",
      bank_name: e.bank_name || "", bank_account_name: e.bank_account_name || "", bank_account_number: e.bank_account_number || "",
      join_date: e.join_date || e.hire_date || "", contract_end_date: e.contract_end_date || "", notes: e.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email || !profile?.tenant_id) { toast.error("Name and email are required"); return; }
    setSaving(true);
    const payload: any = {
      full_name: form.full_name, email: form.email, department: form.department || null,
      job_title: form.job_title || null, phone: form.phone || null, status: form.status,
      employment_type: form.employment_type || "Permanent", salary: form.salary ? parseFloat(form.salary) : null,
      avatar_url: form.avatar_url || null,
      gender: form.gender || null, date_of_birth: form.date_of_birth || null, national_id: form.national_id || null,
      address: form.address || null, city: form.city || null, country: form.country || null,
      emergency_contact_name: form.emergency_contact_name || null, emergency_contact_phone: form.emergency_contact_phone || null,
      bank_name: form.bank_name || null, bank_account_name: form.bank_account_name || null,
      bank_account_number: form.bank_account_number || null, join_date: form.join_date || null,
      contract_end_date: form.contract_end_date || null, notes: form.notes || null,
    };
    if (editing) {
      const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Updated");
    } else {
      const { error } = await supabase.from("employees").insert({ ...payload, tenant_id: profile.tenant_id, created_by: user!.id });
      if (error) toast.error(error.message); else toast.success("Employee added");
    }
    setSaving(false); setShowForm(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchData(); }
  };

  const uniqueDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  const filtered = employees.filter((e) => {
    const matchesSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesDept = !departmentFilter || e.department === departmentFilter;
    const matchesType = !employmentTypeFilter || e.employment_type === employmentTypeFilter;
    return matchesSearch && matchesStatus && matchesDept && matchesType;
  });

  const statusColor: Record<string, string> = { Active: "bg-chart-2/10 text-chart-2", Inactive: "bg-muted text-muted-foreground", "On Leave": "bg-warning/10 text-warning", Terminated: "bg-destructive/10 text-destructive" };

  const InputField = ({ label, name, type = "text", placeholder = "", required = false }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</label>
      <input type={type} value={(form as any)[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} placeholder={placeholder}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );

  const SelectField = ({ label, name, options, placeholder = "Select..." }: { label: string; name: string; options: string[]; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select value={(form as any)[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} employees</p>
        </div>
        <div className="flex items-center gap-2">
          <EmployeeListActions employees={filtered} />
          <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="h-4 w-4" /> Add Employee</button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{editing ? "Edit" : "Add"} Employee</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-md text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>

          {/* Photo Upload */}
          <EmployeePhotoUpload value={form.avatar_url} onChange={(v) => setForm({ ...form, avatar_url: v })} employeeId={editing?.id} tenantId={profile?.tenant_id || undefined} />

          {/* Personal Information */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InputField label="Full Name" name="full_name" placeholder="e.g. John Doe" required />
              <InputField label="Email" name="email" type="email" placeholder="e.g. john@company.com" required />
              <InputField label="Phone" name="phone" placeholder="e.g. +1234567890" />
              <SelectField label="Gender" name="gender" options={GENDERS} />
              <InputField label="Date of Birth" name="date_of_birth" type="date" />
              <InputField label="National ID / Passport" name="national_id" placeholder="e.g. AB1234567" />
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Employment Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InputField label="Job Title" name="job_title" placeholder="e.g. Software Engineer" />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <DepartmentSelect value={form.department} onChange={(v) => setForm({ ...form, department: v })} departments={departments} />
              </div>
              <SelectField label="Employment Type" name="employment_type" options={EMPLOYMENT_TYPES} />
              <SelectField label="Status" name="status" options={STATUSES} />
              <InputField label="Monthly Salary" name="salary" type="number" placeholder="e.g. 50000" />
              <InputField label="Join Date" name="join_date" type="date" />
              <InputField label="Contract End Date" name="contract_end_date" type="date" />
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <InputField label="Street Address" name="address" placeholder="e.g. 123 Main St, Apt 4B" />
              </div>
              <InputField label="City" name="city" placeholder="e.g. Dhaka" />
              <InputField label="Country" name="country" placeholder="e.g. Bangladesh" />
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InputField label="Contact Name" name="emergency_contact_name" placeholder="e.g. Jane Doe" />
              <InputField label="Contact Phone" name="emergency_contact_phone" placeholder="e.g. +1234567890" />
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bank Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InputField label="Bank Name" name="bank_name" placeholder="e.g. HSBC" />
              <InputField label="Account Holder Name" name="bank_account_name" placeholder="e.g. John Doe" />
              <InputField label="Account Number" name="bank_account_number" placeholder="e.g. 1234567890" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notes..."
              className="w-full mt-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : editing ? "Save Changes" : "Create"}</button>
            <button onClick={() => setShowForm(false)} className="h-10 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              {e.avatar_url ? (
                <img src={e.avatar_url} alt={e.full_name} className="h-9 w-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-4 w-4 text-primary" /></div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{e.full_name}</p>
                <p className="text-xs text-muted-foreground">{e.email} {e.department ? `· ${e.department}` : ""} {e.job_title ? `· ${e.job_title}` : ""} {e.employment_type ? `· ${e.employment_type}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[e.status] || statusColor.Active}`}>{e.status}</span>
              <button onClick={() => openEdit(e)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No employees found</p>}
      </div>
    </div>
  );
}
