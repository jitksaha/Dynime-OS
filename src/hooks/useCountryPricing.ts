// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useCountry } from "@/hooks/useCountry";

export interface CountryPlanPrice {
  id: string;
  plan_id: string;
  country_code: string;
  currency: string;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_lifetime: number;
}

export interface CountryAddonPrice {
  id: string;
  addon_id: string;
  country_code: string;
  currency: string;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_onetime: number;
}

/**
 * Hook to resolve the correct price for a plan or addon based on the user's selected country.
 * If pricing mode is "country_wise" and a country-specific price exists, use it.
 * Otherwise, fall back to the base price converted via exchange rate.
 */
export function useCountryPricing() {
  const { selectedCountry } = useCountry();
  const [planPricingMode, setPlanPricingMode] = useState<"uniform" | "country_wise">("uniform");
  const [addonPricingMode, setAddonPricingMode] = useState<"uniform" | "country_wise">("uniform");
  const [countryPlanPrices, setCountryPlanPrices] = useState<CountryPlanPrice[]>([]);
  const [countryAddonPrices, setCountryAddonPrices] = useState<CountryAddonPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [modeRes, planPricesRes, addonPricesRes] = await Promise.all([
        supabase.from("platform_settings").select("key, value").in("key", ["plan_pricing_mode", "addon_pricing_mode"]),
        supabase.from("country_plan_prices").select("*"),
        supabase.from("country_addon_prices").select("*"),
      ]);

      if (modeRes.data) {
        for (const s of modeRes.data) {
          const val = typeof s.value === "string" ? s.value.replace(/"/g, "") : String(s.value);
          if (s.key === "plan_pricing_mode") setPlanPricingMode(val as any);
          if (s.key === "addon_pricing_mode") setAddonPricingMode(val as any);
        }
      }
      if (planPricesRes.data) setCountryPlanPrices(planPricesRes.data as CountryPlanPrice[]);
      if (addonPricesRes.data) setCountryAddonPrices(addonPricesRes.data as CountryAddonPrice[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const getPlanPrice = (planId: string, field: "price_monthly" | "price_quarterly" | "price_yearly" | "price_lifetime", basePrice: number): { price: number; currency: string } => {
    if (planPricingMode === "country_wise" && selectedCountry) {
      const cp = countryPlanPrices.find(p => p.plan_id === planId && p.country_code === selectedCountry.code);
      if (cp) return { price: cp[field], currency: cp.currency };
    }
    // Uniform: convert base price using exchange rate
    if (selectedCountry) {
      return { price: basePrice * selectedCountry.exchange_rate, currency: selectedCountry.currency };
    }
    return { price: basePrice, currency: "BDT" };
  };

  const getAddonPrice = (addonId: string, field: "price_monthly" | "price_quarterly" | "price_yearly" | "price_onetime", basePrice: number): { price: number; currency: string } => {
    if (addonPricingMode === "country_wise" && selectedCountry) {
      const cp = countryAddonPrices.find(p => p.addon_id === addonId && p.country_code === selectedCountry.code);
      if (cp) return { price: cp[field], currency: cp.currency };
    }
    if (selectedCountry) {
      return { price: basePrice * selectedCountry.exchange_rate, currency: selectedCountry.currency };
    }
    return { price: basePrice, currency: "BDT" };
  };

  return {
    planPricingMode,
    addonPricingMode,
    countryPlanPrices,
    countryAddonPrices,
    getPlanPrice,
    getAddonPrice,
    loading,
  };
}
