import { Link } from "react-router-dom";
import { ArrowRight, Check, LucideIcon, Play, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useAppInfo } from "@/hooks/useAppInfo";
import { RelatedModulesSection } from "@/components/landing/RelatedModulesSection";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface DetailSection {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  points: string[];
}

interface Stat {
  value: string;
  label: string;
}

interface FAQ {
  q: string;
  a: string;
}

interface FeaturePageLayoutProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  features: Feature[];
  benefits: string[];
  ctaText?: string;
  detailSections?: DetailSection[];
  stats?: Stat[];
  useCases?: { title: string; description: string; icon: LucideIcon }[];
  faqs?: FAQ[];
  heroIllustration?: React.ReactNode;
}

export default function FeaturePageLayout({
  title,
  subtitle,
  description,
  icon: Icon,
  gradient,
  features,
  benefits,
  ctaText = "Start Free Trial",
  detailSections = [],
  stats = [],
  useCases = [],
  faqs = [],
  heroIllustration,
}: FeaturePageLayoutProps) {
  const { appInfo } = useAppInfo();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroBgY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  // Sub-nav sections
  const navItems = [
    { id: "features", label: "Features" },
    ...(detailSections.length > 0 ? [{ id: "deep-dive", label: "Deep Dive" }] : []),
    ...(stats.length > 0 ? [{ id: "stats", label: "Impact" }] : []),
    ...(useCases.length > 0 ? [{ id: "use-cases", label: "Use Cases" }] : []),
    { id: "benefits", label: "Benefits" },
    ...(faqs.length > 0 ? [{ id: "faq", label: "FAQ" }] : []),
  ];

  const [activeSection, setActiveSection] = useState("features");
  const [navSticky, setNavSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const nav = document.getElementById("feature-subnav");
      if (nav) {
        const rect = nav.getBoundingClientRect();
        setNavSticky(rect.top <= 0);
      }

      // Track active section
      for (const item of [...navItems].reverse()) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navItems.length]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden border-b border-border min-h-[55vh] flex items-center">
        <motion.div className="absolute inset-0" style={{ y: heroBgY }}>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
          <motion.div
            className="absolute top-[-30%] left-[15%] w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[120px]"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[-20%] right-[10%] w-[400px] h-[400px] rounded-full bg-accent/[0.03] blur-[100px]"
            animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <motion.div style={{ y: heroTextY, opacity: heroOpacity }} className="relative w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className={`${heroIllustration ? "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" : ""}`}>
            <div className={`${heroIllustration ? "text-left" : "text-center max-w-[700px] mx-auto"}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6"
              >
                <Icon className="h-3.5 w-3.5" />
                {subtitle}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[32px] sm:text-5xl lg:text-[56px] font-extrabold text-foreground leading-[1.1] tracking-tight"
              >
                {title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className={`mt-5 text-lg text-muted-foreground leading-relaxed ${heroIllustration ? "max-w-[480px]" : "max-w-[560px] mx-auto"}`}
              >
                {description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className={`flex flex-col sm:flex-row items-${heroIllustration ? "start" : "center"} ${heroIllustration ? "" : "justify-center"} gap-3 mt-8`}
              >
                <Link
                  to={isLoggedIn ? "/dashboard" : "/signup"}
                  className="group w-full sm:w-auto px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 border border-primary/80 hover:shadow-lg hover:shadow-primary/20"
                >
                  {isLoggedIn ? "Go to Dashboard" : ctaText}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/pricing"
                  className="w-full sm:w-auto px-6 py-3 rounded-md border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors text-center"
                >
                  View Pricing
                </Link>
              </motion.div>
            </div>

            {/* Hero Illustration */}
            {heroIllustration && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="hidden lg:block"
              >
                <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden p-1">
                  {heroIllustration}
                </div>
                <div className="mx-auto w-[70%] h-8 bg-primary/8 blur-[20px] rounded-full -mt-4" />
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Sub-Nav: centered on desktop, swipeable on mobile */}
      <div id="feature-subnav" className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 lg:justify-center snap-x snap-mandatory">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 snap-start ${
                  activeSection === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 scroll-mt-16">
        <SectionHeader badge="Features" title="Key Features" desc="Everything you need to streamline your operations." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Deep Dive: Detailed Sections */}
      {detailSections.length > 0 && (
        <section id="deep-dive" className="scroll-mt-16">
          {detailSections.map((section, idx) => (
            <div
              key={section.id}
              className={`py-20 lg:py-24 ${idx % 2 === 1 ? "bg-muted/30" : ""} border-t border-border`}
            >
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${idx % 2 === 1 ? "lg:direction-rtl" : ""}`}>
                  {/* Content side */}
                  <motion.div
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -24 : 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5 }}
                    className={idx % 2 === 1 ? "lg:order-2" : ""}
                  >
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
                      style={{ backgroundColor: section.color + "15", color: section.color }}
                    >
                      <section.icon className="h-3.5 w-3.5" />
                      {section.label}
                    </div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-tight">
                      {section.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed mb-8">
                      {section.description}
                    </p>
                    <div className="space-y-3">
                      {section.points.map((point, pi) => (
                        <motion.div
                          key={point}
                          initial={{ opacity: 0, x: -12 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: pi * 0.06 }}
                          className="flex items-start gap-3"
                        >
                          <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: section.color + "15" }}>
                            <Check className="h-3 w-3" style={{ color: section.color }} />
                          </div>
                          <span className="text-sm text-foreground">{point}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Visual mockup side */}
                  <motion.div
                    initial={{ opacity: 0, x: idx % 2 === 0 ? 24 : -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={`rounded-2xl border border-border bg-card overflow-hidden shadow-xl ${idx % 2 === 1 ? "lg:order-1" : ""}`}
                  >
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                      <div className="flex gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-destructive/50" />
                        <span className="h-3 w-3 rounded-full bg-warning/50" />
                        <span className="h-3 w-3 rounded-full bg-success/50" />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono ml-2">{section.label.toLowerCase().replace(/\s+/g, "-")}</span>
                    </div>
                    <div className="p-5 space-y-3">
                      {section.points.slice(0, 5).map((point, pi) => (
                        <motion.div
                          key={point}
                          initial={{ opacity: 0, x: 16 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: pi * 0.08 }}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background hover:border-primary/20 transition-all"
                        >
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: section.color + "12" }}
                          >
                            <span className="text-sm font-bold" style={{ color: section.color }}>{pi + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{point}</p>
                            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: section.color }}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${75 + pi * 4}%` }}
                                viewport={{ once: true }}
                                transition={{ delay: pi * 0.1 + 0.3 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Real-time sync enabled</span>
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Stats Section */}
      {stats.length > 0 && (
        <section id="stats" className="border-t border-border bg-muted/20 py-20 lg:py-24 scroll-mt-16">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader badge="Impact" title="Results That Speak" desc="Real metrics from businesses using our platform." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 rounded-xl border border-border bg-card"
                >
                  <p className="text-3xl sm:text-4xl font-extrabold text-primary mb-2">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Use Cases */}
      {useCases.length > 0 && (
        <section id="use-cases" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 scroll-mt-16">
          <SectionHeader badge="Use Cases" title="Built For Your Industry" desc="See how teams across industries use this module to get results." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <uc.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-2">{uc.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Benefits */}
      <BenefitsSection title={title} benefits={benefits} appName={appInfo.app_name} />

      {/* FAQ */}
      {faqs.length > 0 && (
        <section id="faq" className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 scroll-mt-16">
          <SectionHeader badge="FAQ" title="Frequently Asked Questions" desc="Quick answers to common questions about this module." />
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Related modules pulled live from platform_modules */}
      <RelatedModulesSection />

      {/* CTA */}
      <CTABottom isLoggedIn={isLoggedIn} />
      <PublicFooter />
    </div>
  );
}

function SectionHeader({ badge, title, desc }: { badge: string; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="text-center mb-14"
    >
      <span className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-4">
        {badge}
      </span>
      <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{title}</h2>
      <p className="mt-3 text-base text-muted-foreground max-w-[560px] mx-auto">{desc}</p>
    </motion.div>
  );
}

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="border border-border rounded-xl overflow-hidden bg-card"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-foreground pr-4">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          className="text-muted-foreground text-lg shrink-0"
        >
          +
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </motion.div>
    </motion.div>
  );
}

function BenefitsSection({ title, benefits, appName }: { title: string; benefits: string[]; appName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section id="benefits" ref={ref} className="relative border-t border-border bg-muted/30 py-20 lg:py-28 overflow-hidden scroll-mt-16">
      <motion.div style={{ y: bgY }} className="absolute inset-0 opacity-[0.01]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </motion.div>
      <div className="relative max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader badge="Benefits" title={`Why choose ${appName}?`} desc="Tangible advantages that set us apart." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b}
              initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/20 hover:shadow-md transition-all duration-200"
            >
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm text-foreground">{b}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTABottom({ isLoggedIn }: { isLoggedIn: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1]);

  return (
    <section ref={ref} className="relative py-20 lg:py-28 overflow-hidden">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[100px]"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div style={{ scale }} className="relative max-w-[600px] mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">Ready to get started?</h2>
          <p className="text-base text-muted-foreground mb-8">Start your 14-day free trial today. No credit card required.</p>
          <Link
            to={isLoggedIn ? "/dashboard" : "/signup"}
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 border border-primary/80 hover:shadow-xl hover:shadow-primary/20"
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
