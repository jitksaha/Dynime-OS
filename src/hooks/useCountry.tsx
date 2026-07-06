import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/db";

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  currency: string;
  symbol: string;
  exchange_rate: number; // rate from BDT → this currency
}

interface CountryContextType {
  countries: CountryInfo[];
  selectedCountry: CountryInfo | null;
  setSelectedCountry: (country: CountryInfo) => void;
  loading: boolean;
  baseCurrency: string;
  /** Format a base-currency amount into the selected country's currency */
  formatPrice: (baseAmount: number) => string;
}

const CountryContext = createContext<CountryContextType>({
  countries: [],
  selectedCountry: null,
  setSelectedCountry: () => {},
  loading: true,
  baseCurrency: "BDT",
  formatPrice: (n) => `৳${n.toLocaleString()}`,
});

function formatCurrency(amount: number, symbol: string, currency: string): string {
  // Use Intl for proper locale-aware formatting when possible
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: amount < 1 ? 2 : 0,
      maximumFractionDigits: amount < 1 ? 2 : amount < 100 ? 2 : 0,
    }).format(amount);
    return formatted;
  } catch {
    // Fallback for unknown currency codes
    if (amount < 1) return `${symbol}${amount.toFixed(2)}`;
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("BDT");

  useEffect(() => {
    const fetchCountries = async () => {
      const [countriesRes, baseRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "enabled_countries").single(),
        supabase.from("platform_settings").select("value").eq("key", "base_currency").single(),
      ]);

      if (baseRes.data?.value) {
        setBaseCurrency(String(baseRes.data.value));
      }

      const raw: any[] = countriesRes.data?.value ? (countriesRes.data.value as any as any[]) : [];
      const list: CountryInfo[] = raw.map((c) => ({
        ...c,
        exchange_rate: c.exchange_rate ?? 1,
      }));
      setCountries(list);

      // Check localStorage first
      const saved = localStorage.getItem("selected_country");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const match = list.find((c) => c.code === parsed.code);
          if (match) {
            setSelectedCountry(match);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Auto-detect via IP
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
        const geo = await res.json();
        const match = list.find((c) => c.code === geo.country_code);
        if (match) {
          setSelectedCountry(match);
          localStorage.setItem("selected_country", JSON.stringify(match));
          setLoading(false);
          return;
        }
      } catch {}

      // Default to US
      const fallback = list.find((c) => c.code === "US") || list[0] || null;
      if (fallback) {
        setSelectedCountry(fallback);
        localStorage.setItem("selected_country", JSON.stringify(fallback));
      }
      setLoading(false);
    };

    fetchCountries();
  }, []);

  const handleSetCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    localStorage.setItem("selected_country", JSON.stringify(country));
  };

  const formatPrice = (baseAmount: number): string => {
    if (!selectedCountry) return `${baseAmount.toLocaleString()}`;
    const converted = baseAmount * selectedCountry.exchange_rate;
    return formatCurrency(converted, selectedCountry.symbol, selectedCountry.currency);
  };

  return (
    <CountryContext.Provider value={{ countries, selectedCountry, setSelectedCountry: handleSetCountry, loading, baseCurrency, formatPrice }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}
