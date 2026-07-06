import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Dynime replaced 7 different tools we were paying for. Our team finally has everything in one place and productivity is through the roof.",
    author: "Sarah Chen",
    role: "CEO, TechVentures Inc.",
    rating: 5,
  },
  {
    quote: "The AI automation alone saves us 20 hours a week. Customer onboarding that used to take days now happens in minutes.",
    author: "Marcus Okonkwo",
    role: "Ops Director, ScaleFin",
    rating: 5,
  },
  {
    quote: "We evaluated 12 platforms before choosing Dynime. The module flexibility and enterprise security were the deciding factors for our compliance team.",
    author: "Priya Sharma",
    role: "CTO, MedCore Health",
    rating: 5,
  },
  {
    quote: "Their support team is incredible. Any issue gets resolved within hours, and the platform keeps getting better every month with new features.",
    author: "David Lindström",
    role: "Founder, Nordic Agency",
    rating: 5,
  },
  {
    quote: "From 5 employees to 200, Dynime scaled with us seamlessly. HR, payroll, and attendance management went from chaos to clockwork.",
    author: "Ana Rodriguez",
    role: "VP People, GrowLab",
    rating: 5,
  },
  {
    quote: "The POS and inventory integration saved our retail chain. Real-time stock sync across 15 stores is something no other platform offered.",
    author: "James Mitchell",
    role: "COO, Urban Retail Group",
    rating: 5,
  },
];

export function TestimonialCarousel() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8 section-alt">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Customer Stories
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Loved by teams{" "}
            <span className="text-gradient-hero">worldwide</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
            Join thousands of businesses that trust Dynime OS to run their operations.
          </p>
        </motion.div>

        {/* Auto-scrolling row */}
        <div className="overflow-hidden">
          <div className="flex gap-6 animate-testimonial-scroll">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div
                key={`${t.author}-${i}`}
                className="flex-shrink-0 w-[320px] rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-6 shadow-sm"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star
                      key={s}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                <blockquote className="text-sm text-foreground/85 leading-relaxed mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {t.author}
                  </div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
