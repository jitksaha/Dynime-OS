// @ts-nocheck
import { useState, useEffect } from "react";
import { Shield, Plus, Trash2, Search, Building2, ChevronDown, ChevronRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const AVAILABLE_ROLES = [
  { value: "super_admin", label: "Super Admin", desc: "Full platform access across all tenants", color: "text-destructive bg-destructive/10" },
  { value: "company_admin", label: "Company Admin", desc: "Full access to all modules and settings", color: "text-primary bg-primary/10" },
  { value: "operations_manager", label: "Operations Manager", desc: "Oversee daily operations and workflows", color: "text-orange-600 bg-orange-500/10" },
  { value: "hr_manager", label: "HR Manager", desc: "Manage HRMS module", color: "text-emerald-600 bg-emerald-500/10" },
  { value: "sales_manager", label: "Sales Manager", desc: "Manage CRM and sales pipeline", color: "text-blue-600 bg-blue-500/10" },
  { value: "marketing_manager", label: "Marketing Manager", desc: "Manage campaigns and templates", color: "text-purple-600 bg-purple-500/10" },
  { value: "finance_manager", label: "Finance Manager", desc: "Manage invoices, expenses, payments", color: "text-amber-600 bg-amber-500/10" },
  { value: "content_manager", label: "Content Manager", desc: "Manage blog, pages, and media content", color: "text-pink-600 bg-pink-500/10" },
  { value: "technical_support", label: "Technical Support", desc: "System maintenance and tech issues", color: "text-indigo-600 bg-indigo-500/10" },
  { value: "support_agent", label: "Customer Service", desc: "Handle helpdesk tickets and live chat", color: "text-cyan-600 bg-cyan-500/10" },
  { value: "employee", label: "Employee", desc: "Basic access only", color: "text-muted-foreground bg-muted" },
  { value: "customer", label: "Customer", desc: "Customer portal access", color: "text-green-600 bg-green-500/10" },
];

const MODULE_CAPABILITIES = [
  { module: "hrms", label: "HRM", capabilities: ["view_employees", "manage_employees", "view_attendance", "manage_attendance", "view_leave", "manage_leave", "view_payroll", "manage_payroll", "manage_recruitment", "manage_performance", "view_shifts", "manage_shifts", "view_late", "manage_late", "view_salary_scaleup", "manage_salary_scaleup"] },
  { module: "crm", label: "CRM", capabilities: ["view_deals", "manage_deals", "view_contacts", "manage_contacts", "export_data"] },
  { module: "accounting", label: "Accounting", capabilities: ["view_invoices", "manage_invoices", "view_expenses", "manage_expenses", "view_payments", "manage_payments", "view_tax", "manage_tax"] },
  { module: "marketing", label: "Marketing", capabilities: ["view_campaigns", "manage_campaigns", "view_templates", "manage_templates", "view_analytics"] },
  { module: "helpdesk", label: "Helpdesk", capabilities: ["view_tickets", "manage_tickets", "assign_tickets", "close_tickets"] },
  { module: "projects", label: "Projects", capabilities: ["view_projects", "manage_projects", "manage_tasks", "view_reports"] },
  { module: "documents", label: "Documents", capabilities: ["view_documents", "upload_documents", "delete_documents", "share_documents"] },
  { module: "reports", label: "Reports", capabilities: ["view_reports", "export_reports", "create_reports"] },
  { module: "workflows", label: "Workflows", capabilities: ["view_workflows", "manage_workflows", "approve_requests"] },
  { module: "product_hub", label: "Point of Sale (POS)", capabilities: ["view_products", "manage_products", "manage_orders", "manage_integrations"] },
  { module: "admin", label: "Administration", capabilities: ["manage_settings", "manage_users", "manage_roles", "view_audit_logs", "manage_billing"] },
];

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  role: string;
  role_id: string;
  tenant_name: string;
  tenant_id: string;
}

interface RoleCapability {
  role: string;
  module: string;
  capabilities: string[];
}

export default function RoleManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; full_name: string | null; tenant_id: string | null }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [search, setSearch] = useState("");
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [roleCapabilities, setRoleCapabilities] = useState<Record<string, Record<string, string[]>>>({});



  const fetchData = async () => {
    const [rolesRes, profilesRes, tenantsRes] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, tenant_id"),
      supabase.from("profiles").select("user_id, full_name, tenant_id"),
      supabase.from("tenants").select("id, name"),
    ]);

    const tenantMap: Record<string, string> = {};
    (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t.name; });
    if (tenantsRes.data) setTenants(tenantsRes.data);
    if (profilesRes.data) setAllProfiles(profilesRes.data);

    if (rolesRes.data) {
      setUsers(
        rolesRes.data.map((r: any) => ({
          user_id: r.user_id,
          full_name: profilesRes.data?.find((p: any) => p.user_id === r.user_id)?.full_name || "Unknown",
          role: r.role,
          role_id: r.id,
          tenant_id: r.tenant_id,
          tenant_name: tenantMap[r.tenant_id] || "Unknown",
        }))
      );
    }

    // Build default capability map
    const defaultCaps: Record<string, Record<string, string[]>> = {};
    AVAILABLE_ROLES.forEach(r => {
      defaultCaps[r.value] = {};
      if (r.value === "super_admin" || r.value === "company_admin") {
        MODULE_CAPABILITIES.forEach(m => { defaultCaps[r.value][m.module] = [...m.capabilities]; });
      } else if (r.value === "hr_manager") {
        defaultCaps[r.value]["hrms"] = MODULE_CAPABILITIES.find(m => m.module === "hrms")?.capabilities || [];
      } else if (r.value === "sales_manager") {
        defaultCaps[r.value]["crm"] = MODULE_CAPABILITIES.find(m => m.module === "crm")?.capabilities || [];
      } else if (r.value === "marketing_manager") {
        defaultCaps[r.value]["marketing"] = MODULE_CAPABILITIES.find(m => m.module === "marketing")?.capabilities || [];
      } else if (r.value === "finance_manager") {
        defaultCaps[r.value]["accounting"] = MODULE_CAPABILITIES.find(m => m.module === "accounting")?.capabilities || [];
      } else if (r.value === "support_agent") {
        defaultCaps[r.value]["helpdesk"] = MODULE_CAPABILITIES.find(m => m.module === "helpdesk")?.capabilities || [];
      }
    });
    setRoleCapabilities(defaultCaps);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const assignRole = async () => {
    if (!selectedUser || !selectedRole || !selectedTenant) {
      toast.error("Please select user, role, and tenant");
      return;
    }
    setAssigning(true);
    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUser,
      role: selectedRole as any,
      tenant_id: selectedTenant,
    });
    setAssigning(false);
    if (error) {
      if (error.message.includes("duplicate")) toast.error("User already has this role");
      else toast.error(error.message);
      return;
    }
    toast.success("Role assigned successfully");
    setSelectedUser("");
    setSelectedRole("");
    setSelectedTenant("");
    fetchData();
  };

  const removeRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role removed");
    fetchData();
  };

  const toggleCapability = (role: string, module: string, capability: string) => {
    setRoleCapabilities(prev => {
      const updated = { ...prev };
      if (!updated[role]) updated[role] = {};
      if (!updated[role][module]) updated[role][module] = [];
      const caps = [...updated[role][module]];
      const idx = caps.indexOf(capability);
      if (idx >= 0) caps.splice(idx, 1);
      else caps.push(capability);
      updated[role] = { ...updated[role], [module]: caps };
      return updated;
    });
  };

  const toggleAllModule = (role: string, module: string, allCaps: string[]) => {
    setRoleCapabilities(prev => {
      const updated = { ...prev };
      if (!updated[role]) updated[role] = {};
      const current = updated[role][module] || [];
      if (current.length === allCaps.length) {
        updated[role] = { ...updated[role], [module]: [] };
      } else {
        updated[role] = { ...updated[role], [module]: [...allCaps] };
      }
      return updated;
    });
  };

  const prettifyCap = (cap: string) => cap.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const roleCounts = AVAILABLE_ROLES.map(r => ({
    ...r,
    count: users.filter(u => u.role === r.value).length,
  }));

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()) ||
    u.tenant_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Role Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Assign roles, manage capabilities, and define permissions across modules</p>
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="roles">Roles Editor</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

        {/* ─── ASSIGNMENTS TAB ─── */}
        <TabsContent value="assignments" className="space-y-6">
          {/* Assign role form */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Assign Role</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select user...</option>
                {allProfiles.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name || "Unnamed"}</option>
                ))}
              </select>
              <select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select role...</option>
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <Button onClick={assignRole} disabled={!selectedUser || !selectedRole || !selectedTenant || assigning} className="h-10">
                <Plus className="h-4 w-4 mr-1" /> Assign
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder="Search assignments..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Current assignments */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Current Assignments ({filtered.length})</h3>
            {filtered.map((u) => {
              const roleInfo = AVAILABLE_ROLES.find(r => r.value === u.role);
              return (
                <div key={u.role_id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", roleInfo?.color || "bg-muted")}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{u.tenant_name}</p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{roleInfo?.label || u.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeRole(u.role_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No roles assigned yet</p>}
          </div>
        </TabsContent>

        {/* ─── ROLES EDITOR TAB ─── */}
        <TabsContent value="roles" className="space-y-4">
          <p className="text-sm text-muted-foreground">Overview of all platform roles and their assigned user counts.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleCounts.map((r) => (
              <div key={r.value} className="border border-border rounded-xl bg-card p-5 space-y-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", r.color)}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.count} user{r.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Modules</p>
                  <div className="flex flex-wrap gap-1">
                    {MODULE_CAPABILITIES.map(m => {
                      const caps = roleCapabilities[r.value]?.[m.module] || [];
                      if (caps.length === 0) return null;
                      return (
                        <Badge key={m.module} variant="outline" className="text-[10px] px-1.5 py-0">
                          {m.label} ({caps.length})
                        </Badge>
                      );
                    })}
                    {Object.keys(roleCapabilities[r.value] || {}).every(k => (roleCapabilities[r.value]?.[k] || []).length === 0) && (
                      <span className="text-[10px] text-muted-foreground italic">No modules assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── CAPABILITIES TAB ─── */}
        <TabsContent value="capabilities" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Define granular permissions for each role across all modules.</p>
          </div>

          <div className="space-y-3">
            {AVAILABLE_ROLES.filter(r => r.value !== "super_admin").map((role) => {
              const isExpanded = expandedRole === role.value;
              return (
                <div key={role.value} className="border border-border rounded-xl bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedRole(isExpanded ? null : role.value)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", role.color)}>
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.desc}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4">
                      {MODULE_CAPABILITIES.map((mod) => {
                        const activeCaps = roleCapabilities[role.value]?.[mod.module] || [];
                        const allChecked = activeCaps.length === mod.capabilities.length;
                        return (
                          <div key={mod.module} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-foreground">{mod.label}</h4>
                                <Badge variant="outline" className="text-[10px]">{activeCaps.length}/{mod.capabilities.length}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">All</span>
                                <Switch
                                  checked={allChecked}
                                  onCheckedChange={() => toggleAllModule(role.value, mod.module, mod.capabilities)}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                              {mod.capabilities.map((cap) => {
                                const isActive = activeCaps.includes(cap);
                                return (
                                  <button
                                    key={cap}
                                    onClick={() => toggleCapability(role.value, mod.module, cap)}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                                      isActive
                                        ? "border-primary/30 bg-primary/5 text-primary"
                                        : "border-border bg-background text-muted-foreground hover:border-primary/20"
                                    )}
                                  >
                                    <div className={cn(
                                      "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                      isActive ? "bg-primary border-primary" : "border-muted-foreground/30"
                                    )}>
                                      {isActive && <Check className="h-3 w-3 text-primary-foreground" />}
                                    </div>
                                    {prettifyCap(cap)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
