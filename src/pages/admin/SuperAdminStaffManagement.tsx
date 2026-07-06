import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Users, Search, Shield, ChevronRight, Check, X, Loader2,
  UserPlus, Mail, Phone, Building2, Clock, Activity,
  BarChart3, FileText, Headphones, FolderOpen, Workflow,
  CreditCard, MessageSquare, Calendar, ShoppingBag, Plus,
  Trash2, Edit, Lock, Unlock, AlertTriangle, RefreshCw,
  Eye, Pencil, Download, CheckCircle2, ListTodo, UsersRound,
  MonitorSmartphone, Globe, KeyRound, Briefcase,
} from "lucide-react";

/* ═══ Types ═══ */
interface StaffMember {
  user_id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  department?: string;
  tenant_id: string | null;
  tenant_name?: string;
  roles: string[];
  role_ids: Record<string, string>;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  team_leader_id: string | null;
  color: string;
  tenant_id: string;
  tenant_name?: string;
  is_active: boolean;
  members: { user_id: string; id: string }[];
}

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  team_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  tenant_id: string;
  created_at: string;
}

/* ═══ Constants ═══ */
const AVAILABLE_ROLES = [
  { value: "super_admin", label: "Super Admin", desc: "Full platform access", color: "text-destructive bg-destructive/10" },
  { value: "company_admin", label: "Company Admin", desc: "Full company access", color: "text-primary bg-primary/10" },
  { value: "operations_manager", label: "Operations Manager", desc: "Daily operations oversight", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400" },
  { value: "hr_manager", label: "HR Manager", desc: "HR & payroll", color: "text-chart-2 bg-chart-2/10" },
  { value: "sales_manager", label: "Sales Manager", desc: "CRM & sales", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
  { value: "marketing_manager", label: "Marketing Manager", desc: "Campaigns", color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400" },
  { value: "finance_manager", label: "Finance Manager", desc: "Finance & billing", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" },
  { value: "content_manager", label: "Content Manager", desc: "Blog & media", color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400" },
  { value: "technical_support", label: "Technical Support", desc: "System maintenance", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400" },
  { value: "support_agent", label: "Customer Service", desc: "Helpdesk & chat", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
  { value: "support_team", label: "Support Team", desc: "Platform support", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400" },
  { value: "technical_team", label: "Technical Team", desc: "Technical operations", color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400" },
  { value: "content_team", label: "Content Team", desc: "Content creation", color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400" },
  { value: "billing_team", label: "Billing Team", desc: "Billing operations", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400" },
  { value: "employee", label: "Employee", desc: "Basic access", color: "text-muted-foreground bg-muted" },
  { value: "customer", label: "Customer", desc: "Customer portal", color: "text-muted-foreground bg-muted" },
];

/* Roles available when creating platform-level users from super admin */
const PLATFORM_ROLES = [
  { value: "support_team", label: "Support Team" },
  { value: "technical_team", label: "Technical Team" },
  { value: "content_team", label: "Content Team" },
  { value: "billing_team", label: "Billing Team" },
  { value: "technical_support", label: "Technical Support" },
  { value: "support_agent", label: "Customer Service" },
  { value: "content_manager", label: "Content Manager" },
  { value: "operations_manager", label: "Operations Manager" },
];

const ABILITY_MODULES = [
  { key: "hrms", label: "HRM", icon: Users },
  { key: "crm", label: "CRM", icon: BarChart3 },
  { key: "marketing", label: "Marketing", icon: MessageSquare },
  { key: "accounting", label: "Accounting", icon: CreditCard },
  { key: "helpdesk", label: "Helpdesk", icon: Headphones },
  { key: "projects", label: "Projects", icon: Briefcase },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "workflows", label: "Workflows", icon: Workflow },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "pos", label: "POS", icon: ShoppingBag },
];

const ACTION_PERMISSIONS = ["view", "create", "edit", "delete", "export", "approve"];
const ACTION_ICONS: Record<string, React.ElementType> = { view: Eye, create: Plus, edit: Pencil, delete: Trash2, export: Download, approve: CheckCircle2 };

const SECTIONS = [
  { key: "customer_support", label: "Customer Support", desc: "Tickets, chat, queries" },
  { key: "orders_management", label: "Orders Management", desc: "Order processing" },
  { key: "billing", label: "Billing & Finance", desc: "Invoices, payments" },
  { key: "website_content", label: "Website Content", desc: "Blog, pages, media" },
  { key: "marketing_campaigns", label: "Marketing Campaigns", desc: "Campaigns, analytics" },
  { key: "technical_maintenance", label: "Technical Maintenance", desc: "System settings" },
  { key: "hr_operations", label: "HR Operations", desc: "Employees, payroll" },
  { key: "project_management", label: "Project Management", desc: "Tasks, milestones" },
];

type TabKey = "staff" | "sections" | "abilities" | "teams" | "tasks" | "security";

export default function SuperAdminStaffManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [sectionAccess, setSectionAccess] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [accountSettings, setAccountSettings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [showRolePanel, setShowRolePanel] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamLeader, setTeamLeader] = useState("");
  const [teamColor, setTeamColor] = useState("#4F46E5");
  const [teamTenantId, setTeamTenantId] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Add User form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("support_team");
  const [creatingUser, setCreatingUser] = useState(false);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskTenantId, setTaskTenantId] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");

  /* ─── Fetch ─── */
  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, tenantsRes, permsRes, sectionsRes, teamsRes, membersRes, tasksRes, acctRes, logsRes, sessRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url, department, tenant_id"),
      supabase.from("user_roles").select("id, user_id, role, tenant_id"),
      supabase.from("tenants").select("id, name"),
      supabase.from("role_permissions").select("tenant_id, role, module_key, is_allowed"),
      supabase.from("section_access_rules").select("tenant_id, role, section_key, is_allowed"),
      supabase.from("teams").select("*").order("created_at", { ascending: false }),
      supabase.from("team_members").select("id, team_id, user_id, tenant_id"),
      supabase.from("staff_tasks").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("staff_account_settings").select("*"),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("active_sessions").select("*").order("last_active", { ascending: false }).limit(100),
    ]);

    const tenantMap: Record<string, string> = {};
    (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t.name; });
    setTenants(tenantsRes.data || []);

    const rolesByUser: Record<string, { roles: string[]; role_ids: Record<string, string> }> = {};
    (rolesRes.data || []).forEach((r: any) => {
      if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = { roles: [], role_ids: {} };
      rolesByUser[r.user_id].roles.push(r.role);
      rolesByUser[r.user_id].role_ids[r.role] = r.id;
    });

    const members: StaffMember[] = (profilesRes.data || []).map((p: any) => {
      const userRoles = rolesByUser[p.user_id] || { roles: [], role_ids: {} };
      return {
        user_id: p.user_id, full_name: p.full_name || "Unnamed",
        avatar_url: p.avatar_url, department: p.department,
        tenant_id: p.tenant_id, tenant_name: tenantMap[p.tenant_id] || "Unassigned",
        roles: userRoles.roles, role_ids: userRoles.role_ids,
      };
    });

    const teamsData = (teamsRes.data || []).map((t: any) => ({
      ...t, tenant_name: tenantMap[t.tenant_id] || "Unknown",
      members: (membersRes.data || []).filter((m: any) => m.team_id === t.id),
    }));

    setStaff(members);
    setPermissions(permsRes.data || []);
    setSectionAccess(sectionsRes.data || []);
    setTeams(teamsData);
    setTasks((tasksRes.data || []) as StaffTask[]);
    setAccountSettings(acctRes.data || []);
    setAuditLogs(logsRes.data || []);
    setSessions(sessRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  /* ─── Helpers ─── */
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || s.roles.includes(roleFilter);
      const matchTenant = !tenantFilter || s.tenant_id === tenantFilter;
      return matchSearch && matchRole && matchTenant;
    });
  }, [staff, search, roleFilter, tenantFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    staff.forEach(s => s.roles.forEach(r => { counts[r] = (counts[r] || 0) + 1; }));
    return counts;
  }, [staff]);

  const getStaffName = (id: string | null) => staff.find(s => s.user_id === id)?.full_name || "Unknown";
  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.name || "Unknown";
  const getAccountSetting = (userId: string) => accountSettings.find((a: any) => a.user_id === userId);

  const isPermAllowed = (tenantId: string, role: string, key: string) => {
    const p = permissions.find((p: any) => p.tenant_id === tenantId && p.role === role && p.module_key === key);
    return p ? p.is_allowed : true;
  };

  const isSectionAllowed = (tenantId: string, role: string, sectionKey: string) => {
    const r = sectionAccess.find((s: any) => s.tenant_id === tenantId && s.role === role && s.section_key === sectionKey);
    return r ? r.is_allowed : true;
  };

  /* ─── Actions ─── */
  const assignRole = async (userId: string, role: string) => {
    const u = staff.find(s => s.user_id === userId);
    if (!u?.tenant_id) { toast.error("User has no tenant"); return; }
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, tenant_id: u.tenant_id, role: role as any });
    if (error) { error.message.includes("duplicate") ? toast.error("Already assigned") : toast.error(error.message); }
    else { toast.success("Role assigned"); fetchData(); }
    setSaving(false); setShowRolePanel(false);
  };

  const removeRole = async (roleId: string) => {
    setSaving(true);
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast.error(error.message); else { toast.success("Role removed"); fetchData(); }
    setSaving(false);
  };

  const toggleLoginAccess = async (userId: string, enabled: boolean) => {
    const u = staff.find(s => s.user_id === userId);
    if (!u?.tenant_id) return;
    const { error } = await supabase.from("staff_account_settings").upsert(
      { user_id: userId, tenant_id: u.tenant_id, is_login_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) toast.error(error.message);
    else { toast.success(enabled ? "Login enabled" : "Login disabled"); fetchData(); }
  };

  const forcePasswordChange = async (userId: string) => {
    const u = staff.find(s => s.user_id === userId);
    if (!u?.tenant_id) return;
    const { error } = await supabase.from("staff_account_settings").upsert(
      { user_id: userId, tenant_id: u.tenant_id, force_password_change: true, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) toast.error(error.message); else toast.success("Password change flagged");
  };

  const toggle2FA = async (userId: string, enabled: boolean) => {
    const u = staff.find(s => s.user_id === userId);
    if (!u?.tenant_id) return;
    const { error } = await supabase.from("staff_account_settings").upsert(
      { user_id: userId, tenant_id: u.tenant_id, two_factor_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) toast.error(error.message); else { toast.success(enabled ? "2FA enabled" : "2FA disabled"); fetchData(); }
  };

  const togglePermission = async (tenantId: string, role: string, moduleKey: string) => {
    const current = isPermAllowed(tenantId, role, moduleKey);
    const { error } = await supabase.from("role_permissions").upsert(
      { tenant_id: tenantId, role, module_key: moduleKey, is_allowed: !current, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,role,module_key" }
    );
    if (error) { toast.error("Failed"); return; }
    setPermissions(prev => {
      const idx = prev.findIndex((p: any) => p.tenant_id === tenantId && p.role === role && p.module_key === moduleKey);
      if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], is_allowed: !current }; return u; }
      return [...prev, { tenant_id: tenantId, role, module_key: moduleKey, is_allowed: !current }];
    });
    toast.success("Updated");
  };

  const toggleSection = async (tenantId: string, role: string, sectionKey: string) => {
    const current = isSectionAllowed(tenantId, role, sectionKey);
    const { error } = await supabase.from("section_access_rules").upsert(
      { tenant_id: tenantId, role, section_key: sectionKey, is_allowed: !current, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,role,section_key" }
    );
    if (error) { toast.error("Failed"); return; }
    setSectionAccess(prev => {
      const idx = prev.findIndex((s: any) => s.tenant_id === tenantId && s.role === role && s.section_key === sectionKey);
      if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], is_allowed: !current }; return u; }
      return [...prev, { tenant_id: tenantId, role, section_key: sectionKey, is_allowed: !current }];
    });
    toast.success("Section access updated");
  };

  // Teams
  const saveTeam = async () => {
    if (!teamName.trim() || !teamTenantId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (editingTeamId) {
      await supabase.from("teams").update({ name: teamName, description: teamDesc || null, team_leader_id: teamLeader || null, color: teamColor }).eq("id", editingTeamId);
      toast.success("Team updated");
    } else {
      await supabase.from("teams").insert({ tenant_id: teamTenantId, name: teamName, description: teamDesc || null, team_leader_id: teamLeader || null, color: teamColor, created_by: user!.id });
      toast.success("Team created");
    }
    setShowTeamForm(false); setTeamName(""); setTeamDesc(""); setTeamLeader(""); setEditingTeamId(null);
    fetchData(); setSaving(false);
  };

  const deleteTeam = async (teamId: string) => {
    await supabase.from("teams").delete().eq("id", teamId);
    toast.success("Team deleted"); fetchData();
  };

  const addTeamMember = async (teamId: string, userId: string, tenantId: string) => {
    const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId, tenant_id: tenantId });
    if (error) toast.error(error.message.includes("duplicate") ? "Already a member" : error.message);
    else { toast.success("Member added"); fetchData(); }
  };

  const removeTeamMember = async (memberId: string) => {
    await supabase.from("team_members").delete().eq("id", memberId);
    toast.success("Member removed"); fetchData();
  };

  // Tasks
  const saveTask = async () => {
    if (!taskTitle.trim() || !taskTenantId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("staff_tasks").insert({
      tenant_id: taskTenantId, title: taskTitle, description: taskDesc || null,
      assigned_to: taskAssignee || null, assigned_by: user!.id,
      priority: taskPriority, due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
    });
    toast.success("Task created");
    setShowTaskForm(false); setTaskTitle(""); setTaskDesc(""); setTaskAssignee(""); setTaskDueDate(""); setTaskTenantId("");
    fetchData(); setSaving(false);
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("staff_tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", taskId);
    toast.success("Task updated"); fetchData();
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("staff_tasks").delete().eq("id", taskId);
    toast.success("Task deleted"); fetchData();
  };

  // Create new platform user
  const createPlatformUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserRole) {
      toast.error("All fields are required");
      return;
    }
    if (newUserPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreatingUser(true);
    try {
      await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email: newUserEmail, password: newUserPassword, full_name: newUserName, role: newUserRole },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || "Failed to create user");
      } else {
        toast.success("User created successfully");
        setShowAddUser(false);
        setNewUserEmail(""); setNewUserName(""); setNewUserPassword(""); setNewUserRole("support_team");
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
    setCreatingUser(false);
  };

  /* ─── Stats ─── */
  const stats = [
    { label: "Total Users", value: staff.length, icon: Users },
    { label: "Companies", value: tenants.length, icon: Building2 },
    { label: "Active Roles", value: Object.keys(roleCounts).length, icon: Shield },
    { label: "Teams", value: teams.length, icon: UsersRound },
    { label: "Open Tasks", value: tasks.filter(t => t.status !== "completed").length, icon: ListTodo },
    { label: "Active Sessions", value: sessions.filter((s: any) => s.is_active).length, icon: MonitorSmartphone },
  ];

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "staff", label: "Staff Directory", icon: Users },
    { key: "sections", label: "Sections", icon: Building2 },
    { key: "abilities", label: "Abilities", icon: Shield },
    { key: "teams", label: "Teams", icon: UsersRound },
    { key: "tasks", label: "Tasks", icon: ListTodo },
    { key: "security", label: "Security & Logs", icon: Lock },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Global Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-tenant staff oversight, roles, teams, tasks, and security</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
            <s.icon className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap",
              activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ═══ STAFF DIRECTORY ═══ */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-9" />
            </div>
            <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">All Companies</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">All Roles</option>
              {AVAILABLE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">{filteredStaff.length} users</span>
            <Button size="sm" onClick={() => setShowAddUser(true)} className="h-9">
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Add New User
            </Button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <div className="border border-border rounded-xl bg-card p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" /> Create Platform User
                </h3>
                <button onClick={() => setShowAddUser(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Full Name</label>
                  <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="John Doe" className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Email *</label>
                  <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Password *</label>
                  <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Min 8 characters" className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Role *</label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {PLATFORM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={createPlatformUser} disabled={creatingUser}>
                  {creatingUser ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                  Create User
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Role chips */}
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_ROLES.filter(r => roleCounts[r.value]).map(r => (
              <button key={r.value} onClick={() => setRoleFilter(roleFilter === r.value ? "" : r.value)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  roleFilter === r.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30")}>
                <Shield className="h-3 w-3" />{r.label}<span className="ml-0.5 opacity-70">{roleCounts[r.value]}</span>
              </button>
            ))}
          </div>

          {/* Staff list */}
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-12"><Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">No users found</p></div>
            ) : filteredStaff.map(member => {
              const isSelected = selectedUser?.user_id === member.user_id;
              const acct = getAccountSetting(member.user_id);
              return (
                <div key={member.user_id}>
                  <div className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors", isSelected && "bg-primary/5")}
                    onClick={() => setSelectedUser(isSelected ? null : member)}>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> :
                        <span className="text-sm font-semibold text-primary">{member.full_name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                        {acct?.is_login_enabled === false && <Lock className="h-3 w-3 text-destructive shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        <Building2 className="h-3 w-3 inline mr-0.5" />{member.tenant_name} {member.department && `· ${member.department}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end max-w-[250px]">
                      {member.roles.slice(0, 3).map(role => {
                        const rc = AVAILABLE_ROLES.find(r => r.value === role);
                        return <span key={role} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", rc?.color || "bg-muted text-muted-foreground")}>{rc?.label || role.replace(/_/g, " ")}</span>;
                      })}
                      {member.roles.length > 3 && <span className="text-[10px] text-muted-foreground">+{member.roles.length - 3}</span>}
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isSelected && "rotate-90")} />
                  </div>

                  {isSelected && (
                    <div className="bg-muted/20 border-t border-border px-5 py-4 space-y-4 animate-fade-in">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[{ icon: Building2, label: "Company", value: member.tenant_name }, { icon: Mail, label: "Department", value: member.department },
                          { icon: Shield, label: "Roles", value: member.roles.length.toString() },
                          { icon: Clock, label: "Status", value: acct?.is_login_enabled === false ? "Login Disabled" : "Active" }
                        ].map(f => (
                          <div key={f.label} className="p-2.5 rounded-lg bg-card border border-border">
                            <div className="flex items-center gap-1.5 mb-0.5"><f.icon className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{f.label}</span></div>
                            <p className="text-xs font-medium text-foreground truncate">{f.value || "—"}</p>
                          </div>
                        ))}
                      </div>

                      {/* Account controls */}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant={acct?.is_login_enabled === false ? "default" : "outline"} className="h-7 text-[11px]"
                          onClick={() => toggleLoginAccess(member.user_id, acct?.is_login_enabled === false)}>
                          {acct?.is_login_enabled === false ? <><Unlock className="h-3 w-3 mr-1" /> Enable Login</> : <><Lock className="h-3 w-3 mr-1" /> Disable Login</>}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => forcePasswordChange(member.user_id)}>
                          <KeyRound className="h-3 w-3 mr-1" /> Force PW Change
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-border bg-card">
                          <span className="text-[10px] text-muted-foreground">2FA</span>
                          <Switch checked={acct?.two_factor_enabled || false} onCheckedChange={(v) => toggle2FA(member.user_id, v)} className="scale-75" />
                        </div>
                      </div>

                      {/* Roles */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Roles</h4>
                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setShowRolePanel(!showRolePanel)}>
                            <UserPlus className="h-3 w-3 mr-1" /> Assign
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {member.roles.map(role => {
                            const rc = AVAILABLE_ROLES.find(r => r.value === role);
                            return (
                              <div key={role} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", rc?.color || "bg-muted text-muted-foreground")}>
                                <Shield className="h-3 w-3" />{rc?.label || role.replace(/_/g, " ")}
                                {role !== "super_admin" && <button onClick={() => member.role_ids[role] && removeRole(member.role_ids[role])} className="ml-1 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>}
                              </div>
                            );
                          })}
                        </div>
                        {showRolePanel && (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {AVAILABLE_ROLES.filter(r => !member.roles.includes(r.value)).map(r => (
                              <button key={r.value} onClick={() => assignRole(member.user_id, r.value)} disabled={saving}
                                className="p-2.5 rounded-lg border border-border bg-card text-left hover:border-primary/30 transition-all">
                                <p className="text-xs font-medium text-foreground">{r.label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SECTIONS ═══ */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Manage section access per role per company</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select company...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {AVAILABLE_ROLES.filter(r => !["customer", "super_admin"].includes(r.value)).slice(0, 4).map(r => (
                <button key={r.value} onClick={() => setSelectedRole(selectedRole === r.value ? null : r.value)}
                  className={cn("px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all text-center",
                    selectedRole === r.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {selectedTenant && selectedRole ? (
            <div className="border border-border rounded-xl bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
              {SECTIONS.map(section => {
                const allowed = isSectionAllowed(selectedTenant, selectedRole, section.key);
                return (
                  <div key={section.key} className={cn("flex items-center justify-between p-4 rounded-xl border transition-all",
                    allowed ? "border-primary/20 bg-primary/5" : "border-border bg-card")}>
                    <div>
                      <p className="text-sm font-medium text-foreground">{section.label}</p>
                      <p className="text-[10px] text-muted-foreground">{section.desc}</p>
                    </div>
                    <Switch checked={allowed} onCheckedChange={() => toggleSection(selectedTenant, selectedRole, section.key)} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a company and role to manage section access</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ ABILITIES ═══ */}
      {activeTab === "abilities" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select company...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={selectedRole || ""} onChange={e => setSelectedRole(e.target.value || null)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select role...</option>
              {AVAILABLE_ROLES.filter(r => !["customer", "super_admin"].includes(r.value)).map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {selectedTenant && selectedRole ? (
            <div className="space-y-4 animate-fade-in">
              {/* Module toggles */}
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">
                    Module Access: <span className="text-primary capitalize">{selectedRole.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground"> @ {getTenantName(selectedTenant)}</span>
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ABILITY_MODULES.map(mod => {
                    const allowed = isPermAllowed(selectedTenant, selectedRole, mod.key);
                    return (
                      <div key={mod.key} className={cn("flex items-center justify-between p-3.5 rounded-xl border transition-all",
                        allowed ? "border-primary/20 bg-primary/5" : "border-border bg-card")}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", allowed ? "bg-primary/10" : "bg-muted")}>
                            <mod.icon className={cn("h-4 w-4", allowed ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <p className="text-xs font-medium text-foreground">{mod.label}</p>
                        </div>
                        <Switch checked={allowed} onCheckedChange={() => togglePermission(selectedTenant, selectedRole, mod.key)} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action permissions table */}
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">Action Permissions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="text-left px-4 py-2.5 font-semibold text-foreground">Module</th>
                        {ACTION_PERMISSIONS.map(a => {
                          const Icon = ACTION_ICONS[a];
                          return <th key={a} className="text-center px-2 py-2.5"><div className="flex flex-col items-center gap-0.5"><Icon className="h-3.5 w-3.5 text-foreground" /><span className="text-[9px] capitalize text-muted-foreground">{a}</span></div></th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {ABILITY_MODULES.filter(m => isPermAllowed(selectedTenant, selectedRole, m.key)).map(mod => (
                        <tr key={mod.key} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            <div className="flex items-center gap-2"><mod.icon className="h-3.5 w-3.5 text-primary" />{mod.label}</div>
                          </td>
                          {ACTION_PERMISSIONS.map(action => {
                            const key = `${mod.key}_${action}`;
                            const allowed = isPermAllowed(selectedTenant, selectedRole, key);
                            return (
                              <td key={action} className="text-center px-2 py-2.5">
                                <button onClick={() => togglePermission(selectedTenant, selectedRole, key)}
                                  className={cn("h-7 w-7 rounded-lg flex items-center justify-center mx-auto transition-all",
                                    allowed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                                  {allowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a company and role to manage abilities</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TEAMS ═══ */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">All teams across companies</p>
              <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                <option value="">All Companies</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={() => { setShowTeamForm(true); setEditingTeamId(null); setTeamName(""); setTeamDesc(""); setTeamLeader(""); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Team
            </Button>
          </div>

          {showTeamForm && (
            <div className="border border-primary/20 rounded-xl bg-primary/[0.02] p-5 space-y-3 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground">{editingTeamId ? "Edit Team" : "New Team"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={teamTenantId} onChange={e => setTeamTenantId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select company...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name" className="h-9" />
                <Input value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" className="h-9" />
                <select value={teamLeader} onChange={e => setTeamLeader(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Team Leader...</option>
                  {staff.filter(s => !teamTenantId || s.tenant_id === teamTenantId).map(s => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveTeam} disabled={!teamName.trim() || !teamTenantId || saving}>{editingTeamId ? "Update" : "Create"}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowTeamForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.filter(t => !tenantFilter || t.tenant_id === tenantFilter).map(team => {
              const leader = staff.find(s => s.user_id === team.team_leader_id);
              return (
                <div key={team.id} className="border border-border rounded-xl bg-card overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between" style={{ borderLeftColor: team.color, borderLeftWidth: 4 }}>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{team.name}</h4>
                      <p className="text-[10px] text-muted-foreground">{team.tenant_name}</p>
                      {leader && <p className="text-[10px] text-primary mt-0.5">👑 {leader.full_name}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">{team.members.length}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditingTeamId(team.id); setTeamName(team.name); setTeamDesc(team.description || "");
                        setTeamLeader(team.team_leader_id || ""); setTeamTenantId(team.tenant_id); setShowTeamForm(true);
                      }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTeam(team.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {team.members.map(m => {
                      const s = staff.find(st => st.user_id === m.user_id);
                      return (
                        <div key={m.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">{(s?.full_name || "U").charAt(0)}</div>
                            <span className="text-xs text-foreground">{s?.full_name || "Unknown"}</span>
                          </div>
                          <button onClick={() => removeTeamMember(m.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      );
                    })}
                    <select onChange={e => { if (e.target.value) { addTeamMember(team.id, e.target.value, team.tenant_id); e.target.value = ""; } }}
                      className="w-full h-8 rounded-md border border-dashed border-border bg-background px-2 text-xs text-muted-foreground">
                      <option value="">+ Add member...</option>
                      {staff.filter(s => s.tenant_id === team.tenant_id && !team.members.some(m => m.user_id === s.user_id)).map(s => (
                        <option key={s.user_id} value={s.user_id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {teams.filter(t => !tenantFilter || t.tenant_id === tenantFilter).length === 0 && !showTeamForm && (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <UsersRound className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No teams found</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TASKS ═══ */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {["all", "pending", "in_progress", "completed"].map(f => (
                <button key={f} onClick={() => setTaskFilter(f)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    taskFilter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                  {f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowTaskForm(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Assign Task</Button>
          </div>

          {showTaskForm && (
            <div className="border border-primary/20 rounded-xl bg-primary/[0.02] p-5 space-y-3 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground">New Task</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={taskTenantId} onChange={e => setTaskTenantId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select company...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" className="h-9" />
                <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Assign to...</option>
                  {staff.filter(s => !taskTenantId || s.tenant_id === taskTenantId).map(s => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
                </select>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <Input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="h-9" />
                <Input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Description" className="h-9" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveTask} disabled={!taskTitle.trim() || !taskTenantId || saving}>Create</Button>
                <Button size="sm" variant="outline" onClick={() => setShowTaskForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {tasks.filter(t => taskFilter === "all" || t.status === taskFilter).map(task => {
              const priorityColor: Record<string, string> = { low: "text-muted-foreground bg-muted", medium: "text-blue-600 bg-blue-50 dark:bg-blue-900/20", high: "text-amber-600 bg-amber-50 dark:bg-amber-900/20", urgent: "text-destructive bg-destructive/10" };
              const statusColor: Record<string, string> = { pending: "bg-muted text-muted-foreground", in_progress: "bg-primary/10 text-primary", completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" };
              return (
                <div key={task.id} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                  <button onClick={() => updateTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}
                    className={cn("h-5 w-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
                      task.status === "completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-primary")}>
                    {task.status === "completed" && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", priorityColor[task.priority])}>{task.priority}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", statusColor[task.status])}>{task.status.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-muted-foreground"><Building2 className="h-3 w-3 inline mr-0.5" />{getTenantName(task.tenant_id)}</span>
                      {task.assigned_to && <span className="text-[10px] text-muted-foreground">→ {getStaffName(task.assigned_to)}</span>}
                      {task.due_date && <span className="text-[10px] text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {task.status === "pending" && <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => updateTaskStatus(task.id, "in_progress")}>Start</Button>}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTask(task.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              );
            })}
            {tasks.filter(t => taskFilter === "all" || t.status === taskFilter).length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <ListTodo className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No tasks found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SECURITY & LOGS ═══ */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Sessions */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
                <p className="text-[10px] text-muted-foreground">Global login session monitoring</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">{sessions.length}</Badge>
            </div>
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="text-center py-8"><MonitorSmartphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" /><p className="text-xs text-muted-foreground">No sessions</p></div>
              ) : sessions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn("h-2 w-2 rounded-full shrink-0", s.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
                  <MonitorSmartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.device_info || "Unknown"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.ip_address && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />{s.ip_address}</span>}
                      <span className="text-[10px] text-muted-foreground">{new Date(s.last_active).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                    s.is_active ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" : "bg-muted text-muted-foreground")}>
                    {s.is_active ? "Active" : "Expired"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Account Security Overview */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Account Security Overview</h3>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {staff.slice(0, 50).map(s => {
                const acct = getAccountSetting(s.user_id);
                return (
                  <div key={s.user_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{s.full_name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{s.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.tenant_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {acct?.force_password_change && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300"><AlertTriangle className="h-3 w-3 mr-0.5" />PW</Badge>}
                      {acct?.two_factor_enabled && <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300"><Lock className="h-3 w-3 mr-0.5" />2FA</Badge>}
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                        acct?.is_login_enabled === false ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20")}>
                        {acct?.is_login_enabled === false ? "Disabled" : "Active"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit logs */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Global Activity Log</h3>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8"><Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" /><p className="text-xs text-muted-foreground">No activity</p></div>
              ) : auditLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    log.action === "INSERT" ? "bg-emerald-50 dark:bg-emerald-900/20" : log.action === "DELETE" ? "bg-destructive/10" : "bg-primary/10")}>
                    <Activity className={cn("h-4 w-4", log.action === "INSERT" ? "text-emerald-500" : log.action === "DELETE" ? "text-destructive" : "text-primary")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground"><span className="capitalize">{log.action?.toLowerCase()}</span> on <span className="text-primary">{log.resource_type}</span></p>
                    <p className="text-[10px] text-muted-foreground">{log.module} · {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full",
                    log.action === "INSERT" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" :
                    log.action === "DELETE" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{log.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
