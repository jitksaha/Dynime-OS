import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
  Megaphone,
  ShoppingCart,
  CalendarCheck,
  Brain,
  Globe,
  Truck,
  ShieldCheck,
} from "lucide-react";

const modules = [
  { icon: BarChart3, name: "CRM", desc: "Pipeline, deals, contacts", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { icon: Users, name: "HRM", desc: "Employees, payroll, leave", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: CreditCard, name: "Accounting", desc: "Invoices, expenses, tax", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: MessageSquare, name: "Chat", desc: "Team messaging, calls", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: FileText, name: "Documents", desc: "Create, sign, store", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Megaphone, name: "Marketing", desc: "Campaigns, email, social", color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: ShoppingCart, name: "POS", desc: "Point of sale, inventory", color: "text-teal-500", bg: "bg-teal-500/10" },
  { icon: CalendarCheck, name: "Projects", desc: "Tasks, timelines, OKRs", color: "text-orange-500", bg: "bg-orange-500/10" },
  { icon: Brain, name: "AI Assistant", desc: "Smart automation, insights", color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: Globe, name: "Website Builder", desc: "Landing pages, funnels", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: Truck, name: "Logistics", desc: "Fleet, routes, tracking", color: "text-lime-500", bg: "bg-lime-500/10" },
  { icon: ShieldCheck, name: "Compliance", desc: "Audit, KYC, security", color: "text-slate-500", bg: "bg-slate-500/10" },
];

export function ModuleShowcase() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Everything included
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            50+ modules.{" "}
            <span className="text-gradient-hero">One platform.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            Activate only what you need. Add more as you grow. No per-module pricing.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <Link
                to={`/features/${mod.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="group hover-glow flex items-start gap-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 h-full transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${mod.bg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                  <mod.icon className={`w-5 h-5 ${mod.color}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">
                    {mod.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/features"
            className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            View all modules →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
