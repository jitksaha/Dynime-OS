import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { UserPlus, Settings2, Rocket, TrendingUp } from "lucide-react";

const steps = [
  { icon: UserPlus, step: "01", title: "Create Your Account", desc: "Sign up in under 2 minutes. No credit card required. Get instant access to all modules." },
  { icon: Settings2, step: "02", title: "Configure Your Workspace", desc: "Enable the modules you need — HRMS, CRM, Accounting, and more. Invite your team." },
  { icon: Rocket, step: "03", title: "Launch & Automate", desc: "Set up workflows, automate repetitive tasks, and streamline your operations instantly." },
  { icon: TrendingUp, step: "04", title: "Scale With Confidence", desc: "Monitor performance with real-time analytics. Add modules as your business grows." },
];

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={ref} className="relative overflow-hidden py-28 lg:py-36">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <motion.div
        style={{ y: bgY }}
        className="absolute top-0 right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(ellipse,hsla(243,75%,60%,0.05),transparent_70%)]"
      />
      <motion.div
        style={{ y: bgY }}
        className="absolute bottom-[-20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(ellipse,hsla(270,80%,60%,0.04),transparent_70%)]"
      />

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-5">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
            Four simple steps to transform your business operations.
          </p>
        </motion.div>

        {/* Desktop timeline */}
        <div className="hidden lg:block relative">
          <div className="absolute top-[52px] left-[12.5%] right-[12.5%] h-[2px]">
            <motion.div
              className="h-full bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 rounded-full"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{ transformOrigin: "left" }}
            />
          </div>

          <div className="grid grid-cols-4 gap-0">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                className="relative flex flex-col items-center group px-4"
              >
                <div className="relative z-10 mb-8">
                  <motion.div
                    className="h-[104px] w-[104px] rounded-full border border-border/50 bg-card/30 flex items-center justify-center group-hover:border-primary/40 transition-all duration-300"
                    whileHover={{ scale: 1.08 }}
                  >
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                  </motion.div>
                  <span className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-lg shadow-primary/25">
                    {step.step}
                  </span>
                </div>
                <div className="text-center flex-1 flex flex-col">
                  <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile vertical timeline */}
        <div className="lg:hidden relative pl-10">
          <motion.div
            className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary/10 via-primary/30 to-primary/10 rounded-full"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ transformOrigin: "top" }}
          />
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative flex items-start gap-5"
              >
                <div className="absolute -left-10 top-0 z-10">
                  <div className="h-10 w-10 rounded-full border border-border/50 bg-card/30 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                <div className="landing-card-glass rounded-xl p-5 flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
