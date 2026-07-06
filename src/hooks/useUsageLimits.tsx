// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CounterKey = "invoices" | "deals" | "documents" | "projects" | "employees" | "users" | "companies";

interface UsageInfo {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  billing_cycle: string;
  cycle_end: string | null;
}

interface UsageCounters {
  [key: string]: {
    current_count: number;
    billing_cycle: string;
    cycle_end: string | null;
    cycle_start: string;
  };
}

export function useUsageLimits() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [counters, setCounters] = useState<UsageCounters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }

    const fetchCounters = async () => {
      const { data } = await supabase
        .from("tenant_usage_counters")
        .select("counter_key, current_count, billing_cycle, cycle_end, cycle_start")
        .eq("tenant_id", tenantId);

      if (data) {
        const map: UsageCounters = {};
        data.forEach((row: any) => {
          map[row.counter_key] = {
            current_count: row.current_count,
            billing_cycle: row.billing_cycle,
            cycle_end: row.cycle_end,
            cycle_start: row.cycle_start,
          };
        });
        setCounters(map);
      }
      setLoading(false);
    };

    fetchCounters();
  }, [tenantId]);

  const checkLimit = useCallback(async (counterKey: CounterKey): Promise<UsageInfo | null> => {
    if (!tenantId) return null;
    const { data, error } = await supabase.rpc("check_usage_limit", {
      _tenant_id: tenantId,
      _counter_key: counterKey,
    });
    if (error) { console.error("Check limit error:", error); return null; }
    return data as unknown as UsageInfo;
  }, [tenantId]);

  const incrementUsage = useCallback(async (counterKey: CounterKey): Promise<{ allowed: boolean; message?: string }> => {
    if (!tenantId) return { allowed: false, message: "No tenant" };
    const { data, error } = await supabase.rpc("increment_usage_counter", {
      _tenant_id: tenantId,
      _counter_key: counterKey,
    });
    if (error) { console.error("Increment error:", error); return { allowed: false, message: error.message }; }
    const result = data as any;
    if (!result.allowed) {
      toast.error(result.message || `You've reached your ${counterKey} limit. Please upgrade your plan.`);
    }
    // Refresh counters
    setCounters((prev) => ({
      ...prev,
      [counterKey]: {
        ...prev[counterKey],
        current_count: result.current,
      },
    }));
    return { allowed: result.allowed, message: result.message };
  }, [tenantId]);

  const getUsage = useCallback((counterKey: CounterKey) => {
    return counters[counterKey] || null;
  }, [counters]);

  return { loading, counters, checkLimit, incrementUsage, getUsage };
}
