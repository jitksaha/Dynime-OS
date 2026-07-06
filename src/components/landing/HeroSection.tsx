import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useTheme } from "@/hooks/use-theme";
import dashboardDark from "@/assets/dashboard-dark.png";
import dashboardLight from "@/assets/dashboard-light.png";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface HeroSectionProps {
  isLoggedIn: boolean;
}

// Floating particle component
function FloatingOrb({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: string; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        y: [0, -20, 0],
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="w-full h-full rounded-full" style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />
    </motion.div>
  );
}

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  const { appInfo } = useAppInfo();
  const { theme } = useTheme();
  const dashboardImg = theme === "dark" ? dashboardDark : dashboardLight;
  const [demoOpen, setDemoOpen] = useState(false);
  const demoVideoUrl = "/dynime-demo.html";
  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-80px)] flex items-center pt-16 pb-20 lg:pt-20 lg:pb-36">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[5%] w-[800px] h-[800px] rounded-full bg-[radial-gradient(ellipse,hsla(243,75%,60%,0.12),transparent_60%)] animate-[landing-pulse-glow_8s_ease-in-out_infinite]" />
        <div className="absolute top-[0%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse,hsla(270,80%,60%,0.08),transparent_60%)] animate-[landing-pulse-glow_10s_ease-in-out_infinite_2s]" />
        <div className="absolute bottom-[0%] left-[30%] w-[900px] h-[500px] rounded-full bg-[radial-gradient(ellipse,hsla(199,89%,48%,0.05),transparent_60%)] animate-[landing-pulse-glow_12s_ease-in-out_infinite_4s]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Floating orbs/particles */}
        <FloatingOrb delay={0} x="10%" y="20%" size="6px" color="hsla(243,75%,65%,0.6)" />
        <FloatingOrb delay={1} x="80%" y="15%" size="4px" color="hsla(270,80%,65%,0.5)" />
        <FloatingOrb delay={2} x="60%" y="70%" size="5px" color="hsla(199,89%,55%,0.5)" />
        <FloatingOrb delay={3} x="25%" y="80%" size="3px" color="hsla(142,71%,50%,0.4)" />
        <FloatingOrb delay={0.5} x="90%" y="60%" size="4px" color="hsla(243,75%,65%,0.4)" />
        <FloatingOrb delay={1.5} x="45%" y="10%" size="5px" color="hsla(270,80%,60%,0.3)" />
        <FloatingOrb delay={2.5} x="15%" y="55%" size="3px" color="hsla(199,89%,55%,0.4)" />
        <FloatingOrb delay={3.5} x="70%" y="40%" size="4px" color="hsla(38,92%,50%,0.3)" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Now available — AI-powered business automation
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-7xl xl:text-[84px] font-extrabold text-foreground leading-[1.04] tracking-tight max-w-[1000px] mx-auto"
        >
          Run Your Entire
          <br className="hidden sm:block" />
          Business From{" "}
          <span className="relative">
            <span className="bg-gradient-to-r from-[hsl(243,75%,65%)] via-[hsl(270,80%,65%)] to-[hsl(199,89%,55%)] bg-clip-text text-transparent">
              One Platform
            </span>
            {/* Underline glow */}
            <motion.span
              className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-[hsl(243,75%,65%)] via-[hsl(270,80%,65%)] to-[hsl(199,89%,55%)] rounded-full"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 0.6 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              style={{ transformOrigin: "left" }}
            />
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-[660px] mx-auto leading-relaxed"
        >
          {appInfo.app_name} unifies CRM, HRM, Accounting, and Project Management into a single powerful platform.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="group px-10 py-4.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-300 flex items-center gap-2 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="group min-w-[180px] px-10 py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                onClick={() => setDemoOpen(true)}
                className="group min-w-[180px] px-10 py-4 rounded-2xl border border-border/60 text-foreground text-sm font-semibold hover:bg-card/40 transition-all duration-300 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 backdrop-blur-sm"
              >
                <Play className="h-4 w-4 text-primary fill-primary" />
                Watch Demo
              </button>
            </>
          )}
        </motion.div>

        {!isLoggedIn && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-5 text-xs text-muted-foreground"
          >
            No credit card required · Free plan forever · Setup in 2 minutes
          </motion.p>
        )}

        {/* Floating Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 relative mx-auto max-w-[1100px]"
          style={{ perspective: "1200px" }}
        >
          {/* Glow behind dashboard */}
          <div className="absolute -inset-8 rounded-3xl bg-gradient-to-r from-[hsl(243,75%,60%)]/15 via-[hsl(270,80%,60%)]/10 to-[hsl(199,89%,55%)]/15 blur-[80px] opacity-60" />

          <motion.div
            className="relative rounded-2xl border border-border/50 landing-card-glass shadow-2xl overflow-hidden"
            whileHover={{ rotateX: -1, rotateY: 1, transition: { duration: 0.4 } }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40 bg-card/20">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 mx-8">
                <div className="h-8 rounded-lg bg-muted/20 border border-border/30 flex items-center px-4 max-w-sm mx-auto">
                  <span className="text-xs text-muted-foreground font-mono">{appInfo.app_name.toLowerCase().replace(/\s/g, '').replace(/\.com$/i, '')}.com/dashboard</span>
                </div>
              </div>
            </div>
            {/* Dashboard screenshot */}
            <img
              src={dashboardImg}
              alt={`${appInfo.app_name} Dashboard`}
              className="w-full h-auto"
              loading="eager"
            />
          </motion.div>

          {/* Bottom reflection glow */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[60%] h-32 bg-gradient-to-r from-[hsl(243,75%,60%)]/10 via-[hsl(270,80%,60%)]/8 to-[hsl(199,89%,55%)]/10 blur-[80px] rounded-full" />
        </motion.div>
      </div>
      {/* Demo Video Modal */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-border/50">
          <DialogTitle className="sr-only">Product Demo Video</DialogTitle>
          <div className="aspect-video w-full">
            {demoOpen && (
              <iframe
                src={demoVideoUrl}
                title="Product Demo"
                className="w-full h-full border-0"
                allow="autoplay"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
