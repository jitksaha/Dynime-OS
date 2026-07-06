import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export function useKybStatus() {
  const { profile } = useAuth();
  const [kybStatus, setKybStatus] = useState<string>("not_applied");
  const [kybVerifiedAt, setKybVerifiedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cachedTenantId = useRef<string | null>(null);

  useEffect(() => {
    const tenantId = profile?.tenant_id;
    if (!tenantId) { setLoading(false); return; }

    // Skip if already fetched
    if (cachedTenantId.current === tenantId) { setLoading(false); return; }

    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase
      .from("tenants")
      .select("kyb_status, kyb_verified_at" as any)
      .eq("id", tenantId)
      .single()
      .then(({ data }) => {
        if (data) {
          setKybStatus((data as any).kyb_status || "not_applied");
          setKybVerifiedAt((data as any).kyb_verified_at || null);
        }
        cachedTenantId.current = tenantId;
        setLoading(false);
        clearTimeout(timeout);
      });

    return () => clearTimeout(timeout);
  }, [profile?.tenant_id]);

  return {
    kybStatus,
    isVerified: kybStatus === "approved",
    kybVerifiedAt,
    loading,
  };
}
