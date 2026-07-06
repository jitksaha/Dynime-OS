import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Command, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { usePageSearch, type ScoredPage } from "@/hooks/usePageSearch";
import { getSearchIcon } from "@/lib/search-icons";
import { highlightSegments } from "@/lib/fuzzy-match";
import type { GlobalSearchResult } from "@/hooks/useGlobalSearch";

type UnifiedItem =
  | { kind: "page"; data: ScoredPage }
  | { kind: "record"; data: GlobalSearchResult };

/**
 * Self-updating global search.
 *
 * - Pages/features come from a runtime auto-discovered index
 *   (sidebar nav + every <Route> declared in App.tsx).
 * - Records come from the auto-indexed `global_search` Postgres function
 *   (tables driven by the `searchable_tables` registry — extensible by row).
 *
 * No manual list to maintain. New sidebar items, new routes, and new tables
 * registered in `searchable_tables` become searchable automatically.
 */
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { tenantId } = useTenant();

  const pageHits = usePageSearch(query, 10);
  const { results: recordHits, loading } = useGlobalSearch(query, tenantId);

  // Build a single flat list for keyboard navigation
  const unified: UnifiedItem[] = useMemo(
    () => [
      ...pageHits.map((p) => ({ kind: "page" as const, data: p })),
      ...recordHits.map((r) => ({ kind: "record" as const, data: r })),
    ],
    [pageHits, recordHits]
  );

  // Group for display
  const grouped = useMemo(() => {
    const groups = new Map<string, UnifiedItem[]>();
    for (const item of unified) {
      const key =
        item.kind === "page" ? item.data.group : item.data.display_name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return groups;
  }, [unified]);

  useEffect(() => setSelectedIdx(0), [query]);

  // Open / close shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      } else if (e.key === "/") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target as HTMLElement)?.isContentEditable) {
          e.preventDefault();
          setOpen(true);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);

    const customHandler = () => setOpen(true);
    document.addEventListener("open-global-search", customHandler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("open-global-search", customHandler);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQuery("");
  }, [open]);

  const handleSelect = useCallback(
    (item: UnifiedItem) => {
      const path =
        item.kind === "page" ? item.data.path : item.data.route_pattern;
      if (path) navigate(path);
      setOpen(false);
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((p) => Math.min(p + 1, unified.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && unified[selectedIdx]) {
      handleSelect(unified[selectedIdx]);
    }
  };

  // Auto-scroll selection into view
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selectedIdx}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  let cursor = 0;

  return (
    <>
      {/* Desktop trigger */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-muted-foreground text-sm min-w-[260px] max-w-md w-full"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left text-xs">
          Search anything…
        </span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* Mobile trigger handled by AppLayout */}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[12vh] px-3 sm:px-4 bg-background/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 shrink-0 text-primary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, features, records…"
                className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground shrink-0"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="sm:hidden p-1 rounded hover:bg-muted/50 text-muted-foreground shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border shrink-0">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
              {!query.trim() ? (
                <EmptyState />
              ) : unified.length === 0 && !loading ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Try fewer letters or a different keyword.
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {Array.from(grouped.entries()).map(([group, items]) => (
                    <div key={group}>
                      <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {group}
                        </p>
                        <span className="text-[10px] text-muted-foreground/40">
                          · {items.length}
                        </span>
                      </div>
                      {items.map((item) => {
                        const idx = cursor++;
                        return (
                          <ResultRow
                            key={
                              item.kind === "page"
                                ? `p-${item.data.id}`
                                : `r-${item.data.source_table}-${item.data.record_id}`
                            }
                            item={item}
                            idx={idx}
                            selected={selectedIdx === idx}
                            onSelect={() => handleSelect(item)}
                            onHover={() => setSelectedIdx(idx)}
                            query={query}
                          />
                        );
                      })}
                    </div>
                  ))}

                  {loading && recordHits.length === 0 && (
                    <div className="py-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Searching records…
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {unified.length > 0 && (
              <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {unified.length} result{unified.length !== 1 ? "s" : ""}
                  {loading ? " · loading more…" : ""}
                </span>
                <div className="flex items-center gap-3">
                  <span>↑↓ Navigate</span>
                  <span>↵ Open</span>
                  <span>esc Close</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-10 text-center px-6">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">Search anything in Dynime</p>
      <p className="text-xs text-muted-foreground mt-1">
        Pages, features, invoices, employees, deals, settings…
      </p>
      <p className="text-[10px] text-muted-foreground/60 mt-3">
        Tip: press <kbd className="px-1 rounded bg-muted">/</kbd> anywhere to
        focus search.
      </p>
    </div>
  );
}

interface RowProps {
  item: UnifiedItem;
  idx: number;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
  query: string;
}

function ResultRow({ item, idx, selected, onSelect, onHover, query }: RowProps) {
  const isPage = item.kind === "page";
  const Icon = isPage ? item.data.icon : getSearchIcon(item.data.icon_name);
  const label = isPage ? item.data.label : item.data.title;
  const subtitle = isPage ? item.data.path : item.data.subtitle;
  const badge = isPage ? null : item.data.display_name;

  // Highlight segments — for page items use the precomputed indices.
  // For records, do a quick substring highlight on the title.
  const segments = isPage
    ? highlightSegments(label, item.data.matchIndices)
    : computeSubstringHighlight(label, query);

  return (
    <button
      data-idx={idx}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        selected ? "bg-primary/10" : "hover:bg-muted/40"
      )}
    >
      <div
        className={cn(
          "p-1.5 rounded-lg shrink-0 transition-colors",
          selected ? "bg-primary/15" : "bg-muted/50"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "block text-sm font-medium truncate",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {segments.map((s, i) =>
            s.match ? (
              <mark
                key={i}
                className="bg-primary/20 text-primary rounded px-0.5"
              >
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            )
          )}
        </span>
        {subtitle && (
          <span className="block text-[11px] text-muted-foreground truncate">
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold tracking-wider shrink-0">
          {badge}
        </span>
      )}
      {selected && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />}
    </button>
  );
}

function computeSubstringHighlight(text: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [{ text, match: false }];
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, idx), match: false },
    { text: text.slice(idx, idx + q.length), match: true },
    { text: text.slice(idx + q.length), match: false },
  ].filter((s) => s.text.length > 0);
}
