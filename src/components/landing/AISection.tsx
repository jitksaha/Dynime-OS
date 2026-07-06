"use client";

import { motion } from "framer-motion";
import {
  Brain,
  MessageSquare,
  FileText,
  TrendingUp,
  ShieldCheck,
  LineChart,
  Workflow,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const aiFeatures = [
  {
    icon: Brain,
    title: "AI Copilot",
    desc: "Natural language command bar — generate reports, create records, and get instant answers across all modules.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    link: "/features/ai",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    desc: "Conversational AI that understands your business. Ask questions, draft emails, analyze data — all in plain English.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    link: "/features/ai",
  },
  {
    icon: FileText,
    title: "Smart Document Generation",
    desc: "Auto-generate contracts, proposals, policies, and reports with AI that learns your business context.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    link: "/features/ai",
  },
  {
    icon: TrendingUp,
    title: "Deal Scoring & Churn Detection",
    desc: "AI predicts which deals are likely to close and flags at-risk customers before they leave — with recommended actions.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    link: "/features/ai",
  },
  {
    icon: LineChart,
    title: "Business Intelligence",
    desc: "Automated P&L analysis, cash flow forecasting, expense categorization, and anomaly detection across your financials.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    link: "/features/ai",
  },
  {
    icon: Workflow,
    title: "AI Workflow Automation",
    desc: "Create smart workflows triggered by natural language — \"Notify sales when a lead goes cold\" — and AI handles the rest.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    link: "/features/ai",
  },
  {
    icon: ShieldCheck,
    title: "Threat & Anomaly Detection",
    desc: "AI continuously monitors audit logs, login patterns, and transactions to flag suspicious activity in real time.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    link: "/features/ai",
  },
  {
    icon: Sparkles,
    title: "Invoice & Receipt Intelligence",
    desc: "Auto-categorize expenses, extract line items from receipts, and generate invoice summaries with AI precision.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    link: "/features/ai",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: "easeOut" },
  }),
};

export function AISection() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 hero-gradient-mesh pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5 text-sm font-medium text-primary mb-5">
            <Brain className="w-3.5 h-3.5" />
            Powered by AI
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            AI that works the way{" "}
            <span className="brand-display">you</span> do
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            Every module in Dynime OS is infused with intelligence — from your CRM pipeline to your expense reports.
          </p>
        </motion.div>

        {/* 2-column grid with proper tile spacing */}
        <div className="grid sm:grid-cols-2 gap-5 lg:gap-6 max-w-4xl mx-auto">
          {aiFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={cardVariants}
            >
              <Link
                to={feature.link}
                className="ai-card-tile group flex items-start gap-5 rounded-2xl p-6 lg:p-7 h-full"
              >
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
                >
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground text-sm lg:text-base mb-1.5 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/features/ai"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Explore all AI features <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
