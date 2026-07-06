import { useState } from "react";
import { CheckSquare, Trash2, Download, Edit, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete?: () => void;
  onBulkExport?: () => void;
  onBulkEdit?: () => void;
  customActions?: { label: string; icon: React.ElementType; onClick: () => void; variant?: "default" | "destructive" }[];
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkExport,
  onBulkEdit,
  customActions,
}: BulkActionsToolbarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border border-border bg-card shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>
            {selectedCount < totalCount ? (
              <button onClick={onSelectAll} className="text-xs text-primary hover:underline ml-1">Select all</button>
            ) : (
              <button onClick={onDeselectAll} className="text-xs text-muted-foreground hover:underline ml-1">Deselect all</button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onBulkEdit && (
              <button
                onClick={onBulkEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-primary/10 transition-colors"
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {onBulkExport && (
              <button
                onClick={onBulkExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-primary/10 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            )}
            {customActions?.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  action.variant === "destructive"
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-secondary text-foreground hover:bg-primary/10"
                )}
              >
                <action.icon className="h-3.5 w-3.5" /> {action.label}
              </button>
            ))}
            {onBulkDelete && (
              <button
                onClick={onBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>

          <button
            onClick={onDeselectAll}
            className="ml-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage selection state
export function useBulkSelection<T extends { id: string }>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (items: T[]) => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const isSelected = (id: string) => selectedIds.has(id);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    selectedArray: Array.from(selectedIds),
  };
}
