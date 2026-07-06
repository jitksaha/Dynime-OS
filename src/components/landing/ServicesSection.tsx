import { Link } from "react-router-dom";
import {
  Users, Target, Megaphone, GitBranch, Receipt, Headphones,
  FolderKanban, FileText, BarChart3, ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

const services = [
  { icon: Users, title: "HRMS", desc: "Employee management, attendance, payroll, leave tracking, recruitment & performance reviews.", path: "/features/hrms", color: "hsl(243,75%,58%)" },
  { icon: Target, title: "CRM", desc: "Sales pipeline, deal tracking, contact management & customer relationship tools.", path: "/features/crm", color: "hsl(142,71%,45%)" },
  { icon: Megaphone, title: "Marketing", desc: "Campaign automation, email templates, analytics & multi-channel outreach.", path: "/features/marketing", color: "hsl(270,80%,60%)" },
  { icon: GitBranch, title: "Workflows", desc: "Visual drag & drop automation builder with triggers, conditions & actions.", path: "/features/workflows", color: "hsl(38,92%,50%)" },
  { icon: Receipt, title: "Accounting", desc: "Invoicing, expense tracking, payment management & financial reporting.", path: "/features/accounting", color: "hsl(199,89%,48%)" },
  { icon: Headphones, title: "Helpdesk", desc: "Ticket management, SLA tracking, knowledge base & customer support.", path: "/features/helpdesk", color: "hsl(0,72%,55%)" },
  { icon: FolderKanban, title: "Projects", desc: "Task boards, Gantt charts, team collaboration & milestone tracking.", path: "/features/projects", color: "hsl(200,80%,55%)" },
  { icon: FileText, title: "Documents", desc: "Centralized file storage, version control & document sharing.", path: "/features/documents", color: "hsl(38,92%,50%)" },
  { icon: BarChart3, title: "Reports", desc: "Business intelligence dashboards, custom reports & data visualization.", path: "/features/reports", color: "hsl(290,65%,55%)" },
];

export function ServicesSection() {
  return (
    <section className="py-28 lg:py-36 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-5">
            All Modules
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Everything you need, in one place
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
            Choose the modules that fit your business. Upgrade or add more anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                to={s.path}
                className="group relative flex gap-4 p-5 rounded-2xl landing-card-glass transition-all duration-300 h-full hover:-translate-y-1"
              >
                <div
                  className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: s.color + "12" }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
