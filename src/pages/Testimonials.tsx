import { Star, Quote, ArrowRight, Building2, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";

interface TestimonialItem {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating: number;
  category: string;
}

interface StatItem {
  icon: string;
  value: string;
  label: string;
}

const iconMap: Record<string, React.ElementType> = { Building2, Users, TrendingUp };

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("platform_settings").select("value").eq("key", "testimonials_page_items").maybeSingle(),
      supabase.from("platform_settings").select("value").eq("key", "testimonials_page_stats").maybeSingle(),
    ]).then(([testimonialsRes, statsRes]) => {
      if (testimonialsRes.data?.value && Array.isArray(testimonialsRes.data.value)) {
        setTestimonials(testimonialsRes.data.value as unknown as TestimonialItem[]);
      }
      if (statsRes.data?.value && Array.isArray(statsRes.data.value)) {
        setStats(statsRes.data.value as unknown as StatItem[]);
      }
      setLoading(false);
    });
  }, []);

  const categories = ["All", ...Array.from(new Set(testimonials.map(t => t.category)))];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02]" />
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-5"
          >
            Customer Stories
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight"
          >
            Loved by teams <br className="hidden sm:block" />
            <span className="text-primary">around the world</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            See how businesses of all sizes streamline operations, boost productivity, and grow faster.
          </motion.p>

          {/* Stats */}
          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex flex-wrap justify-center gap-6 sm:gap-10"
            >
              {stats.map((s) => {
                const Icon = iconMap[s.icon] || Building2;
                return (
                  <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg sm:text-xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-14 sm:py-20 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : testimonials.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No testimonials yet.</p>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: (i % 6) * 0.06 }}
                  className="break-inside-avoid rounded-xl border border-border bg-card p-5 sm:p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">
                      {t.category}
                    </span>
                    <Quote className="h-6 w-6 text-primary/[0.08] group-hover:text-primary/15 transition-colors" />
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 text-warning fill-warning" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mb-5">"{t.quote}"</p>
                  <div className="border-t border-border pt-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {t.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Ready to join them?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Start your free trial and see why teams choose us.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
