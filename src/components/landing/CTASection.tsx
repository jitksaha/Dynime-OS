import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAppInfo } from "@/hooks/useAppInfo";

interface CTASectionProps {
  isLoggedIn: boolean;
}

export function CTASection({ isLoggedIn }: CTASectionProps) {
  const { appInfo } = useAppInfo();
  return (
    <section className="py-28 lg:py-40 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-[radial-gradient(ellipse,hsla(243,75%,60%,0.08),transparent_70%)] pointer-events-none" />
      
      <div className="relative max-w-[800px] mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mx-auto w-20 h-1 rounded-full bg-gradient-to-r from-primary via-accent to-[hsl(199,89%,55%)] mb-10" />

          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
            Start managing your{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-[hsl(199,89%,55%)] bg-clip-text text-transparent">
              business smarter
            </span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-lg mx-auto leading-relaxed">
            Join 5,000+ businesses that trust {appInfo.app_name} to manage their entire operations. Start free, no credit card required.
          </p>

          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="group w-full sm:w-auto px-10 py-5 rounded-2xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1"
              >
                Get Started — It's Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto px-8 py-5 rounded-2xl border border-border text-foreground text-base font-medium hover:bg-card/50 transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5"
              >
                Contact Sales
              </Link>
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">No credit card needed · Free plan forever · Setup in 2 minutes</p>
        </motion.div>
      </div>
    </section>
  );
}
