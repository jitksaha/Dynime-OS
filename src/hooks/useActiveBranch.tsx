import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  is_default: boolean;
  is_active: boolean;
}

interface Ctx {
  branches: Branch[];
  activeBranchId: string | null; // null = "All Branches"
  isAllBranches: boolean;
  hasGlobalAccess: boolean;
  loading: boolean;
  setActiveBranch: (branchId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

const ActiveBranchContext = createContext<Ctx>({
  branches: [],
  activeBranchId: null,
  isAllBranches: true,
  hasGlobalAccess: false,
  loading: true,
  setActiveBranch: async () => {},
  refresh: async () => {},
});

export function ActiveBranchProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [hasGlobalAccess, setHasGlobalAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const tenantId = (profile as any)?.tenant_id ?? null;

  const refresh = useCallback(async () => {
    if (!user || !tenantId) {
      setBranches([]);
      setActiveBranchId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: ub }, { data: prof }] = await Promise.all([
        supabase.from("user_branches").select("branch_id, access_level").eq("user_id", user.id).eq("tenant_id", tenantId),
        supabase.from("profiles").select("active_branch_id").eq("user_id", user.id).maybeSingle(),
      ]);

      const isGlobal = (ub ?? []).some((r: any) => r.access_level === "global" || r.branch_id === null);
      setHasGlobalAccess(isGlobal);

      let query = supabase.from("branches").select("id, tenant_id, name, code, is_default, is_active").eq("tenant_id", tenantId).order("is_default", { ascending: false }).order("name");
      const { data: br } = await query;
      let list: Branch[] = (br ?? []) as Branch[];
      if (!isGlobal) {
        const allowed = new Set((ub ?? []).map((r: any) => r.branch_id).filter(Boolean));
        list = list.filter(b => allowed.has(b.id));
      }
      setBranches(list);
      setActiveBranchId(prof?.active_branch_id ?? null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, tenantId]);

  useEffect(() => { refresh(); }, [refresh]);

  const setActiveBranch = useCallback(async (branchId: string | null) => {
    if (!user) return;
    setActiveBranchId(branchId);
    await supabase.from("profiles").update({ active_branch_id: branchId }).eq("user_id", user.id);
  }, [user?.id]);

  return (
    <ActiveBranchContext.Provider value={{
      branches,
      activeBranchId,
      isAllBranches: activeBranchId === null,
      hasGlobalAccess,
      loading,
      setActiveBranch,
      refresh,
    }}>
      {children}
    </ActiveBranchContext.Provider>
  );
}

export function useActiveBranch() {
  return useContext(ActiveBranchContext);
}
