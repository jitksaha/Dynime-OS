import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Target, Receipt, Headphones, FolderKanban,
  Megaphone, GitBranch, FileText, BarChart3,
  ArrowRight, ChevronLeft, ChevronRight,
  MessageSquare, ShoppingCart, Calendar, Wallet, Percent,
} from "lucide-react";
import { Link } from "react-router-dom";

const products = [
  {
    id: "hrms", label: "HRM", icon: Users, color: "hsl(243,75%,58%)",
    headline: "AI-driven employee management",
    desc: "Manage your entire workforce — from attendance to payroll to performance reviews. Smart automation reduces manual work by 60%.",
    features: ["Employee onboarding", "Attendance tracking", "Payroll processing", "Leave management", "Performance reviews", "Recruitment pipeline"],
    path: "/features/hrms",
  },
  {
    id: "crm", label: "CRM", icon: Target, color: "hsl(142,71%,45%)",
    headline: "Close more deals, faster",
    desc: "Automate your sales pipeline with intuitive deal tracking, contact management, and AI-powered insights that convert leads to revenue.",
    features: ["Deal pipeline", "Contact management", "Lead scoring", "Follow-up automation", "Sales analytics", "Email integration"],
    path: "/features/crm",
  },
  {
    id: "accounting", label: "Accounting", icon: Receipt, color: "hsl(38,92%,50%)",
    headline: "Complete financial control",
    desc: "From invoicing to expense tracking — get a real-time view of your financial health with automated reports and smart categorization.",
    features: ["Invoice generation", "Expense tracking", "Payment management", "Financial reports", "Tax compliance", "Multi-currency support"],
    path: "/features/accounting",
  },
  {
    id: "projects", label: "Projects", icon: FolderKanban, color: "hsl(200,80%,55%)",
    headline: "Ship projects on time",
    desc: "Plan, execute, and deliver projects with Kanban boards, Gantt charts, and real-time collaboration tools your team will love.",
    features: ["Kanban boards", "Task management", "Team collaboration", "Milestone tracking", "Time tracking", "Resource allocation"],
    path: "/features/projects",
  },
  {
    id: "marketing", label: "Marketing", icon: Megaphone, color: "hsl(270,80%,60%)",
    headline: "Campaigns that convert",
    desc: "Design, launch, and analyze marketing campaigns across channels. Track engagement, optimize spend, and grow your audience effortlessly.",
    features: ["Campaign builder", "Email marketing", "Audience segmentation", "A/B testing", "Analytics dashboard", "Template library"],
    path: "/features/marketing",
  },
  {
    id: "helpdesk", label: "Helpdesk", icon: Headphones, color: "hsl(0,72%,55%)",
    headline: "Support that delights",
    desc: "Resolve tickets faster with smart routing, SLA tracking, and a self-service knowledge base — all from one unified inbox.",
    features: ["Ticket management", "SLA tracking", "Knowledge base", "Auto-routing", "Customer portal", "Satisfaction surveys"],
    path: "/features/helpdesk",
  },
  {
    id: "workflows", label: "Workflows", icon: GitBranch, color: "hsl(170,70%,42%)",
    headline: "Automate everything",
    desc: "Build powerful automation flows with a visual drag-and-drop builder. Eliminate repetitive tasks and let your processes run on autopilot.",
    features: ["Visual flow builder", "Trigger actions", "Conditional logic", "Multi-step approvals", "Webhook integrations", "Scheduled tasks"],
    path: "/features/workflows",
  },
  {
    id: "documents", label: "Documents", icon: FileText, color: "hsl(210,60%,50%)",
    headline: "All files, one place",
    desc: "Store, organize, and share documents securely. Version control, access permissions, and full-text search keep your team in sync.",
    features: ["File storage", "Version control", "Folder organization", "Access permissions", "Full-text search", "Secure sharing"],
    path: "/features/documents",
  },
  {
    id: "reports", label: "Reports", icon: BarChart3, color: "hsl(290,65%,55%)",
    headline: "Insights at a glance",
    desc: "Build custom dashboards and generate detailed reports across every module. Make data-driven decisions with real-time analytics.",
    features: ["Custom dashboards", "Scheduled reports", "Cross-module analytics", "Export to PDF/Excel", "KPI tracking", "Trend analysis"],
    path: "/features/reports",
  },
  {
    id: "team-chat", label: "Team Chat", icon: MessageSquare, color: "hsl(270,80%,60%)",
    headline: "Real-time team communication",
    desc: "Keep everyone connected with instant messaging, channels, emoji reactions, and live presence — no more scattered email threads.",
    features: ["Group channels", "Direct messages", "Emoji reactions", "Live presence", "Message search", "File sharing"],
    path: "/features/team-chat",
  },
  {
    id: "pos", label: "Point of Sale", icon: ShoppingCart, color: "hsl(38,92%,50%)",
    headline: "Sell smarter, ship faster",
    desc: "A complete POS with inventory management, order tracking, and integrated courier dispatch — from checkout to doorstep.",
    features: ["POS terminal", "Inventory tracking", "Order management", "Courier integration", "Sales analytics", "Multi-payment"],
    path: "/features/pos",
  },
  {
    id: "calendar", label: "Calendar", icon: Calendar, color: "hsl(199,89%,48%)",
    headline: "Your schedule, unified",
    desc: "A smart calendar syncing events across CRM, HR, and projects. Day, week, and month views with Google Calendar integration.",
    features: ["Multi-view calendar", "Google sync", "Team scheduling", "Smart reminders", "Recurring events", "Module integration"],
    path: "/features/calendar",
  },
  {
    id: "wallet", label: "Wallet", icon: Wallet, color: "hsl(142,71%,45%)",
    headline: "Payments made simple",
    desc: "Built-in digital wallet for companies and customers — top-up, pay, automate recurring charges, and track every transaction.",
    features: ["Wallet balance", "Saved methods", "Auto payments", "Transaction history", "Multi-currency", "Instant settlements"],
    path: "/features/wallet",
  },
  {
    id: "tax", label: "Tax Compliance", icon: Percent, color: "hsl(0,72%,55%)",
    headline: "Stay compliant, everywhere",
    desc: "Automated tax calculations, country profiles, and compliance tracking for VAT, GST, and sales tax across jurisdictions.",
    features: ["Tax dashboard", "Country profiles", "Rate manager", "Compliance tracker", "Tax calculator", "Code importer"],
    path: "/features/tax-compliance",
  },
];

export function FeatureShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const active = products[currentIndex];

  const goNext = useCallback(() => setCurrentIndex((i) => (i + 1) % products.length), []);
  const goPrev = useCallback(() => setCurrentIndex((i) => (i - 1 + products.length) % products.length), []);

  return (
    <section id="services" className="py-28 lg:py-36 relative">
      {/* Background accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-16 gap-6"
        >
          <div className="text-center sm:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-5">
              Product Suite
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
              Powerful tools for{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                every team
              </span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground max-w-[580px]">
              Each product solves departmental needs, and together they power seamless operations.
            </p>
          </div>

          <div className="flex items-center gap-3 self-center sm:self-auto shrink-0">
            <button
              onClick={goPrev}
              className="h-11 w-11 rounded-full border border-border bg-card/50 hover:bg-card flex items-center justify-center transition-all duration-200 hover:border-primary/30"
              aria-label="Previous product"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-sm font-medium text-muted-foreground tabular-nums min-w-[3.5rem] text-center">
              {currentIndex + 1} / {products.length}
            </span>
            <button
              onClick={goNext}
              className="h-11 w-11 rounded-full border border-border bg-card/50 hover:bg-card flex items-center justify-center transition-all duration-200 hover:border-primary/30"
              aria-label="Next product"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Pill indicators */}
        <div className="flex items-center justify-center gap-1.5 mb-12 overflow-x-auto pb-2 scrollbar-hide">
          {products.map((product, i) => (
            <button
              key={product.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0 ${
                i === currentIndex
                  ? "landing-card-glass text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <product.icon className="h-3.5 w-3.5 shrink-0" style={i === currentIndex ? { color: product.color } : undefined} />
              <span className="hidden sm:inline">{product.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                  style={{ backgroundColor: active.color + "12", color: active.color }}
                >
                  <active.icon className="h-3.5 w-3.5" />
                  {active.label}
                </div>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-tight">
                  {active.headline}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed mb-8">
                  {active.desc}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {active.features.map((feat, i) => (
                    <motion.div
                      key={feat}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2.5"
                    >
                      <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: active.color + "15" }}>
                        <span className="text-xs" style={{ color: active.color }}>✓</span>
                      </div>
                      <span className="text-sm text-foreground/80">{feat}</span>
                    </motion.div>
                  ))}
                </div>
                <Link
                  to={active.path}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 group shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  style={{ backgroundColor: active.color }}
                >
                  Learn More
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Product mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-border/60 landing-card-glass overflow-hidden shadow-2xl"
              >
                <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40 bg-card/20">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/60" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono ml-2">app/{active.id}</span>
                </div>
                <div className="p-5 space-y-3">
                  {active.features.slice(0, 5).map((feat, i) => (
                    <motion.div
                      key={feat}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-background/20 hover:border-primary/20 transition-all"
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: active.color + "12" }}
                      >
                        <span className="text-sm font-bold" style={{ color: active.color }}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{feat}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: active.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${70 + i * 5}%` }}
                            transition={{ delay: i * 0.1 + 0.3 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-border/40 bg-card/10 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">All modules sync in real-time</span>
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
