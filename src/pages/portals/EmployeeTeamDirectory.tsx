import { useState, useEffect } from "react";
import { Users, Search, Building2, Mail, Phone, Loader2, UserCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function EmployeeTeamDirectory() {
  const { tenantId, supabase } = useTenant();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("employees")
      .select("id, full_name, email, phone, department, job_title, avatar_url, status")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => {
        setEmployees(data || []);
        setLoading(false);
      });
  }, [tenantId]);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Team Directory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse your colleagues</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Team Members</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-info/10">
            <Building2 className="h-4 w-4 text-info" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{departments.length}</p>
            <p className="text-xs text-muted-foreground">Departments</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((emp) => (
            <div key={emp.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {emp.avatar_url ? (
                    <img src={emp.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.job_title || "Team Member"}</p>
                </div>
              </div>
              {emp.department && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Building2 className="h-3 w-3" />
                  <span>{emp.department}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{emp.email}</span>
              </div>
              {emp.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Phone className="h-3 w-3" />
                  <span>{emp.phone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
