// @ts-nocheck
import { useState, useEffect, createContext, useContext, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

interface ModuleAccessContextType {
  enabledModules: string[];
  loading: boolean;
  hasAccess: (module: string) => boolean;
  refetch: () => void;
}

const ModuleAccessContext = createContext<ModuleAccessContextType>({
  enabledModules: [],
  loading: true,
  hasAccess: () => false,
  refetch: () => {},
});

export function ModuleAccessProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const cachedTenantId = useRef<string | null>(null);
  const hasFetched = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModules = useCallback(async (force = false) => {
    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      setEnabledModules([]);
      setLoading(false);
      return;
    }

    // Skip if already fetched for this tenant (unless forced)
    if (!force && hasFetched.current && cachedTenantId.current === tenantId) {
      setLoading(false);
      return;
    }

    try {
      const [tenantRes, addonsRes, manualRes] = await Promise.all([
        supabase
          .from("tenant_subscriptions")
          .select("plan_id, subscription_plans(modules)")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("tenant_addon_modules")
          .select("module_name")
          .eq("tenant_id", tenantId)
          .eq("status", "active"),
        supabase
          .from("tenant_modules")
          .select("module_name")
          .eq("tenant_id", tenantId)
          .eq("is_enabled", true),
      ]);

      let planModules: string[] = [];
      if (tenantRes.data?.subscription_plans) {
        planModules = (tenantRes.data.subscription_plans as any).modules || [];
      } else {
        // Fallback: get plan slug from tenant
        const { data: tenant } = await supabase
          .from("tenants")
          .select("plan")
          .eq("id", tenantId)
          .single();
        if (tenant?.plan) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("modules")
            .eq("slug", tenant.plan)
            .single();
          planModules = plan?.modules || [];
        }
      }

      const addonModules = (addonsRes.data || []).map((a: any) => a.module_name);
      const manualNames = (manualRes.data || []).map((m: any) => m.module_name);

      const allModules = [...new Set([...planModules, ...addonModules, ...manualNames])];
      setEnabledModules(allModules);
      cachedTenantId.current = tenantId;
      hasFetched.current = true;
    } catch (err) {
      console.error("Error fetching module access:", err);
    }
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    // Safety timeout — never leave loading=true for more than 6s
    timeoutRef.current = setTimeout(() => {
      setLoading((prev) => (prev ? false : prev));
    }, 6000);

    fetchModules();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchModules]);

  const hasAccess = useCallback(
    (module: string) => {
      if (loading) return true; // Don't block UI while loading — optimistic
      return enabledModules.length === 0 ? true : enabledModules.includes(module);
    },
    [loading, enabledModules]
  );

  const refetch = useCallback(() => {
    hasFetched.current = false;
    cachedTenantId.current = null;
    fetchModules(true);
  }, [fetchModules]);

  return (
    <ModuleAccessContext.Provider value={{ enabledModules, loading, hasAccess, refetch }}>
      {children}
    </ModuleAccessContext.Provider>
  );
}

export const useModuleAccess = () => useContext(ModuleAccessContext);
