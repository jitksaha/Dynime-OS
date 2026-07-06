import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    desc: "Perfect for small teams getting started.",
    cta: "Start Free Trial",
    link: "/signup",
    highlighted: false,
    features: [
      "Up to 10 users",
      "Core modules (CRM, HRM, Accounting)",
      "5 GB storage",
      "Email support",
      "Basic analytics",
      "Mobile app access",
    ],
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    desc: "For growing companies that need full power.",
    cta: "Start Free Trial",
    link: "/signup",
    highlighted: true,
    features: [
      "Up to 50 users",
      "All 50+ modules",
      "50 GB storage",
      "Priority support",
      "Advanced analytics & AI",
      "API access & webhooks",
      "Custom branding",
      "SSO & 2FA",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large organizations with custom needs.",
    cta: "Talk to Sales",
    link: "/contact",
    highlighted: false,
    features: [
      "Unlimited users",
      "All modules + custom modules",
      "Unlimited storage",
      "Dedicated account manager",
      "Custom AI model training",
      "White-label option",
      "SLA guarantee",
      "On-premise deployment",
    ],
  },
];

export function PricingTiers({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Simple Pricing
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Start free, scale as you{" "}
            <span className="text-gradient-hero">grow</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            No hidden fees. No per-module pricing. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 lg:p-8 flex flex-col ${
                tier.highlighted
                  ? "pricing-highlight-ring border-primary/30 bg-card shadow-xl scale-[1.02] lg:scale-105"
                  : "border-border/50 bg-card/60"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {tier.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground tracking-tight">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-muted-foreground text-sm ml-1">
                    {tier.period}
                  </span>
                )}
              </div>

              <Link
                to={isLoggedIn ? "/dashboard" : tier.link}
                className={`inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-accent text-foreground hover:bg-accent/80"
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>

              <ul className="mt-8 space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
