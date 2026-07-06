// @ts-nocheck
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useCountry } from "@/hooks/useCountry";
import { supabase } from "@/integrations/supabase/db";

interface PlanData {
  name: string;
  slug: string;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_lifetime: number;
  description: string | null;
  features: string[];
  is_free: boolean;
  max_users: number;
  max_companies: number;
  max_employees: number;
  max_invoices: number;
  max_deals: number;
  max_documents: number;
  max_projects: number;
}

type BillingCycle = "monthly" | "quarterly" | "yearly" | "lifetime";

const cycleLabels: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

const cycleSavings: Record<BillingCycle, string | null> = {
  monthly: null,
  quarterly: "Save 10%",
  yearly: "Save 20%",
  lifetime: "Best Value",
};

export function PricingSection() {
  const { formatPrice } = useCountry();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("name, slug, price_monthly, price_quarterly, price_yearly, price_lifetime, description, features, is_free, max_users, max_companies, max_employees, max_invoices, max_deals, max_documents, max_projects")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setPlans(data as PlanData[]);
        setLoading(false);
      });
  }, []);

  const getPrice = (plan: PlanData) => {
    if (plan.is_free) return 0;
    switch (cycle) {
      case "monthly": return plan.price_monthly;
      case "quarterly": return plan.price_quarterly;
      case "yearly": return plan.price_yearly;
      case "lifetime": return plan.price_lifetime;
    }
  };

  const getPeriod = () => {
    switch (cycle) {
      case "monthly": return "/mo";
      case "quarterly": return "/qtr";
      case "yearly": return "/yr";
      case "lifetime": return "";
    }
  };

  const displayPlans = loading ? [] : plans;

  return (
    <section id="pricing" className="py-28 lg:py-36 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse,hsla(243,75%,60%,0.04),transparent_70%)] pointer-events-none" />
      
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-5">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Start free forever, upgrade when you're ready.
          </p>

          <div className="flex items-center justify-center gap-1 p-1 bg-card/50 border border-border/50 rounded-xl w-fit mx-auto mt-8 backdrop-blur-sm">
            {(Object.keys(cycleLabels) as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                  cycle === c
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cycleLabels[c]}
                {cycleSavings[c] && (
                  <span className={`ml-1.5 text-[9px] font-semibold ${cycle === c ? "text-primary-foreground/80" : "text-primary"}`}>
                    {cycleSavings[c]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-5 lg:gap-6 max-w-[1100px] mx-auto ${displayPlans.length <= 3 ? "md:grid-cols-3" : displayPlans.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            {displayPlans.map((plan, i) => {
              const isFree = plan.is_free;
              const popular = !isFree && i === 2;
              return (
                <motion.div
                  key={plan.slug}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className={`relative rounded-2xl p-6 lg:p-7 transition-all duration-300 group flex flex-col h-full ${
                    popular
                      ? "landing-card-glass border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20"
                      : "landing-card-glass"
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </div>
                  )}
                  {isFree && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-success text-white text-xs font-semibold shadow-lg shadow-success/25">
                      Forever Free
                    </div>
                  )}
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <div className="mt-6 mb-6">
                    {isFree ? (
                      <>
                        <span className="text-4xl font-extrabold text-success">Free</span>
                        <span className="text-sm text-muted-foreground ml-1">forever</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-foreground">{formatPrice(getPrice(plan))}</span>
                        <span className="text-sm text-muted-foreground">{getPeriod()}</span>
                        {cycle === "lifetime" && (
                          <p className="text-xs text-primary font-medium mt-1">One-time payment</p>
                        )}
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-7 flex-1">
                    {[
                      { val: plan.max_users, label: "Users" },
                      { val: plan.max_companies, label: "Companies" },
                      { val: plan.max_employees, label: "Employees" },
                      { val: plan.max_invoices, label: "Invoices/mo" },
                      { val: plan.max_deals, label: "Deals" },
                      { val: plan.max_documents, label: "Documents" },
                      { val: plan.max_projects, label: "Projects" },
                    ].filter(l => l.val !== undefined && l.val !== null).map((l) => (
                      <li key={l.label} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        {l.val === -1 ? "Unlimited" : l.val} {l.label}
                      </li>
                    ))}
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-success/10">
                          <Check className="h-3 w-3 text-success" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={`group/btn block w-full text-center py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isFree
                        ? "bg-success text-white hover:bg-success/90 shadow-lg shadow-success/20 hover:shadow-xl hover:-translate-y-0.5"
                        : popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5"
                        : "border border-border text-foreground hover:bg-card hover:border-primary/30"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isFree ? "Get Started Free" : "Start Free Trial"}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link to="/pricing" className="text-sm font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors">
            Compare all plans in detail <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
