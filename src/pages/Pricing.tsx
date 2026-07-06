// @ts-nocheck
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Sparkles, Shield, Users, Headphones, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { PublicNavbar } from "@/components/PublicNavbar";
import { useCountry } from "@/hooks/useCountry";
import { PublicFooter } from "@/components/PublicFooter";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { getModuleDisplayName } from "@/lib/module-labels";
import type { CountryPlanPrice, CountryAddonPrice } from "@/hooks/useCountryPricing";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_lifetime: number;
  currency: string;
  max_users: number;
  modules: string[];
  features: string[];
  sort_order: number;
  is_free?: boolean;
}

type BillingCycle = "monthly" | "quarterly" | "yearly" | "lifetime";

const cycleLabels: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  lifetime: "Lifetime"
};

const cycleSavings: Record<BillingCycle, string | null> = {
  monthly: null,
  quarterly: "Save 10%",
  yearly: "Save 20%",
  lifetime: "Best Value"
};

const allModuleKeys = [
"hrms", "crm", "marketing", "accounting", "helpdesk", "projects", "documents", "reports", "workflows"];


function BillingEntityNotice() {
  const { companyInfo } = useCompanyInfo();
  return (
    <p className="text-[11px] text-muted-foreground">
      You will be charged by <span className="font-medium text-foreground">{companyInfo.registered_name}</span>
    </p>);

}

const comparisonFeatures = [
{ label: "Users", key: "users" },
{ label: "HRM", key: "hrms" },
{ label: "CRM", key: "crm" },
{ label: "Marketing", key: "marketing" },
{ label: "Accounting", key: "accounting" },
{ label: "Helpdesk", key: "helpdesk" },
{ label: "Projects", key: "projects" },
{ label: "Documents", key: "documents" },
{ label: "Reports", key: "reports" },
{ label: "Workflows", key: "workflows" },
{ label: "API Access", key: "api" },
{ label: "Priority Support", key: "priority_support" },
{ label: "White-label", key: "white_label" },
{ label: "Custom Integrations", key: "custom_integrations" }];


const faqItems = [
{
  q: "Can I switch plans later?",
  a: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll only pay the difference. When downgrading, the remaining credit will be applied to your next billing cycle."
},
{
  q: "What payment methods do you accept?",
  a: "We accept payments through SSLCommerz, which supports bKash, Nagad, Rocket, bank cards (Visa, Mastercard, AMEX), and net banking. All prices are in BDT."
},
{
  q: "Is there a free trial?",
  a: "Absolutely! Every plan comes with a 14-day free trial. No credit card required. You get full access to all features in your chosen plan during the trial."
},
{
  q: "Can I add individual modules separately?",
  a: "Yes, you can purchase additional modules as add-ons to your base plan. Use the module selector below the pricing cards to build your custom package."
},
{
  q: "What happens when my trial ends?",
  a: "You'll be notified before your trial ends. If you don't upgrade, your account will be paused but your data will be preserved for 30 days. You can reactivate anytime."
},
{
  q: "Do you offer discounts for annual billing?",
  a: "Yes! Quarterly billing saves you 10%, yearly billing saves 20%, and our lifetime plan offers the best value for long-term users."
}];


export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleAddons, setModuleAddons] = useState<{module_name: string;display_name: string;price_monthly: number;price_quarterly: number;price_yearly: number;price_onetime: number;description: string | null;}[]>([]);
  const { formatPrice, selectedCountry } = useCountry();
  const [planPricingMode, setPlanPricingMode] = useState<"uniform" | "country_wise">("uniform");
  const [addonPricingMode, setAddonPricingMode] = useState<"uniform" | "country_wise">("uniform");
  const [countryPlanPrices, setCountryPlanPrices] = useState<CountryPlanPrice[]>([]);
  const [countryAddonPrices, setCountryAddonPrices] = useState<CountryAddonPrice[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("module_addons").select("module_name, display_name, price_monthly, price_quarterly, price_yearly, price_onetime, description, id").eq("is_active", true).order("display_name"),
      supabase.from("platform_settings").select("key, value").in("key", ["plan_pricing_mode", "addon_pricing_mode"]),
      supabase.from("country_plan_prices").select("*"),
      supabase.from("country_addon_prices").select("*"),
    ]).then(([plansRes, addonsRes, modesRes, planPricesRes, addonPricesRes]) => {
      if (plansRes.data) setPlans(plansRes.data as Plan[]);
      if (addonsRes.data) setModuleAddons(addonsRes.data as any[]);
      if (modesRes.data) {
        for (const s of modesRes.data) {
          const val = typeof s.value === "string" ? s.value.replace(/"/g, "") : String(s.value);
          if (s.key === "plan_pricing_mode") setPlanPricingMode(val as any);
          if (s.key === "addon_pricing_mode") setAddonPricingMode(val as any);
        }
      }
      if (planPricesRes.data) setCountryPlanPrices(planPricesRes.data as unknown as CountryPlanPrice[]);
      if (addonPricesRes.data) setCountryAddonPrices(addonPricesRes.data as unknown as CountryAddonPrice[]);
      setLoading(false);
    });
  }, []);

  const getPrice = (plan: Plan) => {
    const field = `price_${cycle}` as "price_monthly" | "price_quarterly" | "price_yearly" | "price_lifetime";
    // Check for country-specific price
    if (planPricingMode === "country_wise" && selectedCountry) {
      const cp = countryPlanPrices.find(p => p.plan_id === plan.id && p.country_code === selectedCountry.code);
      if (cp) return cp[field];
    }
    // Fall back to base price (will be converted by formatPrice)
    switch (cycle) {
      case "monthly": return plan.price_monthly;
      case "quarterly": return plan.price_quarterly;
      case "yearly": return plan.price_yearly;
      case "lifetime": return plan.price_lifetime;
    }
  };

  const getPeriod = () => {
    switch (cycle) {
      case "monthly":return "/mo";
      case "quarterly":return "/qtr";
      case "yearly":return "/yr";
      case "lifetime":return "";
    }
  };

  // When country_wise pricing is active for plans, the price is already in local currency
  const fmtPlanPrice = (plan: Plan) => {
    const price = getPrice(plan);
    if (planPricingMode === "country_wise" && selectedCountry) {
      const cp = countryPlanPrices.find(p => p.plan_id === plan.id && p.country_code === selectedCountry.code);
      if (cp) {
        // Already in local currency, format directly
        try {
          return new Intl.NumberFormat("en-US", { style: "currency", currency: cp.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price);
        } catch { return `${selectedCountry?.symbol || ""}${price.toLocaleString()}`; }
      }
    }
    return formatPrice(price);
  };

  const fmt = (n: number) => formatPrice(n);

  const toggleModule = (mod: string) => {
    setSelectedModules((prev) =>
    prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const getPlanFeatureValue = (plan: Plan, key: string) => {
    if (key === "users") return plan.max_users === 9999 || plan.max_users === -1 ? "Unlimited" : `Up to ${plan.max_users}`;
    if (allModuleKeys.includes(key)) {
      return plan.modules.includes(key);
    }
    if (key === "api") return plan.features.some((f) => f.toLowerCase().includes("api"));
    if (key === "priority_support") return plan.features.some((f) => f.toLowerCase().includes("priority") || f.toLowerCase().includes("24/7"));
    if (key === "white_label") return plan.features.some((f) => f.toLowerCase().includes("white"));
    if (key === "custom_integrations") return plan.features.some((f) => f.toLowerCase().includes("custom integration"));
    return false;
  };

  const getAddonPrice = (addon: typeof moduleAddons[0]) => {
    const field = cycle === "lifetime" ? "price_onetime" : `price_${cycle}` as any;
    // Check for country-specific addon price
    if (addonPricingMode === "country_wise" && selectedCountry && (addon as any).id) {
      const cp = countryAddonPrices.find(p => p.addon_id === (addon as any).id && p.country_code === selectedCountry.code);
      if (cp) return cp[field as keyof CountryAddonPrice] as number;
    }
    switch (cycle) {
      case "monthly": return addon.price_monthly;
      case "quarterly": return addon.price_quarterly;
      case "yearly": return addon.price_yearly;
      case "lifetime": return addon.price_onetime;
    }
  };

  const customBuildTotal = selectedModules.reduce((sum, mod) => {
    const addon = moduleAddons.find((a) => a.module_name === mod);
    return sum + (addon ? getAddonPrice(addon) : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/[0.03] to-transparent">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="text-center max-w-[640px] mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6">
              <Sparkles className="h-3 w-3" />
              Flexible plans for every team
            </div>
            <h1 className="text-[36px] sm:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
              Invest in your business growth
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Pick the modules you need. Pay only for what you use. Upgrade or customize anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Billing cycle toggle */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-10">
        <div className="flex items-stretch justify-between gap-1 p-1 bg-muted/50 border border-border rounded-lg w-full sm:w-fit mx-auto">
          {(Object.keys(cycleLabels) as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`relative flex-1 sm:flex-none flex items-center justify-center px-2 sm:px-6 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                cycle === c
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cycleSavings[c] && (
                <span
                  className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-none whitespace-nowrap shadow-sm border ${
                    cycle === c
                      ? "bg-primary-foreground text-primary border-primary-foreground"
                      : "bg-primary text-primary-foreground border-primary"
                  }`}
                >
                  {cycleSavings[c]}
                </span>
              )}
              {cycleLabels[c]}
            </button>
          ))}
        </div>
      </section>

      {/* Plan cards */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ?
        <div className="flex justify-center py-16">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div> :

        <div className={`grid grid-cols-1 gap-4 mx-auto ${plans.length <= 3 ? "md:grid-cols-3 max-w-[960px]" : "md:grid-cols-4 max-w-[1200px]"}`}>
            {plans.map((plan, idx) => {
            const isFree = (plan as any).is_free;
            const popular = !isFree && idx === 2;
            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border p-6 transition-all duration-200 flex flex-col h-full ${
                popular ?
                "border-primary bg-card shadow-md ring-1 ring-primary/20" :
                isFree ?
                "border-success/30 bg-card hover:border-success/50" :
                "border-border bg-card hover:border-primary/30"}`
                }>
                
                  {popular &&
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      Most Popular
                    </div>
                }
                  {isFree &&
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-success text-white text-xs font-semibold">
                      Forever Free
                    </div>
                }

                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  <div className="mb-5">
                    {isFree ?
                  <>
                        <span className="text-3xl font-bold text-success">Free</span>
                        <span className="text-sm text-muted-foreground ml-1">forever</span>
                      </> :

                  <>
                        <span className="text-3xl font-bold text-foreground">{fmtPlanPrice(plan)}</span>
                        <span className="text-sm text-muted-foreground">{getPeriod()}</span>
                        {cycle === "lifetime" &&
                    <p className="text-xs text-primary font-medium mt-1">One-time payment</p>
                    }
                      </>
                  }
                  </div>

                  {/* Modules */}
                  <div className="mb-4">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Modules</p>
                    <div className="flex flex-wrap gap-1">
                      {plan.modules.map((m) =>
                    <span key={m} className={`px-2 py-0.5 text-[11px] font-medium rounded ${isFree ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                           {getModuleDisplayName(m)}
                         </span>
                    )}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 mb-5 flex-1">
                    <ul className="space-y-2.5">
                      {plan.features.map((f) =>
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          {f}
                        </li>
                    )}
                    </ul>
                  </div>

                  <Link
                  to="/signup"
                  className={`block w-full text-center py-2 rounded-md text-sm font-medium transition-colors ${
                  isFree ?
                  "bg-success text-white hover:bg-success/90" :
                  popular ?
                  "bg-primary text-primary-foreground hover:bg-primary/90" :
                  "border border-border text-foreground hover:bg-muted/50"}`
                  }>
                  
                    {isFree ? "Get Started Free" : "Start 14-Day Free Trial"}
                  </Link>
                </div>);

          })}
          </div>
        }

        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-success" /> Secure payments</div>
            <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-info" /> 1000+ businesses</div>
            <div className="flex items-center gap-1.5"><Headphones className="h-3.5 w-3.5 text-warning" /> 24/7 support</div>
          </div>
          <BillingEntityNotice />
        </div>
      </section>

      {/* Custom Build Plan */}
      <section className="border-y border-border bg-muted/30 py-16">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-4">
              <Sparkles className="h-3 w-3" />
              Custom Build
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Build your own plan</h2>
            <p className="text-muted-foreground mt-2">Pick only the modules you need. Cancel anytime.</p>

            {/* Billing cycle switcher for custom build */}
            <div className="flex items-stretch justify-between gap-1 p-1 bg-muted/50 border border-border rounded-lg w-full sm:w-fit mx-auto mt-8">
              {(Object.keys(cycleLabels) as BillingCycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`relative flex-1 sm:flex-none flex items-center justify-center px-2 sm:px-6 py-2.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    cycle === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cycleSavings[c] && (
                    <span
                      className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-none whitespace-nowrap shadow-sm border ${
                        cycle === c
                          ? "bg-primary-foreground text-primary border-primary-foreground"
                          : "bg-primary text-primary-foreground border-primary"
                      }`}
                    >
                      {cycleSavings[c]}
                    </span>
                  )}
                  {cycleLabels[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            {moduleAddons.map((addon) => {
              const active = selectedModules.includes(addon.module_name);
              return (
                <button
                  key={addon.module_name}
                  onClick={() => toggleModule(addon.module_name)}
                  className={`relative p-4 rounded-xl text-left transition-all border ${
                  active ?
                  "bg-primary/5 border-primary ring-1 ring-primary/20" :
                  "bg-card border-border hover:border-primary/40"}`
                  }>
                  
                  {active && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                  <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{addon.display_name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{addon.description}</p>
                  <p className="text-sm font-bold mt-2 text-foreground">{fmt(getAddonPrice(addon))}<span className="text-xs font-normal text-muted-foreground">{getPeriod()}</span></p>
                </button>);

            })}
          </div>

          {selectedModules.length > 0 &&
          <div className="max-w-lg mx-auto">
              <div className="border border-primary/20 rounded-xl bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your Custom Plan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedModules.length} module{selectedModules.length > 1 ? "s" : ""} selected · {cycle === "lifetime" ? "One-time payment" : `Billed ${cycle}`}</p>
                  </div>
                  <button onClick={() => setSelectedModules([])} className="text-xs text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-4 border-t border-border pt-4">
                  {selectedModules.map((mod) => {
                  const addon = moduleAddons.find((a) => a.module_name === mod);
                  return (
                    <div key={mod} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{addon?.display_name || mod}</span>
                        <span className="font-medium text-foreground">{fmt(addon ? getAddonPrice(addon) : 0)}</span>
                      </div>);

                })}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {fmt(selectedModules.reduce((sum, mod) => {
                      const addon = moduleAddons.find((a) => a.module_name === mod);
                      return sum + (addon ? getAddonPrice(addon) : 0);
                    }, 0))}
                      <span className="text-sm font-normal text-muted-foreground">{getPeriod()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{cycle === "lifetime" ? "One-time payment" : `Recurring ${cycle} billing`}</p>
                  </div>
                  <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          }

          {selectedModules.length === 0 &&
          <p className="text-center text-sm text-muted-foreground">Select modules above to see your custom pricing</p>
          }
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Compare plans</h2>
          <p className="text-muted-foreground mt-2">See exactly what's included in each plan.</p>
        </div>

        {!loading && plans.length > 0 &&
        <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground w-1/4">Feature</th>
                    {plans.map((p) =>
                  <th key={p.id} className="text-center py-3 px-4 font-semibold text-foreground">{p.name}</th>
                  )}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feat, i) =>
                <tr key={feat.key} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                      <td className="py-3 px-5 font-medium text-foreground">{feat.label}</td>
                      {plans.map((p) => {
                    const val = getPlanFeatureValue(p, feat.key);
                    return (
                      <td key={p.id} className="text-center py-3 px-4">
                            {typeof val === "boolean" ?
                        val ?
                        <Check className="h-4 w-4 text-success mx-auto" /> :

                        <span className="text-muted-foreground/40">—</span> :


                        <span className="font-medium text-foreground">{val}</span>
                        }
                          </td>);

                  })}
                    </tr>
                )}
                  <tr>
                    <td className="py-3 px-5 font-semibold text-foreground">Price</td>
                    {plans.map((p) =>
                  <td key={p.id} className="text-center py-3 px-4">
                        <span className="font-bold text-primary">{fmtPlanPrice(p)}</span>
                        <span className="text-xs text-muted-foreground">{getPeriod()}</span>
                      </td>
                  )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        }
      </section>

      {/* FAQ */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Frequently asked questions</h2>
            <p className="text-muted-foreground mt-2">Everything you need to know about our pricing.</p>
          </div>

          <div className="space-y-2">
            {faqItems.map((item, i) =>
            <div
              key={i}
              className="border border-border rounded-lg bg-card overflow-hidden">
              
                <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/30 transition-colors">
                
                  <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
                  <ChevronDown
                  className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  openFaq === i ? "rotate-180" : ""}`
                  } />
                
                </button>
                {openFaq === i &&
              <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
              }
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-[40px]">
        <div className="max-w-[600px] mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-4">Ready to get started?</h2>
          <p className="text-base text-muted-foreground mb-8">Start your 14-day free trial today. No credit card required.</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors border border-primary/80">
            
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Payment powered by SSLCommerz • All prices in BDT • Secure transactions guaranteed
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>);

}