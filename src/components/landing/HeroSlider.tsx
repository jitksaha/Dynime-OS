import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  BarChart3,
  ShieldCheck,
  Rocket,
  Workflow,
  Cloud,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Slide {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
}

const slides: Slide[] = [
  {
    title: "AI-Powered Automation",
    subtitle:
      "Let intelligent agents handle repetitive tasks, data entry, and workflow routing so your team can focus on what matters.",
    icon: Brain,
    accent: "bg-violet-500/10 text-violet-500",
  },
  {
    title: "Real-Time Analytics",
    subtitle:
      "Make faster decisions with live dashboards, custom reports, and predictive insights across every department.",
    icon: BarChart3,
    accent: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Enterprise-Grade Security",
    subtitle:
      "SOC 2 compliant with end-to-end encryption, role-based access, and automated daily backups.",
    icon: ShieldCheck,
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "Lightning-Fast Deployment",
    subtitle:
      "Go live in minutes with pre-built modules and a guided setup wizard — no engineering team required.",
    icon: Rocket,
    accent: "bg-amber-500/10 text-amber-500",
  },
  {
    title: "Seamless Integrations",
    subtitle:
      "Connect with 200+ tools your team already uses — Slack, Stripe, QuickBooks, and many more.",
    icon: Workflow,
    accent: "bg-pink-500/10 text-pink-500",
  },
  {
    title: "Always-On Cloud Platform",
    subtitle:
      "99.9% uptime guarantee with global CDN, auto-scaling infrastructure, and zero-downtime deployments.",
    icon: Cloud,
    accent: "bg-cyan-500/10 text-cyan-500",
  },
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = () => {
    setDirection(1);
    setCurrent((p) => (p + 1) % slides.length);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((p) => (p - 1 + slides.length) % slides.length);
  };

  const goTo = (i: number) => {
    setDirection(i > current ? 1 : -1);
    setCurrent(i);
  };

  // Autoplay
  useEffect(() => {
    autoplayRef.current = setInterval(next, 5000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, []);

  // Reset autoplay on manual interaction
  const handleInteraction = (fn: () => void) => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    fn();
    autoplayRef.current = setInterval(next, 5000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      handleInteraction(diff > 0 ? next : prev);
    }
  };

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="mt-10 w-full max-w-2xl mx-auto">
      {/* Slider card */}
      <div
        className="relative rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md px-6 py-5 lg:px-8 lg:py-6 shadow-lg overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex items-start gap-4"
          >
            {/* Icon */}
            <div
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${slide.accent}`}
            >
              <Icon className="w-6 h-6" />
            </div>

            {/* Text */}
            <div className="min-w-0">
              <h4 className="text-sm lg:text-base font-semibold text-foreground">
                {slide.title}
              </h4>
              <p className="mt-1 text-xs lg:text-sm text-muted-foreground leading-relaxed">
                {slide.subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <button
          type="button"
          onClick={() => handleInteraction(prev)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleInteraction(next)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {slides.map((s, i) => (
            <button
              type="button"
              key={s.title}
              onClick={() => handleInteraction(() => goTo(i))}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
