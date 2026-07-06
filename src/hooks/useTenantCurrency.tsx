import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getCurrencyDecimals, roundForCurrency } from "@/lib/currency-utils";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

interface TenantCurrencyContextType {
  currency: string;
  symbol: string;
  loading: boolean;
  /** Exchange rate from platform base currency → tenant currency (e.g. 1 USD = 110 BDT → rate = 110) */
  exchangeRate: number;
  /** Format a number already in tenant currency, e.g. "$1,234" */
  formatPrice: (amount: number | string) => string;
  /** Convert an amount from the platform's base currency to tenant currency, then format it */
  convertAndFormat: (baseAmount: number | string) => string;
  /** Convert a base-currency amount to the tenant's currency (number only) */
  convertFromBase: (baseAmount: number) => number;
  refresh: () => Promise<void>;
}

const TenantCurrencyContext = createContext<TenantCurrencyContextType>({
  currency: "USD",
  symbol: "$",
  loading: true,
  exchangeRate: 1,
  formatPrice: (n) => `$${Number(n).toLocaleString()}`,
  convertAndFormat: (n) => `$${Number(n).toLocaleString()}`,
  convertFromBase: (n) => n,
  refresh: async () => {},
});

export function TenantCurrencyProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("$");
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(1);

  const refresh = useCallback(async () => {
    if (!profile?.tenant_id) {
      setLoading(false);
      return;
    }

    // Fetch tenant currency + platform enabled_countries (for exchange rates) in parallel
    const [tenantRes, countriesRes] = await Promise.all([
      supabase
        .from("tenants")
        .select("currency, currency_symbol")
        .eq("id", profile.tenant_id)
        .maybeSingle(),
      supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "enabled_countries")
        .maybeSingle(),
    ]);

    const tenantCurrency = (tenantRes.data as any)?.currency || "USD";
    const tenantSymbol = (tenantRes.data as any)?.currency_symbol || "$";
    setCurrency(tenantCurrency);
    setSymbol(tenantSymbol);

    // Find exchange rate for the tenant's currency from enabled_countries
    if (countriesRes.data?.value && tenantCurrency !== "USD") {
      try {
        const countries: any[] = countriesRes.data.value as any;
        const match = countries.find((c: any) => c.currency === tenantCurrency);
        if (match?.exchange_rate) {
          setExchangeRate(Number(match.exchange_rate));
        }
      } catch {
        // keep default rate of 1
      }
    } else {
      setExchangeRate(1);
    }

    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const formatPrice = useCallback(
    (amount: number | string) => {
      const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
      const decimals = getCurrencyDecimals(currency);
      const rounded = roundForCurrency(num, currency);
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: decimals === 0 ? 0 : (rounded < 1 ? decimals : 0),
          maximumFractionDigits: decimals,
        }).format(rounded);
      } catch {
        return `${symbol}${rounded.toLocaleString()}`;
      }
    },
    [currency, symbol]
  );

  const convertFromBase = useCallback(
    (baseAmount: number) => roundForCurrency(baseAmount * exchangeRate, currency),
    [exchangeRate, currency]
  );

  const convertAndFormat = useCallback(
    (baseAmount: number | string) => {
      const num = typeof baseAmount === "string" ? parseFloat(baseAmount) || 0 : baseAmount;
      const converted = roundForCurrency(num * exchangeRate, currency);
      const decimals = getCurrencyDecimals(currency);
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: decimals === 0 ? 0 : (converted < 1 ? decimals : 0),
          maximumFractionDigits: decimals,
        }).format(converted);
      } catch {
        return `${symbol}${converted.toLocaleString()}`;
      }
    },
    [currency, symbol, exchangeRate]
  );

  return (
    <TenantCurrencyContext.Provider value={{ currency, symbol, loading, exchangeRate, formatPrice, convertAndFormat, convertFromBase, refresh }}>
      {children}
    </TenantCurrencyContext.Provider>
  );
}

export const useTenantCurrency = () => useContext(TenantCurrencyContext);
