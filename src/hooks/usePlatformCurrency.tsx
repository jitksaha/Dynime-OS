import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";

/**
 * Hook for Super Admin pages to get the platform's base currency.
 * Reads from platform_settings and derives the symbol via Intl.
 */
export function usePlatformCurrency() {
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("$");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "base_currency")
        .maybeSingle();
      if (data?.value) {
        const cur = typeof data.value === "string" ? data.value.replace(/"/g, "") : String(data.value);
        setCurrency(cur);
        // Derive symbol from currency code using Intl
        try {
          const sym = new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 })
            .format(0).replace(/[\d.,\s]/g, "").trim();
          if (sym) setSymbol(sym);
        } catch {
          setSymbol(cur + " ");
        }
      }
    };
    fetch();
  }, []);

  const formatPrice = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: num < 100 ? 2 : 0 }).format(num);
    } catch {
      return `${symbol}${num.toLocaleString()}`;
    }
  };

  return { currency, symbol, formatPrice };
}
