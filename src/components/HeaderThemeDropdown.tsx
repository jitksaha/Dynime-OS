import { useState, useRef, useEffect } from "react";
import { Palette, Check, Droplets } from "lucide-react";
import { useColorTheme, COLOR_THEMES } from "@/hooks/use-color-theme";
import { cn } from "@/lib/utils";

export function HeaderThemeDropdown() {
  const [open, setOpen] = useState(false);
  const { colorTheme, setColorTheme } = useColorTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md text-muted-foreground hover:bg-primary/8 transition-colors"
        title="Color Theme"
      >
        <Palette className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card shadow-lg py-1.5 z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-bold text-foreground">Color Theme</p>
            <p className="text-[11px] text-muted-foreground">Choose your preferred look</p>
          </div>
          <div className="py-1">
            {COLOR_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setColorTheme(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors",
                  colorTheme === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-primary/8"
                )}
              >
                {t.isGlass ? (
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400/60 via-purple-300/40 to-pink-300/50 border border-white/30 flex items-center justify-center">
                    <Droplets className="h-2.5 w-2.5 text-indigo-600" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border border-border" style={{ background: t.preview.primary }} />
                )}
                <div className="flex-1 text-left">
                  <span className="text-xs font-semibold">{t.name}</span>
                </div>
                {colorTheme === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
