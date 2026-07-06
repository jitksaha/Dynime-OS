import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, Globe, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountryInfo } from "@/hooks/useCountry";

interface Props {
  countries: CountryInfo[];
  selectedCountry: CountryInfo | null;
  onSelectCountry: (c: CountryInfo) => void;
}

export function SearchableCountryCurrency({ countries, selectedCountry, onSelectCountry }: Props) {
  // Build unique currency list derived from countries
  const currencies = useMemo(() => {
    const map = new Map<string, { currency: string; symbol: string; sample: CountryInfo }>();
    countries.forEach((c) => {
      if (!map.has(c.currency)) map.set(c.currency, { currency: c.currency, symbol: c.symbol, sample: c });
    });
    return Array.from(map.values()).sort((a, b) => a.currency.localeCompare(b.currency));
  }, [countries]);

  const handleSelectCurrency = (currency: string) => {
    // Pick first country matching that currency, but keep current country if its currency already matches
    if (selectedCountry?.currency === currency) return;
    const match = countries.find((c) => c.currency === currency);
    if (match) onSelectCountry(match);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <PickerField
        label="Country"
        icon={<Globe className="h-4 w-4 text-primary" />}
        placeholder="Select country..."
        searchPlaceholder="Search countries..."
        triggerContent={
          selectedCountry ? (
            <>
              <span className="text-lg leading-none">{selectedCountry.flag}</span>
              <span className="truncate text-foreground">{selectedCountry.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{selectedCountry.code}</span>
            </>
          ) : null
        }
        items={countries}
        getKey={(c) => c.code}
        filterFn={(c, q) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.currency.toLowerCase().includes(q)
        }
        renderItem={(c) => (
          <>
            <span className="text-lg leading-none">{c.flag}</span>
            <span className="flex-1 text-left truncate text-foreground">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.code}</span>
          </>
        )}
        isSelected={(c) => selectedCountry?.code === c.code}
        onSelect={onSelectCountry}
      />

      <PickerField
        label="Currency"
        icon={<Coins className="h-4 w-4 text-primary" />}
        placeholder="Select currency..."
        searchPlaceholder="Search currencies..."
        triggerContent={
          selectedCountry ? (
            <>
              <span className="text-base font-semibold text-foreground w-5 text-center shrink-0">{selectedCountry.symbol}</span>
              <span className="truncate text-foreground">{selectedCountry.currency}</span>
              <span className="text-[11px] text-muted-foreground ml-auto shrink-0">1 USD ≈ {selectedCountry.exchange_rate}</span>
            </>
          ) : null
        }
        items={currencies}
        getKey={(c) => c.currency}
        filterFn={(c, q) =>
          c.currency.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
        }
        renderItem={(c) => (
          <>
            <span className="text-base w-6 text-center font-semibold text-foreground">{c.symbol}</span>
            <span className="flex-1 text-left truncate text-foreground">{c.currency}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{c.sample.name}</span>
          </>
        )}
        isSelected={(c) => selectedCountry?.currency === c.currency}
        onSelect={(c) => handleSelectCurrency(c.currency)}
      />
    </div>
  );
}

interface PickerFieldProps<T> {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  searchPlaceholder: string;
  triggerContent: React.ReactNode;
  items: T[];
  getKey: (item: T) => string;
  filterFn: (item: T, query: string) => boolean;
  renderItem: (item: T) => React.ReactNode;
  isSelected: (item: T) => boolean;
  onSelect: (item: T) => void;
}

function PickerField<T>({
  label,
  icon,
  placeholder,
  searchPlaceholder,
  triggerContent,
  items,
  getKey,
  filterFn,
  renderItem,
  isSelected,
  onSelect,
}: PickerFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Decide direction whenever the dropdown opens or the viewport changes
  useEffect(() => {
    if (!open) return;
    const decide = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dropdownHeight = 288; // matches max-h-72
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Open upward only if there's not enough room below AND more room above
      setOpenUpward(spaceBelow < dropdownHeight + 16 && spaceAbove > spaceBelow);
    };
    decide();
    window.addEventListener("resize", decide);
    window.addEventListener("scroll", decide, true);
    return () => {
      window.removeEventListener("resize", decide);
      window.removeEventListener("scroll", decide, true);
    };
  }, [open]);

  const filtered = items.filter((i) => filterFn(i, query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
        {icon}
        {label}
      </label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 w-full h-10 px-3 rounded-lg border bg-background text-sm transition-colors",
          open ? "border-primary ring-2 ring-ring" : "border-input hover:border-primary/50"
        )}
      >
        {triggerContent || <span className="text-muted-foreground">{placeholder}</span>}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 max-h-72 rounded-xl border border-border bg-popover shadow-xl z-50 flex flex-col animate-fade-in overflow-hidden",
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((item) => {
              const selected = isSelected(item);
              return (
                <button
                  key={getKey(item)}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-primary/5 transition-colors",
                    selected && "bg-primary/10"
                  )}
                >
                  {renderItem(item)}
                  {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
