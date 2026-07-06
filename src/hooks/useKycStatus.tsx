// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export type KycStatus = "none" | "pending" | "under_review" | "approved" | "rejected";

interface KycData {
  id: string;
  status: KycStatus;
  full_name: string;
  document_type: string;
  document_number: string;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export function useKycStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<KycStatus>("none");
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus("none");
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("kyc_verifications")
      .select("id, status, full_name, document_type, document_number, rejection_reason, submitted_at, reviewed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setStatus((data as any).status as KycStatus);
      setKycData(data as any);
    } else {
      setStatus("none");
      setKycData(null);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, kycData, loading, refresh, isVerified: status === "approved" };
}
