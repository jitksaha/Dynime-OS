import { motion } from "framer-motion";
import { Boxes, Brain, Shield, Zap } from "lucide-react";

const props = [
  {
    icon: Boxes,
    title: "All-in-One Platform",
    desc: "50+ integrated business modules — CRM, HRM, Accounting, Projects, and more. No more juggling 10 different tools.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Brain,
    title: "AI-Powered Automation",
    desc: "Smart workflows, predictive analytics, and AI assistants handle repetitive work so your team focuses on growth.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    desc: "SOC 2 compliant, end-to-end encryption, role-based access control, and audit logs. Your data is safe with us.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Lightning Fast Setup",
    desc: "Go live in days, not months. Pre-built templates, one-click module activation, and guided onboarding.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export function ValueProps() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Why businesses choose{" "}
            <span className="brand-display">Dynime OS</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            Everything you need to run a modern business, in one beautifully designed platform.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {props.map((prop, i) => (
            <motion.div
              key={prop.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="group hover-glow rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 lg:p-8 flex flex-col gap-4 cursor-default"
            >
              <div
                className={`w-11 h-11 rounded-xl ${prop.bg} flex items-center justify-center`}
              >
                <prop.icon className={`w-5 h-5 ${prop.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base lg:text-lg">
                  {prop.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {prop.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
