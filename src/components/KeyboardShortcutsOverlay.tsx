import { X, Keyboard } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AnimatePresence, motion } from "framer-motion";

export function KeyboardShortcutsOverlay() {
  const { shortcuts, showCheatSheet, setShowCheatSheet } = useKeyboardShortcuts();

  const groups = shortcuts.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <AnimatePresence>
      {showCheatSheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCheatSheet(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
              </div>
              <button onClick={() => setShowCheatSheet(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-6 max-h-[60vh]">
              {Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group}</h3>
                  <div className="space-y-2">
                    {items.map((s) => (
                      <div key={s.label} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-foreground">{s.description}</span>
                        <div className="flex items-center gap-1">
                          {s.keys.map((k, i) => (
                            <span key={i}>
                              <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-medium text-muted-foreground bg-muted border border-border rounded">
                                {k === "Ctrl" ? "⌘" : k}
                              </kbd>
                              {i < s.keys.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">Press <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">/</kbd> to toggle</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
