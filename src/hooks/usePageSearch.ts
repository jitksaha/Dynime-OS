import { useSyncExternalStore, useMemo } from "react";
import {
  getPageIndex,
  subscribeIndex,
  type PageIndexItem,
} from "@/lib/search-index";
import { fuzzyMatch } from "@/lib/fuzzy-match";

export interface ScoredPage extends PageIndexItem {
  score: number;
  matchIndices: number[];
}

/**
 * Live, auto-discovered page index. Re-renders whenever a new sidebar
 * item or route registers itself. Performs fuzzy matching client-side
 * for instant (<5ms) results across hundreds of items.
 */
export function usePageSearch(query: string, limit = 8): ScoredPage[] {
  const items = useSyncExternalStore(subscribeIndex, getPageIndex, getPageIndex);

  return useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const scored: ScoredPage[] = [];
    for (const item of items) {
      // Match against label, group, path keywords
      const labelMatch = fuzzyMatch(item.label, q);
      const groupMatch = fuzzyMatch(item.group, q);
      const keywordMatch = item.keywords
        .map((k) => fuzzyMatch(k, q))
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.score - a.score)[0];

      const best = [labelMatch, groupMatch, keywordMatch]
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.score - a.score)[0];

      if (!best) continue;

      // Sidebar items get a small boost over auto-route entries
      const sourceBoost = item.source === "sidebar" ? 0.1 : 0;
      scored.push({
        ...item,
        score: best.score + sourceBoost,
        matchIndices: labelMatch?.indices ?? best.indices,
      });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [items, query, limit]);
}
