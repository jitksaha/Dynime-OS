import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Zap, Cloud, Lock, RefreshCw, Smartphone, Globe,
} from "lucide-react";

const integrations = [
  { icon: Zap, title: "Lightning Fast", desc: "Sub-second response times with globally distributed infrastructure." },
  { icon: Cloud, title: "Cloud Native", desc: "Auto-scaling architecture that grows with your business needs." },
  { icon: Lock, title: "Bank-Grade Security", desc: "256-bit encryption, SOC 2 compliance, and daily backups." },
  { icon: RefreshCw, title: "Real-time Sync", desc: "All modules sync in real-time. Changes reflect instantly everywhere." },
  { icon: Smartphone, title: "Mobile Ready", desc: "Full-featured responsive design works perfectly on any device." },
  { icon: Globe, title: "Multi-Language", desc: "Built-in localization support for global teams and customers." },
];

export function IntegrationsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section ref={ref} className="relative overflow-hidden py-28 lg:py-36">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <motion.div
        style={{ y }}
        className="absolute inset-0 opacity-[0.02]"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(hsla(0,0%,100%,0.5) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </motion.div>

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-5">
            Built for Scale
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Enterprise-grade infrastructure
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
            Built on modern cloud architecture with security and performance at its core.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative p-6 rounded-2xl landing-card-glass transition-all duration-300 group"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
