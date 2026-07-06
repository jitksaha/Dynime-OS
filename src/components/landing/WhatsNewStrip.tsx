import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Bot, LayoutDashboard, Smartphone, Globe, Mail, Video } from "lucide-react";

interface NewItem {
  title: string;
  desc: string;
  href: string;
  icon: typeof Bot;
  tint: string;
}

const ITEMS: NewItem[] = [
  {
    title: "AI Social Agent",
    desc: "Auto-replies on Instagram, WhatsApp, FB & X — 24/7 like a human.",
    href: "/features/social-agent",
    icon: Bot,
    tint: "260,80%,60%",
  },
  {
    title: "Visual Page Editor",
    desc: "Elementor-style drag & drop for pages, posts and emails.",
    href: "/features/email",
    icon: LayoutDashboard,
    tint: "199,89%,48%",
  },
  {
    title: "Mobile App",
    desc: "Native iOS & Android — manage your business from anywhere.",
    href: "/app-download",
    icon: Smartphone,
    tint: "142,71%,45%",
  },
  {
    title: "Self-Service Portals",
    desc: "Branded portals for employees, customers and vendors.",
    href: "/features/portals",
    icon: Globe,
    tint: "170,60%,45%",
  },
  {
    title: "Email Builder",
    desc: "Drag-and-drop transactional & campaign email designer.",
    href: "/features/email",
    icon: Mail,
    tint: "15,80%,55%",
  },
  {
    title: "Meetings",
    desc: "Schedule and host video meetings with calendar sync.",
    href: "/features/meetings",
    icon: Video,
    tint: "210,80%,55%",
  },
];

export function WhatsNewStrip() {
  return (
    <section className="relative py-16 sm:py-20 border-y border-border bg-gradient-to-b from-primary/[0.03] via-background to-background overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, hsl(var(--primary)) 0%, transparent 60%)`,
        }}
      />
      <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3 w-3" /> What's new
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Just shipped
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Fresh capabilities now live across the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Link
                  to={item.href}
                  className="group block h-full p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all relative overflow-hidden"
                >
                  <div
                    className="absolute -top-12 -right-12 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ background: `hsl(${item.tint} / 0.5)` }}
                  />
                  <div className="relative flex items-start gap-3">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                      style={{ background: `hsl(${item.tint} / 0.12)` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: `hsl(${item.tint})` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          New
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.desc}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Learn more <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
