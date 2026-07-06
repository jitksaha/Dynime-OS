import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export interface CompanyAccount {
  tenant_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
}

export function useCompanySwitcher() {
  const { user, profile } = useAuth();
  const [companies, setCompanies] = useState<CompanyAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const currentTenantId = profile?.tenant_id;

  useEffect(() => {
    if (!user) return;
    const fetchCompanies = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("tenant_id, role, tenants:tenant_id(id, name, slug, logo_url)")
        .eq("user_id", user.id);

      if (data) {
        const mapped: CompanyAccount[] = data
          .filter((r: any) => r.tenants)
          .map((r: any) => ({
            tenant_id: r.tenant_id,
            name: r.tenants.name,
            slug: r.tenants.slug,
            logo_url: r.tenants.logo_url,
            role: r.role,
          }));

        // Deduplicate by tenant_id (user may have multiple roles)
        const unique = Array.from(
          new Map(mapped.map((c) => [c.tenant_id, c])).values()
        );
        setCompanies(unique);
      }
      setLoading(false);
    };
    fetchCompanies();
  }, [user?.id]);

  const switchCompany = useCallback(
    async (tenantId: string) => {
      if (!user || tenantId === currentTenantId) return;
      setSwitching(true);
      await supabase
        .from("profiles")
        .update({ tenant_id: tenantId })
        .eq("user_id", user.id);
      // Reload to reset all tenant-scoped state
      window.location.reload();
    },
    [user?.id, currentTenantId]
  );

  return {
    companies,
    currentTenantId,
    loading,
    switching,
    switchCompany,
    hasMultipleCompanies: companies.length > 1,
  };
}
