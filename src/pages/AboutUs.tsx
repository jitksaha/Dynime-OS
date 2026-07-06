import { useRef } from "react";
import { Link } from "react-router-dom";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { ModuleGrid } from "@/components/landing/ModuleGrid";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Rocket, Globe, Zap, Heart, Shield, Target, ArrowRight,
  Code2, Lightbulb, TrendingUp, Award, Sparkles
} from "lucide-react";
import aboutHero from "@/assets/about-hero-pattern.jpg";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useSEO } from "@/hooks/useSEO";

const VALUES = [
  { icon: Rocket, title: "Ship Fast", desc: "We believe speed of execution is a competitive advantage. Move quickly, iterate relentlessly.", color: "hsl(243,75%,58%)" },
  { icon: Heart, title: "Customer Obsession", desc: "Every decision starts with the customer. Their success is our success.", color: "hsl(340,82%,52%)" },
  { icon: Shield, title: "Trust & Security", desc: "Enterprise-grade security isn't optional — it's foundational to everything we build.", color: "hsl(142,71%,45%)" },
  { icon: Lightbulb, title: "Radical Simplicity", desc: "Complex problems deserve simple solutions. We ruthlessly eliminate unnecessary complexity.", color: "hsl(38,92%,50%)" },
  { icon: Code2, title: "Craft & Quality", desc: "We're builders who care about the details. Every pixel, every API, every interaction matters.", color: "hsl(199,89%,48%)" },
  { icon: Globe, title: "Global by Default", desc: "Built for businesses worldwide — multi-currency, multi-language, multi-everything.", color: "hsl(270,80%,60%)" },
];

const STATS = [
  { value: "10K+", label: "Businesses Trust Us" },
  { value: "50+", label: "Countries Served" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "2M+", label: "Tasks Automated" },
];

const TIMELINE = [
  { year: "2023", title: "The Spark", desc: "Founded with a vision to democratize enterprise software for growing businesses." },
  { year: "2024", title: "Rapid Growth", desc: "Launched core modules — HRM, CRM, Accounting. First 1,000 customers onboarded." },
  { year: "2025", title: "Platform Expansion", desc: "AI-powered features, POS, universal SSO, and 50+ integrations shipped." },
  { year: "2026", title: "Global Scale", desc: "Serving businesses in 50+ countries with full localization and compliance." },
];

const TEAM = [
  { name: "Alex Chen", role: "CEO & Co-Founder", avatar: "AC", color: "hsl(243,75%,58%)" },
  { name: "Sarah Miller", role: "CTO & Co-Founder", avatar: "SM", color: "hsl(340,82%,52%)" },
  { name: "Rafi Ahmed", role: "Head of Product", avatar: "RA", color: "hsl(142,71%,45%)" },
  { name: "Emily Park", role: "Head of Design", avatar: "EP", color: "hsl(199,89%,48%)" },
  { name: "David Kim", role: "VP Engineering", avatar: "DK", color: "hsl(38,92%,50%)" },
  { name: "Priya Sharma", role: "Head of Growth", avatar: "PS", color: "hsl(270,80%,60%)" },
];

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export default function AboutUs() {
  const { appInfo } = useAppInfo();
  useSEO();

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-[#06060e] text-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        {/* Background */}
        <motion.div style={{ y: heroY }} className="absolute inset-0 z-0">
          <img src={aboutHero} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06060e]/40 via-[#06060e]/80 to-[#06060e]" />
        </motion.div>

        {/* Floating orbs */}
        <div className="absolute top-20 left-[15%] w-72 h-72 rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 rounded-full bg-purple-500/8 blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Our Story
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Building the OS for{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Modern Business
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            We believe every growing business deserves the tools that used to be reserved for enterprises.
            One platform. Every department. Zero friction.
          </motion.p>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <AnimatedSection>
        <div className="max-w-6xl mx-auto px-6 -mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 text-center hover:border-primary/30 transition-colors duration-500">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-sm text-white/40 mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Mission Section */}
      <AnimatedSection className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 block">Our Mission</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6">
                Simplify operations so you can focus on what matters
              </h2>
              <p className="text-white/50 leading-relaxed mb-6">
                Too many businesses juggle 10+ disconnected tools — one for HR, another for invoicing,
                yet another for CRM. We built {appInfo.app_name} to replace that chaos with a single,
                beautifully designed platform that just works.
              </p>
              <p className="text-white/50 leading-relaxed">
                From a 5-person startup to a 500-person enterprise, our platform scales with you.
                AI-powered automation handles the busywork. You handle the strategy.
              </p>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Target, label: "All-in-One", val: "20+ Modules" },
                  { icon: Zap, label: "AI-Powered", val: "Smart Automation" },
                  { icon: TrendingUp, label: "Scalable", val: "5 to 5,000+" },
                  { icon: Award, label: "Secure", val: "SOC2 Ready" },
                ].map((item, i) => (
                  <motion.div key={item.label} whileHover={{ scale: 1.03 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-primary/20 transition-all duration-300">
                    <item.icon className="h-5 w-5 text-primary mb-3" />
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{item.val}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Values */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <AnimatedSection className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 block">What Drives Us</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Our Core Values</h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUES.map((v, i) => (
              <AnimatedSection key={v.title}>
                <motion.div whileHover={{ y: -4 }}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 h-full hover:border-white/10 transition-all duration-500">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: v.color + "15" }}>
                    <v.icon className="h-5 w-5" style={{ color: v.color }} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{v.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{v.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <AnimatedSection className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 block">Our Journey</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">From Idea to Impact</h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

            <div className="space-y-12">
              {TIMELINE.map((t, i) => (
                <motion.div key={t.year} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`relative flex items-start gap-6 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} md:text-${i % 2 === 0 ? "right" : "left"}`}>
                  {/* Content */}
                  <div className={`flex-1 pl-14 md:pl-0 ${i % 2 === 0 ? "md:pr-12" : "md:pl-12"}`}>
                    <span className="text-primary font-bold text-sm">{t.year}</span>
                    <h3 className="text-lg font-semibold text-white mt-1">{t.title}</h3>
                    <p className="text-sm text-white/40 mt-1">{t.desc}</p>
                  </div>

                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 w-5 h-5 rounded-full border-2 border-primary bg-[#06060e] z-10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>

                  {/* Spacer for other side */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Team */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.02] to-transparent" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <AnimatedSection className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 block">The Team</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Meet the Builders</h2>
            <p className="text-white/40 mt-3 max-w-lg mx-auto">
              A team of engineers, designers, and operators obsessed with making business software delightful.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TEAM.map((m, i) => (
              <AnimatedSection key={m.name}>
                <motion.div whileHover={{ y: -4 }}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center hover:border-white/10 transition-all duration-500">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110"
                    style={{ backgroundColor: m.color + "15", color: m.color }}>
                    {m.avatar}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{m.role}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <AnimatedSection className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-purple-500/[0.05] p-12 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-purple-500/10 blur-[80px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Ready to simplify your business?</h2>
              <p className="text-white/50 max-w-lg mx-auto mb-8">
                Join thousands of businesses that have replaced 10+ tools with one powerful platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/signup"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/contact"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-white/10 text-white/80 font-semibold text-sm hover:bg-white/5 transition-colors">
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <ModuleGrid
        eyebrow="What we ship"
        title="Built one module at a time"
        description="Every capability in our platform is shaped by real customer feedback. Here's the full toolkit you'll get from day one."
      />

      <PublicFooter />
    </div>
  );
}
