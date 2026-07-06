import { useAuth } from "@/hooks/useAuth";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { supabase } from "@/integrations/supabase/db";
import { useCallback, useMemo } from "react";

/**
 * Returns the user's tenant_id, active branch_id, and helpers for
 * tenant- + branch-scoped CRUD.
 *
 * - `buildInsert(data)` auto-stamps `tenant_id`, `created_by`, and
 *   `branch_id` (when an active branch is selected). Callers can
 *   override `branch_id` by passing it explicitly.
 * - `applyBranchFilter(query)` adds `.eq("branch_id", activeBranchId)`
 *   when the user has a specific branch active; when "All Branches" is
 *   selected the query is returned unchanged.
 */
export function useTenant() {
  const { user, profile } = useAuth();
  const { activeBranchId, isAllBranches } = useActiveBranch();
  const tenantId = profile?.tenant_id;
  const userId = user?.id;

  const buildInsert = useCallback(
    <T extends Record<string, any>>(data: T) => {
      const base: Record<string, any> = {
        ...data,
        tenant_id: tenantId!,
        created_by: userId!,
      };
      // Only stamp branch_id when one is active AND the caller hasn't set it.
      if (activeBranchId && !("branch_id" in data)) {
        base.branch_id = activeBranchId;
      }
      return base as T & { tenant_id: string; created_by: string; branch_id?: string };
    },
    [tenantId, userId, activeBranchId]
  );

  const applyBranchFilter = useCallback(
    <Q extends { eq: (col: string, val: any) => Q }>(query: Q): Q => {
      if (!activeBranchId || isAllBranches) return query;
      return query.eq("branch_id", activeBranchId);
    },
    [activeBranchId, isAllBranches]
  );

  return useMemo(
    () => ({ tenantId, userId, buildInsert, applyBranchFilter, activeBranchId, isAllBranches, supabase }),
    [tenantId, userId, buildInsert, applyBranchFilter, activeBranchId, isAllBranches]
  );
}
