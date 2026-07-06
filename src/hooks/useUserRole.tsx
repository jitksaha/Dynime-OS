import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRole() {
  const { user, profile } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile?.tenant_id) {
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", profile.tenant_id!);

      if (data) {
        setRoles(data.map((r) => r.role));
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user?.id, profile?.tenant_id]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isSuperAdmin = roles.includes("super_admin");
  const isCompanyAdmin = roles.includes("admin") || roles.includes("company_admin") || roles.includes("super_admin");

  return { roles, loading, hasRole, isSuperAdmin, isCompanyAdmin };
}
