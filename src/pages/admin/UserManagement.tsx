import { useState, useEffect } from "react";
import { UserCircle, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  department: string | null;
  job_title: string | null;
  avatar_url: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const fetch = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, department, job_title, avatar_url").eq("tenant_id", profile.tenant_id!),
        supabase.from("user_roles").select("user_id, role").eq("tenant_id", profile.tenant_id!),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      setLoading(false);
    };
    fetch();
  }, [profile?.tenant_id]);

  const getUserRole = (userId: string) => roles.find((r) => r.user_id === userId)?.role || "employee";

  const roleBadge: Record<string, string> = {
    super_admin: "bg-destructive/10 text-destructive",
    company_admin: "bg-primary/10 text-primary",
    operations_manager: "bg-orange-50 text-orange-600 dark:bg-orange-900/20",
    hr_manager: "bg-success/10 text-success",
    sales_manager: "bg-warning/10 text-warning",
    marketing_manager: "bg-info/10 text-info",
    finance_manager: "bg-chart-4/10 text-chart-4",
    content_manager: "bg-pink-50 text-pink-600 dark:bg-pink-900/20",
    technical_support: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20",
    support_agent: "bg-accent/10 text-accent-foreground",
    employee: "bg-secondary text-muted-foreground",
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{profiles.length} team member{profiles.length !== 1 ? "s" : ""}</p>
      <div className="space-y-2">
        {profiles.map((p) => {
          const role = getUserRole(p.user_id);
          return (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.full_name || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground truncate">{p.job_title || "No title"} · {p.department || "No dept"}</p>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[role] || roleBadge.employee}`}>
                {role.replace(/_/g, " ")}
              </span>
            </div>
          );
        })}
        {profiles.length === 0 && (
          <p className="text-center py-8 text-sm text-muted-foreground">No users found in this tenant</p>
        )}
      </div>
    </div>
  );
}
