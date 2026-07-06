import { useState } from "react";
import { Building2, Check, ChevronDown, Globe } from "lucide-react";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { cn } from "@/lib/utils";

export function BranchSwitcher() {
  const { branches, activeBranchId, isAllBranches, hasGlobalAccess, loading, setActiveBranch } = useActiveBranch();
  const [open, setOpen] = useState(false);

  if (loading || branches.length === 0) return null;

  const current = branches.find(b => b.id === activeBranchId);
  const label = isAllBranches ? "All Branches" : current?.name || "Select branch";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground/80 hover:bg-primary/8 transition-colors border border-border/60"
        title="Switch branch"
      >
        {isAllBranches ? <Globe className="h-3.5 w-3.5 text-primary" /> : <Building2 className="h-3.5 w-3.5 text-primary" />}
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-[70] w-64 rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Active branch</div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {hasGlobalAccess && (
                <button
                  onClick={() => { setActiveBranch(null); setOpen(false); }}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent transition-colors", isAllBranches && "bg-accent/60")}
                >
                  <Globe className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">All Branches</p>
                    <p className="text-[10px] text-muted-foreground">Consolidated view</p>
                  </div>
                  {isAllBranches && <Check className="h-4 w-4 text-primary" />}
                </button>
              )}
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setActiveBranch(b.id); setOpen(false); }}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent transition-colors", b.id === activeBranchId && "bg-accent/60")}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{b.name}</p>
                    {b.is_default && <p className="text-[10px] text-muted-foreground">Default</p>}
                  </div>
                  {b.id === activeBranchId && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
