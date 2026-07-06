// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionGateState {
  loading: boolean;
  isExpired: boolean;
  trialEndsAt: string | null;
  daysRemaining: number | null;
  hasActiveSubscription: boolean;
  hasPermanentModules: boolean;
  planName: string;
  isFreePlan: boolean;
}

const INITIAL: SubscriptionGateState = {
  loading: true,
  isExpired: false,
  trialEndsAt: null,
  daysRemaining: null,
  hasActiveSubscription: false,
  hasPermanentModules: false,
  planName: "free",
  isFreePlan: true,
};

export function useSubscriptionGate(): SubscriptionGateState {
  const { profile } = useAuth();
  const [state, setState] = useState<SubscriptionGateState>(INITIAL);
  const cachedTenantId = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
      return;
    }

    // Skip if already fetched for this tenant
    if (cachedTenantId.current === tenantId) {
      return;
    }

    // Safety timeout — never block UI longer than 6s
    timeoutRef.current = setTimeout(() => {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
    }, 6000);

    const check = async () => {
      try {
        const [tenantRes, subRes, addonRes] = await Promise.all([
          supabase
            .from("tenants")
            .select("plan, trial_ends_at, is_active")
            .eq("id", tenantId)
            .single(),
          supabase
            .from("tenant_subscriptions")
            .select("id, status, current_period_end")
            .eq("tenant_id", tenantId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle(),
          supabase
            .from("tenant_addon_modules")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("status", "active")
            .eq("payment_type", "onetime")
            .limit(1),
        ]);

        const tenant = tenantRes.data;
        if (!tenant) {
          setState((s) => ({ ...s, loading: false }));
          cachedTenantId.current = tenantId;
          return;
        }

        const trialEndsAt = tenant.trial_ends_at;
        const hasActiveSub = !!subRes.data;
        const hasPermanentModules = (addonRes.data?.length || 0) > 0;
        const isFreePlan = tenant.plan === "free";

        let isExpired = false;
        let daysRemaining: number | null = null;

        if (isFreePlan) {
          isExpired = false;
        } else if (trialEndsAt) {
          const trialEnd = new Date(trialEndsAt);
          const now = new Date();
          daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          if (daysRemaining <= 0 && !hasActiveSub) {
            isExpired = true;
          }
        }

        if (hasActiveSub) {
          isExpired = false;
        }

        cachedTenantId.current = tenantId;
        setState({
          loading: false,
          isExpired,
          trialEndsAt,
          daysRemaining,
          hasActiveSubscription: hasActiveSub,
          hasPermanentModules,
          planName: tenant.plan || "free",
          isFreePlan,
        });
      } catch (err) {
        console.error("Subscription gate error:", err);
        setState((s) => ({ ...s, loading: false }));
      }
    };

    check();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [profile?.tenant_id]);

  return state;
}
