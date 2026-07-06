// @ts-nocheck
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

interface FreePlanLimits {
  [key: string]: number;
}

interface FreePlanContextType {
  limits: FreePlanLimits;
  loading: boolean;
  isFreePlan: boolean;
  checkLimit: (key: string, currentCount: number) => boolean;
  getLimitValue: (key: string) => number;
  getRemainingQuota: (key: string, currentCount: number) => number;
}

const FreePlanContext = createContext<FreePlanContextType>({
  limits: {},
  loading: true,
  isFreePlan: false,
  checkLimit: () => true,
  getLimitValue: () => 0,
  getRemainingQuota: () => 0,
});

export function FreePlanProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [limits, setLimits] = useState<FreePlanLimits>({});
  const [loading, setLoading] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(false);

  useEffect(() => {
    const fetchLimits = async () => {
      // Fetch limits (available to all)
      const { data: limitsData } = await supabase
        .from("free_plan_limits")
        .select("limit_key, limit_value");

      if (limitsData) {
        const map: FreePlanLimits = {};
        limitsData.forEach((l: any) => { map[l.limit_key] = l.limit_value; });
        setLimits(map);
      }

      // Check if current tenant is on free plan
      if (profile?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("plan")
          .eq("id", profile.tenant_id)
          .single();
        setIsFreePlan(tenant?.plan === "free");
      }

      setLoading(false);
    };

    fetchLimits();
  }, [profile?.tenant_id]);

  const checkLimit = (key: string, currentCount: number): boolean => {
    if (!isFreePlan) return true; // No limits for paid plans
    const limit = limits[key];
    if (limit === undefined || limit === 0) return false; // 0 = disabled
    return currentCount < limit;
  };

  const getLimitValue = (key: string): number => limits[key] ?? 0;

  const getRemainingQuota = (key: string, currentCount: number): number => {
    if (!isFreePlan) return Infinity;
    const limit = limits[key];
    if (!limit) return 0;
    return Math.max(0, limit - currentCount);
  };

  return (
    <FreePlanContext.Provider value={{ limits, loading, isFreePlan, checkLimit, getLimitValue, getRemainingQuota }}>
      {children}
    </FreePlanContext.Provider>
  );
}

export function useFreePlanLimits() {
  return useContext(FreePlanContext);
}
