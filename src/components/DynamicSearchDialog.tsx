import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Command, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalSearch, type GlobalSearchResult } from "@/hooks/useGlobalSearch";
import { getSearchIcon } from "@/lib/search-icons";

interface NavSearchItem {
  label: string;
  path: string;
  group?: string;
  icon: React.ElementType;
}

interface DynamicSearchDialogProps {
  navItems: NavSearchItem[];
  totalNavCount: number;
  tenantId?: string | null;
  placeholder?: string;
  accentClass?: string; // e.g. "destructive" or "primary"
  portalLabel?: string;
}

type UnifiedItem =
  | { kind: "nav"; item: NavSearchItem }
  | { kind: "db"; item: GlobalSearchResult };

export function DynamicSearchDialog({
  navItems,
  totalNavCount,
  tenantId,
  placeholder = "Search features, records, content...",
  accentClass = "primary",
  portalLabel = "features",
}: DynamicSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Nav results (instant, client-side)
  const navResults = query.trim().length > 0
    ? navItems.filter(item => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          (item.group || "").toLowerCase().includes(q) ||
          item.path.replace(/[/-]/g, " ").toLowerCase().includes(q)
        );
      })
    : [];

  // DB results (debounced, server-side)
  const { results: dbResults, loading } = useGlobalSearch(query, tenantId);

  // Unified flat list: nav items first, then DB results
  const unified: UnifiedItem[] = [
    ...navResults.map(item => ({ kind: "nav" as const, item })),
    ...dbResults.map(item => ({ kind: "db" as const, item })),
  ];

  // Group for display
  const navGrouped = navResults.reduce<Record<string, NavSearchItem[]>>((acc, item) => {
    const g = item.group || "Pages";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const dbGrouped = dbResults.reduce<Record<string, GlobalSearchResult[]>>((acc, item) => {
    if (!acc[item.display_name]) acc[item.display_name] = [];
    acc[item.display_name].push(item);
    return acc;
  }, {});

  useEffect(() => { setSelectedIdx(0); }, [query]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const handleSelect = useCallback((item: UnifiedItem) => {
    if (item.kind === "nav") {
      navigate(item.item.path);
    } else {
      const route = item.item.route_pattern;
      if (route) navigate(route);
    }
    setOpen(false);
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, unified.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && unified[selectedIdx]) {
      handleSelect(unified[selectedIdx]);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const accent = accentClass;
  const accentBg = `bg-${accent}/10`;
  const accentBgIcon = `bg-${accent}/15`;
  const accentText = `text-${accent}`;

  const renderItem = (item: UnifiedItem, globalIdx: number) => {
    const isSelected = selectedIdx === globalIdx;
    let Icon: React.ElementType;
    let label: string;
    let subtitle: string | null = null;

    if (item.kind === "nav") {
      Icon = item.item.icon;
      label = item.item.label;
    } else {
      Icon = getSearchIcon(item.item.icon_name);
      label = item.item.title;
      subtitle = item.item.subtitle || null;
    }

    return (
      <button
        key={item.kind === "nav" ? item.item.path : `${item.item.source_table}-${item.item.record_id}`}
        data-idx={globalIdx}
        onClick={() => handleSelect(item)}
        onMouseEnter={() => setSelectedIdx(globalIdx)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
          isSelected ? accentBg : "hover:bg-muted/30"
        )}
      >
        <div className={cn(
          "p-1.5 rounded-lg transition-colors",
          isSelected ? accentBgIcon : "bg-muted/50"
        )}>
          <Icon className={cn("h-4 w-4", isSelected ? accentText : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn(
            "block text-sm font-medium truncate",
            isSelected ? accentText : "text-foreground"
          )}>
            {label}
          </span>
          {subtitle && (
            <span className="block text-[11px] text-muted-foreground truncate">{subtitle}</span>
          )}
        </div>
        {item.kind === "db" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold tracking-wider shrink-0">
            {item.item.display_name}
          </span>
        )}
        {isSelected && <ArrowRight className={cn("h-3.5 w-3.5 shrink-0", accentText)} />}
      </button>
    );
  };

  let globalIdx = 0;

  return (
    <>
      {/* Desktop trigger */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-muted-foreground text-sm min-w-[200px]"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left text-xs">Search {portalLabel}...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className={cn("h-5 w-5 shrink-0", accentText)} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {query && (
                <button onClick={() => setQuery("")} className="p-1 rounded hover:bg-muted/50 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">ESC</kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto">
              {query.trim().length === 0 ? (
                <div className="py-10 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Search across pages, records & content</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Results update live from all your data</p>
                </div>
              ) : unified.length === 0 && !loading ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                </div>
              ) : (
                <div className="py-1">
                  {/* Nav results grouped */}
                  {Object.entries(navGrouped).map(([group, items]) => (
                    <div key={`nav-${group}`}>
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group}</p>
                      </div>
                      {items.map(item => {
                        const idx = globalIdx++;
                        return renderItem({ kind: "nav", item }, idx);
                      })}
                    </div>
                  ))}

                  {/* DB results grouped */}
                  {Object.entries(dbGrouped).map(([group, items]) => (
                    <div key={`db-${group}`}>
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">📄 {group}</p>
                      </div>
                      {items.map(item => {
                        const idx = globalIdx++;
                        return renderItem({ kind: "db", item }, idx);
                      })}
                    </div>
                  ))}

                  {loading && dbResults.length === 0 && navResults.length === 0 && (
                    <div className="py-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground mt-2">Searching all records...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {unified.length > 0 && (
              <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{unified.length} result{unified.length !== 1 ? "s" : ""}{loading ? " (loading more...)" : ""}</span>
                <div className="flex items-center gap-2">
                  <span>↑↓ Navigate</span>
                  <span>↵ Open</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
