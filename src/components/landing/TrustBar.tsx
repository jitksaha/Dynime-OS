import { motion } from "framer-motion";

const logos = [
  "TechBD", "GreenTech", "DataSoft", "BuildMax", "QuickServe", "MetaFinance", "InnovateCo", "AlphaGroup",
];

export function TrustBar() {
  return (
    <section className="py-14 lg:py-16 border-y border-border/30">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs text-muted-foreground text-center mb-10 uppercase tracking-[0.2em] font-medium"
        >
          Trusted by 5,000+ businesses worldwide
        </motion.p>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />
          <div className="flex gap-14 lg:gap-20 w-max animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused]">
            {[...logos, ...logos].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="text-muted-foreground/25 hover:text-muted-foreground/50 transition-colors duration-500 shrink-0"
              >
                <span className="text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
