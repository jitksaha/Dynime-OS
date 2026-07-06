import { motion } from "framer-motion";
import { Shield, Lock, Eye, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSecurity } from "@/components/illustrations";

const securityFeatures = [
  { icon: Lock, label: "256-bit Encryption", desc: "All data encrypted at rest and in transit" },
  { icon: Eye, label: "Audit Logging", desc: "Complete activity trail for compliance" },
  { icon: AlertTriangle, label: "Threat Detection", desc: "Automated alerts for suspicious activity" },
  { icon: CheckCircle2, label: "Role-based Access", desc: "Granular permission controls per module" },
];

export function SecuritySection() {
  return (
    <section className="py-28 lg:py-36 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/20 bg-success/5 text-success text-xs font-semibold mb-6">
                <Shield className="h-3 w-3" />
                Enterprise Security
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight mb-5">
                Built-in{" "}
                <span className="text-success">security</span>{" "}
                you can trust
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-10 max-w-lg">
                Enterprise-grade security is baked into every module. Role-based access, encryption, and audit logging keep your data safe — always.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {securityFeatures.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 p-4 rounded-2xl landing-card-glass transition-all duration-200 group"
                >
                  <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <item.icon className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <Link
                to="/features/security"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-success hover:text-success/80 transition-colors group"
              >
                Learn about security <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-border/60 landing-card-glass overflow-hidden shadow-2xl"
          >
            <AnimatedSecurity />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
