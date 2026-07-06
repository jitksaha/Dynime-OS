import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, Zap, Shield, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useTheme } from "@/hooks/use-theme";
import { HeroSlider } from "@/components/landing/HeroSlider";
import dashboardDark from "@/assets/dashboard-dark.png";
import dashboardLight from "@/assets/dashboard-light.png";

interface HeroProps {
  isLoggedIn: boolean;
}

const floatingWords = ["CRM", "HRM", "Accounting", "AI", "Projects", "POS"];

export function NewHero({ isLoggedIn }: HeroProps) {
  const { appInfo } = useAppInfo();
  const { theme } = useTheme();
  const dashboardImg = theme === "dark" ? dashboardDark : dashboardLight;

  return (
    <section className="relative overflow-hidden min-h-screen flex items-center">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 hero-gradient-mesh" />

      {/* Floating gradient orbs */}
      <div
        className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 animate-orb-1 pointer-events-none"
        style={{ background: "hsla(243, 75%, 60%, 0.25)" }}
      />
      <div
        className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-25 animate-orb-2 pointer-events-none"
        style={{ background: "hsla(270, 80%, 65%, 0.20)" }}
      />
      <div
        className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] rounded-full blur-[90px] opacity-20 animate-orb-3 pointer-events-none"
        style={{ background: "hsla(199, 89%, 48%, 0.15)" }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.3) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: text */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered business platform
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground leading-[1.08]"
            >
              Run your entire
              <br />
              business on{" "}
              <span className="brand-display">
                {appInfo?.app_name || "Dynime OS"}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-lg leading-relaxed"
            >
              The all-in-one platform with 50+ business modules, AI automation,
              and real-time analytics. From CRM to payroll — everything in one place.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link
                to={isLoggedIn ? "/dashboard" : "/signup"}
                className="btn-glow inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm lg:text-base hover:opacity-90 transition-opacity"
              >
                {isLoggedIn ? "Go to Dashboard" : "Start Free Trial"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={isLoggedIn ? "/dashboard" : "/contact"}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-input bg-background/60 backdrop-blur-sm text-foreground font-semibold text-sm lg:text-base hover:bg-accent transition-colors"
              >
                <Play className="w-4 h-4" />
                {isLoggedIn ? "Dashboard" : "Talk to Sales"}
              </Link>
            </motion.div>

            {/* Floating word chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 flex flex-wrap gap-2"
            >
              {floatingWords.map((word, i) => (
                <span
                  key={word}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-accent/60 text-muted-foreground border border-border/50 backdrop-blur-sm"
                >
                  {word}
                </span>
              ))}
            </motion.div>

            {/* Rotating highlights slider */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="max-w-none mx-0"
            >
              <HeroSlider />
            </motion.div>
          </div>

          {/* Right: device mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="relative"
          >
            {/* Glow behind mockup */}
            <div
              className="absolute inset-0 rounded-2xl blur-[60px] opacity-20 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, hsl(var(--primary) / 0.4), transparent 70%)",
              }}
            />

            {/* Device frame */}
            <div className="relative device-shadow">
              {/* Browser chrome */}
              <div className="rounded-t-xl bg-muted/80 border border-b-0 border-border/60 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 mx-4 h-5 rounded bg-accent/80 text-[10px] text-muted-foreground flex items-center px-3">
                  app.dynime.com
                </div>
              </div>

              {/* Dashboard screenshot */}
              <div className="rounded-b-xl overflow-hidden border border-border/60 border-t-0 shadow-2xl">
                <img
                  src={dashboardImg}
                  alt={`${appInfo?.app_name || "Dynime OS"} Dashboard`}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Floating badge cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="absolute -left-6 bottom-16 lg:-left-10 lg:bottom-24 bg-card/90 backdrop-blur-xl border border-border/60 rounded-xl px-4 py-3 shadow-lg hidden sm:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">99.9% Uptime</div>
                  <div className="text-[10px] text-muted-foreground">Enterprise reliability</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="absolute -right-4 top-20 lg:-right-8 lg:top-28 bg-card/90 backdrop-blur-xl border border-border/60 rounded-xl px-4 py-3 shadow-lg hidden sm:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">SOC 2 Compliant</div>
                  <div className="text-[10px] text-muted-foreground">Bank-grade security</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Scroll
          </span>
          <div className="w-5 h-8 rounded-full border border-border/60 flex justify-center p-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
