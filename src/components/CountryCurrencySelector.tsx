import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useCountry, CountryInfo } from "@/hooks/useCountry";
import { cn } from "@/lib/utils";

export function CountryCurrencySelector({ compact = false }: { compact?: boolean }) {
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
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-secondary transition-colors",
          compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
        )}
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="font-medium text-foreground">{selectedCountry.currency}</span>
        <span className="text-muted-foreground">{selectedCountry.symbol}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-64 max-h-80 rounded-xl border border-border bg-card shadow-xl z-50 flex flex-col animate-fade-in">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((country) => (
              <button
                key={country.code}
                onClick={() => {
                  setSelectedCountry(country);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-primary/5 transition-colors",
                  selectedCountry.code === country.code && "bg-primary/10"
                )}
              >
                <span className="text-lg leading-none">{country.flag}</span>
                <span className="flex-1 text-left truncate text-foreground">{country.name}</span>
                <span className="text-xs text-muted-foreground font-medium">{country.symbol} {country.currency} ({country.exchange_rate})</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
