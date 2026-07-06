import { useState, forwardRef } from "react";
import {
  CreditCard,
  ChevronRight,
  ChevronDown,
  Grid2X2,
  List,
  LayoutList,
  Rows3,
} from "lucide-react";

export type CheckoutLayout = "accordion" | "grid" | "chips" | "dropdown";

export const LAYOUT_OPTIONS: { key: CheckoutLayout; label: string; icon: typeof List }[] = [
  { key: "accordion", label: "List", icon: LayoutList },
  { key: "grid", label: "Grid", icon: Grid2X2 },
  { key: "chips", label: "Chips", icon: Rows3 },
  { key: "dropdown", label: "Select", icon: List },
];

type GatewayOption = {
  key: string;
  gatewayKey: string;
  label: string;
  description: string;
  icon: typeof CreditCard;
  logoUrl?: string | null;
  /** Pre-computed converted amount for this gateway */
  convertedAmount?: number;
  /** The currency this gateway will charge in */
  convertedCurrency?: string;
};

interface GatewayListProps {
  options: GatewayOption[];
  selected: string;
  onSelect: (key: string) => void;
  layout: CheckoutLayout;
}

/* ── Currency symbol helper ── */
const CURRENCY_SYMBOLS: Record<string, string> = {
  bdt: "৳", usd: "$", eur: "€", gbp: "£", inr: "₹", jpy: "¥",
  cny: "¥", krw: "₩", thb: "฿", myr: "RM", sgd: "S$", aud: "A$", cad: "C$",
  ngn: "₦", pkr: "₨", brl: "R$", zar: "R", try: "₺", php: "₱",
};

function getCurrencySymbol(currency: string) {
  const c = currency.toLowerCase();
  if (CURRENCY_SYMBOLS[c]) return CURRENCY_SYMBOLS[c];
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: c, maximumFractionDigits: 0 })
      .format(0).replace(/[\d.,\s]/g, "").trim();
  } catch { return currency.toUpperCase(); }
}

function formatGatewayAmount(amount: number, currency: string) {
  const sym = getCurrencySymbol(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${sym}${amount.toLocaleString()}`;
  }
}

/* ── Gateway Logo or Fallback Icon ── */
const GatewayLogo = forwardRef<HTMLDivElement, { option: GatewayOption; size?: "sm" | "md"; isSelected: boolean }>(
  function GatewayLogo({ option, size = "md", isSelected }, ref) {
    const dims = size === "sm" ? "h-7 w-7" : "h-9 w-9";
    const iconDims = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
    const imgDims = size === "sm" ? "h-5 w-5" : "h-6 w-6";
    const Icon = option.icon;

    if (option.logoUrl) {
      return (
        <div ref={ref} className={`${dims} rounded-lg flex items-center justify-center transition-colors shrink-0 ${
          isSelected ? "bg-primary/10" : "bg-muted"
        }`}>
          <img src={option.logoUrl} alt={option.label} className={`${imgDims} object-contain`} />
        </div>
      );
    }

    return (
      <div ref={ref} className={`${dims} rounded-lg flex items-center justify-center transition-colors shrink-0 ${
        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>
        <Icon className={iconDims} />
      </div>
    );
  }
);

/* ── Converted amount badge ── */
function ConvertedBadge({ option, baseCurrency }: { option: GatewayOption; baseCurrency?: string }) {
  if (!option.convertedAmount || !option.convertedCurrency) return null;
  // Don't show if same as base
  if (baseCurrency && option.convertedCurrency.toUpperCase() === baseCurrency.toUpperCase()) return null;

  return (
    <span className="text-[10px] font-semibold text-accent-foreground bg-accent/60 rounded-md px-1.5 py-0.5 shrink-0 whitespace-nowrap">
      {formatGatewayAmount(option.convertedAmount, option.convertedCurrency)}
    </span>
  );
}

/* ── Accordion (top 3 + expand) ── */
function AccordionLayout({ options, selected, onSelect }: Omit<GatewayListProps, "layout">) {
  const [showMore, setShowMore] = useState(false);
  const MAX = 3;

  const renderItem = (option: GatewayOption, idx: number) => {
    const isSelected = selected === option.key;
    return (
      <button
        key={option.key}
        onClick={() => onSelect(option.key)}
        className={`w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-all ${
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border hover:border-primary/20 hover:bg-muted/50"
        }`}
      >
        <GatewayLogo option={option} isSelected={isSelected} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground leading-tight">{option.label}</p>
            {option.convertedAmount && option.convertedCurrency && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 whitespace-nowrap">
                {formatGatewayAmount(option.convertedAmount, option.convertedCurrency)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{option.description}</p>
        </div>
        {idx === 0 && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
            Recommended
          </span>
        )}
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
      </button>
    );
  };

  return (
    <div className="space-y-1.5">
      {options.slice(0, MAX).map((o, i) => renderItem(o, i))}
      {options.length > MAX && (
        <>
          <button
            onClick={() => setShowMore((p) => !p)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{showMore ? "Show fewer options" : `+${options.length - MAX} more payment methods`}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>
          {showMore && (
            <div className="space-y-1.5 animate-fade-in">
              {options.slice(MAX).map((o, i) => renderItem(o, MAX + i))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Compact Grid (2-3 columns) ── */
function GridLayout({ options, selected, onSelect }: Omit<GatewayListProps, "layout">) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((option, idx) => {
        const isSelected = selected === option.key;
        return (
          <button
            key={option.key}
            onClick={() => onSelect(option.key)}
            className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all ${
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/20 hover:bg-muted/50"
            }`}
          >
            {idx === 0 && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                Top
              </span>
            )}
            <GatewayLogo option={option} size="sm" isSelected={isSelected} />
            <p className="text-xs font-medium text-foreground leading-tight truncate w-full">{option.label}</p>
            {option.convertedAmount && option.convertedCurrency && (
              <p className="text-[10px] font-semibold text-muted-foreground">
                {formatGatewayAmount(option.convertedAmount, option.convertedCurrency)}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Horizontal Scroll Chips ── */
function ChipsLayout({ options, selected, onSelect }: Omit<GatewayListProps, "layout">) {
  const selectedOption = options.find((o) => o.key === selected);
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {options.map((option, idx) => {
          const isSelected = selected === option.key;
          return (
            <button
              key={option.key}
              onClick={() => onSelect(option.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/20 hover:bg-muted/50"
              }`}
            >
              {option.logoUrl ? (
                <img src={option.logoUrl} alt={option.label} className="h-4 w-4 object-contain" />
              ) : (
                <option.icon className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              )}
              <span className={`text-xs font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                {option.label}
              </span>
              {option.convertedAmount && option.convertedCurrency && (
                <span className="text-[9px] font-semibold text-muted-foreground">
                  {formatGatewayAmount(option.convertedAmount, option.convertedCurrency)}
                </span>
              )}
              {idx === 0 && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-primary/10 text-primary">
                  Top
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedOption && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center gap-3 animate-fade-in">
          <GatewayLogo option={selectedOption} isSelected />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{selectedOption.label}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{selectedOption.description}</p>
          </div>
          {selectedOption.convertedAmount && selectedOption.convertedCurrency && (
            <span className="text-xs font-bold text-foreground">
              {formatGatewayAmount(selectedOption.convertedAmount, selectedOption.convertedCurrency)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Dropdown Select ── */
function DropdownLayout({ options, selected, onSelect }: Omit<GatewayListProps, "layout">) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.key === selected);

  return (
    <div className="relative space-y-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 rounded-xl border-2 border-border px-3.5 py-3 text-left hover:border-primary/20 transition-all bg-background"
      >
        {selectedOption ? (
          <>
            <GatewayLogo option={selectedOption} isSelected />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{selectedOption.label}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{selectedOption.description}</p>
            </div>
            {selectedOption.convertedAmount && selectedOption.convertedCurrency && (
              <span className="text-xs font-bold text-foreground shrink-0">
                {formatGatewayAmount(selectedOption.convertedAmount, selectedOption.convertedCurrency)}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Select a payment method</span>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 w-full rounded-xl border border-border bg-background shadow-lg py-1 animate-fade-in max-h-64 overflow-y-auto">
          {options.map((option, idx) => {
            const isSelected = selected === option.key;
            return (
              <button
                key={option.key}
                onClick={() => { onSelect(option.key); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                  isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <GatewayLogo option={option} size="sm" isSelected={isSelected} />
                <span className="text-sm font-medium text-foreground flex-1">{option.label}</span>
                {option.convertedAmount && option.convertedCurrency && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {formatGatewayAmount(option.convertedAmount, option.convertedCurrency)}
                  </span>
                )}
                {idx === 0 && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-primary/10 text-primary">
                    Top
                  </span>
                )}
                {isSelected && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Renderer ── */
export function GatewayList({ options, selected, onSelect, layout }: GatewayListProps) {
  switch (layout) {
    case "grid":
      return <GridLayout options={options} selected={selected} onSelect={onSelect} />;
    case "chips":
      return <ChipsLayout options={options} selected={selected} onSelect={onSelect} />;
    case "dropdown":
      return <DropdownLayout options={options} selected={selected} onSelect={onSelect} />;
    case "accordion":
    default:
      return <AccordionLayout options={options} selected={selected} onSelect={onSelect} />;
  }
}

/* ── Layout Switcher Toggle ── */
export function LayoutSwitcher({
  current,
  onChange,
}: {
  current: CheckoutLayout;
  onChange: (l: CheckoutLayout) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-muted/60 rounded-lg">
      {LAYOUT_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = current === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            title={opt.label}
            className={`p-1.5 rounded-md transition-all ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
