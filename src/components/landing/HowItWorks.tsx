import { motion } from "framer-motion";
import { UserPlus, Puzzle, Zap, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "1. Sign up in 30 seconds",
    desc: "Create your account, pick your modules, and invite your team. No credit card required.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Puzzle,
    title: "2. Configure your workspace",
    desc: "Customize roles, workflows, and branding. Our setup wizard guides you through every step.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Zap,
    title: "3. Import your data",
    desc: "Migrate from spreadsheets or existing tools in one click. We support CSV, API, and direct integrations.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: TrendingUp,
    title: "4. Watch your business grow",
    desc: "Get real-time dashboards, AI insights, and automated reports. Focus on growth, not admin work.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Get started in{" "}
            <span className="text-gradient-hero">minutes</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            Four simple steps to transform how your business operates.
          </p>
        </motion.div>

        <div className="timeline-connector grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="relative text-center"
            >
              {/* Step number badge */}
              <div className="relative inline-flex mb-5">
                <div
                  className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center`}
                >
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
                {/* Connecting dot (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-[calc(50%+0.75rem)] w-[calc(100%-1.5rem)] h-0.5 bg-gradient-to-r from-primary/30 to-transparent translate-x-1/2" />
                )}
              </div>

              <h3 className="font-semibold text-foreground text-sm lg:text-base">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
