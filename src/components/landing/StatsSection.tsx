import { motion } from "framer-motion";
import { TrendingUp, Shield, Zap, Clock } from "lucide-react";
import { AnimatedDashboard } from "@/components/illustrations";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";

const iconMap: Record<string, React.ElementType> = { TrendingUp, Shield, Zap, Clock };

interface StatItem {
  icon: string;
  value: string;
  label: string;
  sublabel: string;
  color: string;
}

export function StatsSection() {
  const [stats, setStats] = useState<StatItem[]>([]);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "landing_stats")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setStats(data.value as unknown as StatItem[]);
        }
      });
  }, []);

  if (stats.length === 0) return null;

  return (
    <section className="py-28 lg:py-36 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-8 lg:gap-12">
            {stats.map((stat, i) => {
              const Icon = iconMap[stat.icon] || TrendingUp;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center group"
                >
                  <div
                    className="inline-flex items-center justify-center h-12 w-12 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: stat.color + "12" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: stat.color }} />
                  </div>
                  <motion.p
                    className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight"
                    whileInView={{ scale: [0.9, 1.02, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 + 0.2 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="mt-2 text-sm text-foreground font-medium">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                </motion.div>
              );
            })}
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block rounded-2xl border border-border/60 landing-card-glass shadow-2xl overflow-hidden"
          >
            <AnimatedDashboard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
