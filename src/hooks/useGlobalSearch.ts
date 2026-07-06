import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/db";

export interface GlobalSearchResult {
  source_table: string;
  display_name: string;
  record_id: string;
  title: string;
  subtitle: string;
  icon_name: string;
  route_pattern: string | null;
  similarity?: number;
}

/**
 * Calls the auto-indexed `global_search` Postgres function.
 * Tables searched are driven by the `searchable_tables` registry in the DB,
 * so adding a new module's table is a one-row insert — no frontend change.
 */
export function useGlobalSearch(
  query: string,
  tenantId?: string | null,
  debounceMs = 200
) {
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ctrl = { cancelled: false };

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await (supabase.rpc as any)("global_search", {
          _query: trimmed,
          _tenant_id: tenantId ?? null,
          _limit: 5,
        });
        if (ctrl.cancelled) return;
        if (error) {
          console.warn("[global_search] rpc error:", error.message);
          setResults([]);
        } else {
          setResults(((data as GlobalSearchResult[]) ?? []).sort(
            (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)
          ));
        }
      } catch (err) {
        if (!ctrl.cancelled) setResults([]);
      } finally {
        if (!ctrl.cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      ctrl.cancelled = true;
      clearTimeout(timer);
    };
  }, [query, tenantId, debounceMs]);

  return { results, loading };
}
