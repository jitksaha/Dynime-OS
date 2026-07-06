import { useState, useEffect } from "react";
import { Globe, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import type { CountryInfo } from "@/hooks/useCountry";

interface PriceField {
  key: string;
  label: string;
}

interface CountryPrice {
  country_code: string;
  currency: string;
  [key: string]: any;
}

interface CountryPricingEditorProps {
  /** "plan" or "addon" */
  entityType: "plan" | "addon";
  entityId: string;
  entityName: string;
  priceFields: PriceField[];
  /** Base prices from the entity (used as default when creating country prices) */
  basePrices: Record<string, number>;
  /** Current pricing mode */
  pricingMode: "uniform" | "country_wise";
  onPricingModeChange: (mode: "uniform" | "country_wise") => void;
}

export default function CountryPricingEditor({
  entityType,
  entityId,
  entityName,
  priceFields,
  basePrices,
  pricingMode,
  onPricingModeChange,
}: CountryPricingEditorProps) {
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [countryPrices, setCountryPrices] = useState<CountryPrice[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const tableName = entityType === "plan" ? "country_plan_prices" : "country_addon_prices";
  const fkField = entityType === "plan" ? "plan_id" : "addon_id";

  useEffect(() => {
    const fetch = async () => {
      const [countriesRes, pricesRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "enabled_countries").single(),
        supabase.from(tableName as any).select("*").eq(fkField, entityId),
      ]);

      const rawCountries: CountryInfo[] = countriesRes.data?.value
        ? (countriesRes.data.value as any as CountryInfo[])
        : [];
      setCountries(rawCountries);

      const existingPrices = (pricesRes.data || []) as unknown as CountryPrice[];
      
      // Merge: ensure every country has an entry
      const merged = rawCountries.map((c) => {
        const existing = existingPrices.find((p) => p.country_code === c.code);
        if (existing) return existing;
        // Create default entry from base prices
        const entry: CountryPrice = { country_code: c.code, currency: c.currency };
        priceFields.forEach((f) => {
          entry[f.key] = basePrices[f.key] ?? 0;
        });
        return entry;
      });
      setCountryPrices(merged);
    };
    fetch();
  }, [entityId, tableName, fkField]);

  const updateCountryPrice = (countryCode: string, field: string, value: number) => {
    setCountryPrices((prev) =>
      prev.map((p) => (p.country_code === countryCode ? { ...p, [field]: value } : p))
    );
  };

  const saveCountryPrices = async () => {
    setSaving(true);
    try {
      // Upsert all country prices
      const rows = countryPrices.map((cp) => {
        const row: any = {
          [fkField]: entityId,
          country_code: cp.country_code,
          currency: cp.currency,
        };
        priceFields.forEach((f) => {
          row[f.key] = cp[f.key] ?? 0;
        });
        return row;
      });

      // Delete existing and re-insert (simple upsert)
      await supabase.from(tableName as any).delete().eq(fkField, entityId);
      const { error } = await supabase.from(tableName as any).insert(rows as any);
      if (error) throw error;
      toast.success(`Country prices saved for ${entityName}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="mt-4 border-2 border-primary/20 rounded-xl overflow-hidden bg-primary/[0.02]">
      {/* Pricing Mode Toggle */}
      <div className="p-4 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">🌍 Country-Wise Pricing</span>
            <p className="text-[10px] text-muted-foreground">Set different prices for different countries or use a single base price</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              pricingMode === "uniform"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-background hover:border-primary/30"
            }`}
          >
            <input
              type="radio"
              name={`pricing-mode-${entityId}`}
              checked={pricingMode === "uniform"}
              onChange={() => onPricingModeChange("uniform")}
              className="h-4 w-4 mt-0.5 text-primary border-input"
            />
            <div>
              <span className="text-sm font-semibold text-foreground">🔒 Same price for all</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Base price is auto-converted using exchange rates</p>
            </div>
          </label>
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              pricingMode === "country_wise"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-background hover:border-primary/30"
            }`}
          >
            <input
              type="radio"
              name={`pricing-mode-${entityId}`}
              checked={pricingMode === "country_wise"}
              onChange={() => onPricingModeChange("country_wise")}
              className="h-4 w-4 mt-0.5 text-primary border-input"
            />
            <div>
              <span className="text-sm font-semibold text-foreground">🌐 Different per country</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Set specific prices in each country's local currency</p>
            </div>
          </label>
        </div>
      </div>

      {/* Country Prices Grid */}
      {pricingMode === "country_wise" && (
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-foreground hover:bg-muted/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-primary" />
              {countries.length} Countries Configured
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expanded && (
            <div className="p-4 pt-0 space-y-3">
              {/* Header */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `180px repeat(${priceFields.length}, 1fr)` }}>
                <div className="text-xs font-medium text-muted-foreground">Country</div>
                {priceFields.map((f) => (
                  <div key={f.key} className="text-xs font-medium text-muted-foreground">{f.label}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {countryPrices.map((cp) => {
                  const country = countries.find((c) => c.code === cp.country_code);
                  return (
                    <div
                      key={cp.country_code}
                      className="grid gap-2 items-center"
                      style={{ gridTemplateColumns: `180px repeat(${priceFields.length}, 1fr)` }}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span>{country?.flag}</span>
                        <span className="truncate text-foreground">{country?.name || cp.country_code}</span>
                        <span className="text-xs text-muted-foreground">({cp.currency})</span>
                      </div>
                      {priceFields.map((f) => (
                        <input
                          key={f.key}
                          type="number"
                          min={0}
                          step="0.01"
                          value={cp[f.key] ?? 0}
                          onChange={(e) => updateCountryPrice(cp.country_code, f.key, Number(e.target.value))}
                          className="w-full h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={saveCountryPrices}
                disabled={saving}
                className="mt-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Country Prices"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
