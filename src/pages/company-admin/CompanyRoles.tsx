import { useState, useEffect } from "react";
import { Shield, Search, ChevronRight, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ROLES = [
  { value: "company_admin", label: "Company Admin" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "support_agent", label: "Support Agent" },
  { value: "employee", label: "Employee" },
  { value: "customer", label: "Customer" },
];

const MODULES = [
  { key: "hrms", label: "HRM" },
  { key: "crm", label: "CRM" },
  { key: "marketing", label: "Marketing" },
  { key: "accounting", label: "Accounting" },
  { key: "helpdesk", label: "Helpdesk" },
  { key: "projects", label: "Projects" },
  { key: "documents", label: "Documents" },
  { key: "reports", label: "Reports" },
  { key: "workflows", label: "Workflows" },
];

interface UserRole {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
}

interface RolePermission {
  role: string;
  module_key: string;
  is_allowed: boolean;
}

export default function CompanyRoles() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    const [rolesRes, profilesRes, permsRes] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role").eq("tenant_id", profile.tenant_id!),
      supabase.from("profiles").select("user_id, full_name").eq("tenant_id", profile.tenant_id!),
      supabase.from("role_permissions").select("role, module_key, is_allowed").eq("tenant_id", profile.tenant_id!),
    ]);
    const nameMap: Record<string, string> = {};
    (profilesRes.data || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || "Unnamed"; });
    if (rolesRes.data) {
      setUsers(rolesRes.data.map((r: any) => ({ id: r.id, user_id: r.user_id, full_name: nameMap[r.user_id] || "Unknown", role: r.role })));
    }
    if (permsRes.data) {
      setPermissions(permsRes.data as RolePermission[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.tenant_id]);

  const isModuleAllowed = (role: string, moduleKey: string) => {
    const perm = permissions.find((p) => p.role === role && p.module_key === moduleKey);
    return perm ? perm.is_allowed : true; // default allowed
  };

  const togglePermission = async (role: string, moduleKey: string) => {
    if (!profile?.tenant_id) return;
    const current = isModuleAllowed(role, moduleKey);
    const { error } = await supabase
      .from("role_permissions")
      .upsert(
        { tenant_id: profile.tenant_id!, role, module_key: moduleKey, is_allowed: !current, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,role,module_key" }
      );
    if (error) { toast.error("Failed to update permission"); return; }
    setPermissions((prev) => {
      const idx = prev.findIndex((p) => p.role === role && p.module_key === moduleKey);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], is_allowed: !current };
        return updated;
      }
      return [...prev, { role, module_key: moduleKey, is_allowed: !current }];
    });
    toast.success("Permission updated");
  };

  const changeUserRole = async (userRoleId: string, userId: string, roleValue: string) => {
    if (!profile?.tenant_id) return;
    const { error } = await supabase
      .from("user_roles")
      .update({ role: roleValue as any })
      .eq("id", userRoleId);
    if (error) { toast.error("Failed to update role"); return; }
    setUsers((prev) => prev.map((u) => u.id === userRoleId ? { ...u, role: roleValue } : u));
    setEditingUserId(null);
    toast.success("User role updated");
  };

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge: Record<string, string> = {
    company_admin: "bg-primary/10 text-primary",
    hr_manager: "bg-chart-2/10 text-chart-2",
    sales_manager: "bg-warning/10 text-warning",
    super_admin: "bg-destructive/10 text-destructive",
    employee: "bg-secondary text-muted-foreground",
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage user roles and module access permissions</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setSelectedRole(selectedRole === r.value ? null : r.value)}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all text-left ${
              selectedRole === r.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">{r.label}</p>
            </div>
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${selectedRole === r.value ? "rotate-90" : ""}`} />
          </button>
        ))}
      </div>

      {/* Permission matrix for selected role */}
      {selectedRole && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">
            Module permissions for <span className="text-primary capitalize">{selectedRole.replace(/_/g, " ")}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {MODULES.map((mod) => {
              const allowed = isModuleAllowed(selectedRole, mod.key);
              return (
                <button
                  key={mod.key}
                  onClick={() => togglePermission(selectedRole, mod.key)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    allowed
                      ? "border-chart-2/30 bg-chart-2/5"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{mod.label}</span>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                    allowed ? "bg-chart-2 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {allowed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* User list */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{u.full_name}</p>
            </div>
            {editingUserId === u.id ? (
              <div className="flex items-center gap-2">
                <select
                  value={newRole || u.role}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => changeUserRole(u.id, u.user_id, newRole || u.role)}
                  className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setEditingUserId(null)} className="p-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingUserId(u.id); setNewRole(u.role); }}
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize cursor-pointer hover:opacity-80 transition-opacity ${roleBadge[u.role] || roleBadge.employee}`}
              >
                {u.role.replace(/_/g, " ")}
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No users found</p>}
      </div>
    </div>
  );
}
