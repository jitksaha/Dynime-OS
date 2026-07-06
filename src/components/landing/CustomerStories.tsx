import { motion } from "framer-motion";
import { Star, ArrowRight, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";

interface Story {
  company: string;
  industry: string;
  quote: string;
  person: string;
  role: string;
  color: string;
}

function StoryCard({ story }: { story: Story }) {
  return (
    <div className="w-[340px] md:w-[380px] shrink-0 group rounded-2xl landing-card-glass p-6 transition-all duration-300 flex flex-col hover:-translate-y-1">
      <div className="flex items-center justify-between mb-5">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: story.color + "18" }}
        >
          <span className="text-base font-bold" style={{ color: story.color }}>{story.company[0]}</span>
        </div>
        <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted/30 font-medium">{story.industry}</span>
      </div>
      <Quote className="h-5 w-5 text-primary/20 mb-3" />
      <p className="text-sm text-foreground/80 leading-relaxed mb-6 flex-1">"{story.quote}"</p>
      <div className="border-t border-border/30 pt-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{story.person}</p>
          <p className="text-xs text-muted-foreground">{story.role}, {story.company}</p>
        </div>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, j) => (
            <Star key={j} className="h-3.5 w-3.5 text-warning fill-warning" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomerStories() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "landing_customer_stories")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setStories(data.value as unknown as Story[]);
        }
      });
  }, []);

  if (stories.length === 0) return null;

  return (
    <section className="py-28 lg:py-36 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-5">
            Customer Stories
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Loved by businesses everywhere
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
            See how companies like yours transform their operations.
          </p>
        </motion.div>
      </div>

      <div className="relative overflow-hidden w-full [--marquee-speed:40s]">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />
        <div className="flex gap-5 w-max animate-[marquee_var(--marquee-speed)_linear_infinite] hover:[animation-play-state:paused]">
          {[...stories, ...stories].map((story, i) => (
            <StoryCard key={`${story.company}-${i}`} story={story} />
          ))}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link to="/contact" className="text-sm font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors">
            Read more stories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
