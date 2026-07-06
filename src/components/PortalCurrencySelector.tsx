import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Globe } from "lucide-react";
import { useCountry } from "@/hooks/useCountry";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function PortalCurrencySelector() {
  const { countries, selectedCountry, setSelectedCountry } = useCountry();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.currency.toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedCountry) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 hover:bg-secondary transition-all duration-200 px-2.5 py-1.5 text-xs group",
          open && "bg-secondary ring-2 ring-primary/20"
        )}
      >
        <span className="text-sm leading-none">{selectedCountry.flag}</span>
        <span className="font-semibold text-foreground">{selectedCountry.currency}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 w-72 max-h-[360px] rounded-xl border border-border bg-card shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Select Currency</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country or currency..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  autoFocus
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* List */}
            <div className="overflow-y-auto flex-1 py-1">
              {filtered.map((country) => {
                const isSelected = selectedCountry.code === country.code;
                return (
                  <button
                    key={country.code}
                    onClick={() => {
                      setSelectedCountry(country);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-all duration-150",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="text-base leading-none shrink-0">{country.flag}</span>
                    <span className="flex-1 text-left truncate font-medium">{country.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={cn("font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                        {country.symbol}
                      </span>
                      <span className="text-muted-foreground">{country.currency}</span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No currencies found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
