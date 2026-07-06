import { useState, useEffect } from "react";
import { UserCircle, Search, Building2, Trash2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface ProfileWithTenant {
  id: string;
  user_id: string;
  full_name: string | null;
  department: string | null;
  job_title: string | null;
  tenant_id: string | null;
  tenant_name: string;
  role: string;
}

export default function GlobalUserManagement() {
  const [users, setUsers] = useState<ProfileWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProfileWithTenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    const [profilesRes, tenantsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, department, job_title, tenant_id"),
      supabase.from("tenants").select("id, name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const tenantMap: Record<string, string> = {};
    (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t.name; });
    const roleMap: Record<string, string> = {};
    (rolesRes.data || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    const enriched = (profilesRes.data || []).map((p: any) => ({
      ...p,
      tenant_name: p.tenant_id ? tenantMap[p.tenant_id] || "Unknown" : "No tenant",
      role: roleMap[p.user_id] || "employee",
    }));
    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete", {
      body: { type: "user", id: deleteTarget.user_id },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to delete user");
    } else {
      toast.success(`User "${deleteTarget.full_name || "Unnamed"}" deleted`);
      fetchUsers();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const filtered = users
    .filter((u) => u.role !== "super_admin")
    .filter((u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
    );

  const roleBadge: Record<string, string> = {
    super_admin: "bg-destructive/10 text-destructive",
    company_admin: "bg-primary/10 text-primary",
    hr_manager: "bg-success/10 text-success",
    sales_manager: "bg-warning/10 text-warning",
    marketing_manager: "bg-info/10 text-info",
    finance_manager: "bg-chart-4/10 text-chart-4",
    support_agent: "bg-secondary text-muted-foreground",
    employee: "bg-secondary text-muted-foreground",
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Global User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} users across all tenants (excluding super admins)</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.full_name || "Unnamed"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground truncate">{u.tenant_name} · {u.job_title || "No title"}</p>
              </div>
            </div>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] || roleBadge.employee}`}>
              {u.role.replace(/_/g, " ")}
            </span>
            {u.role !== "super_admin" && (
              <button
                onClick={() => setDeleteTarget(u)}
                className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete user"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No users found</p>}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.full_name || "this user"}</strong>?
              This will remove their account, profile, roles, and sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Deleting...</> : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
