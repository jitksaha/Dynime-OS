import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CalendarCheck, Users, MessageSquare, CreditCard, Globe } from "lucide-react";

interface FeatureRow {
  tag: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  features: string[];
  link: string;
}

const rows: FeatureRow[] = [
  {
    tag: "CRM & Sales",
    title: "Close deals faster with AI-powered CRM",
    description:
      "Track leads, automate follow-ups, and get deal-scoring insights. Your sales team will love the pipeline view and smart reminders.",
    icon: BarChart3,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    features: ["AI lead scoring", "Email sequences", "Deal pipeline", "Meeting scheduler"],
    link: "/features/crm",
  },
  {
    tag: "HR & Payroll",
    title: "Manage your team from hire to retire",
    description:
      "Onboarding, attendance, leave, payroll, and performance reviews — all in one place. Employees get a self-service portal too.",
    icon: Users,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    features: ["Employee database", "Attendance tracking", "Payroll automation", "Self-service portal"],
    link: "/features/hrm",
  },
  {
    tag: "Finance",
    title: "Real-time financial visibility",
    description:
      "Invoicing, expenses, payments, and tax compliance. Connect your bank and get automated reconciliation and P&L reports.",
    icon: CreditCard,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    features: ["Smart invoicing", "Expense management", "Bank reconciliation", "Tax reports"],
    link: "/features/accounting",
  },
  {
    tag: "Communication",
    title: "Keep everyone in sync",
    description:
      "Built-in team chat, announcements, video meetings, and client portal. Reduce tool sprawl with integrated communication.",
    icon: MessageSquare,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    features: ["Team chat", "Video meetings", "Announcements", "Client portal"],
    link: "/features/chat",
  },
];

export function ProductDemo() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8 section-alt">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Platform Overview
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Everything your business needs
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            Explore the core modules that power thousands of businesses every day.
          </p>
        </motion.div>

        <div className="space-y-24 lg:space-y-32">
          {rows.map((row, i) => {
            const isReversed = i % 2 === 1;
            return (
              <motion.div
                key={row.tag}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                  isReversed ? "lg:direction-rtl" : ""
                }`}
              >
                {/* Text side */}
                <div className={isReversed ? "lg:order-2" : ""}>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-4">
                    {row.tag}
                  </span>
                  <h3 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight leading-tight">
                    {row.title}
                  </h3>
                  <p className="mt-4 text-muted-foreground leading-relaxed text-base lg:text-lg">
                    {row.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {row.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-foreground/80">
                        <div className={`w-5 h-5 rounded-full ${row.bg} flex items-center justify-center flex-shrink-0`}>
                          <div className={`w-2 h-2 rounded-full ${row.color.replace("text-", "bg-")}`} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={row.link}
                    className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Explore {row.tag.split(" & ")[0]}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Visual side */}
                <div className={isReversed ? "lg:order-1" : ""}>
                  <div className="relative">
                    {/* Decorative card mockup */}
                    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-xl">
                      {/* Fake app chrome */}
                      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/40">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                        <span className="ml-3 text-[11px] text-muted-foreground font-medium">
                          {row.tag}
                        </span>
                      </div>

                      {/* Fake content rows */}
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((r) => (
                          <div key={r} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${row.bg} flex items-center justify-center flex-shrink-0`}>
                              <row.icon className={`w-4 h-4 ${row.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="h-2.5 rounded-full bg-muted w-3/4" />
                              <div className="h-2 rounded-full bg-muted/60 w-1/2 mt-1.5" />
                            </div>
                            <div className="h-6 w-16 rounded-full bg-muted/40" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Floating badge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 }}
                      className="absolute -bottom-4 -right-4 bg-card border border-border/60 rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          Real-time sync
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
