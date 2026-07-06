import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

interface CTABannerProps {
  isLoggedIn: boolean;
}

export function CTABanner({ isLoggedIn }: CTABannerProps) {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 hero-gradient-mesh" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-25 pointer-events-none"
        style={{ background: "hsl(var(--primary) / 0.3)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Free 14-day trial, no credit card required
          </div>

          <h2 className="text-3xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Ready to{" "}
            <span className="text-gradient-hero">transform</span> your
            business?
          </h2>
          <p className="mt-5 text-muted-foreground text-lg lg:text-xl max-w-lg mx-auto leading-relaxed">
            Join 10,000+ companies already running on Dynime. Start your free trial today — setup takes less than 5 minutes.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to={isLoggedIn ? "/dashboard" : "/signup"}
              className="btn-glow inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              {isLoggedIn ? "Go to Dashboard" : "Start Free Trial"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={isLoggedIn ? "/dashboard" : "/contact"}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-input bg-background/60 backdrop-blur-sm text-foreground font-semibold text-base hover:bg-accent transition-colors"
            >
              Talk to Sales
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            No credit card required · Cancel anytime · SOC 2 compliant
          </p>
        </motion.div>
      </div>
    </section>
  );
}
