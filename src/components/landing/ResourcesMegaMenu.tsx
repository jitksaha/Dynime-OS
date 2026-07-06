import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ArrowRight, BookOpen, HelpCircle, Code,
  FileText, Users2, Newspaper, Wrench, GraduationCap,
  type LucideIcon,
} from "lucide-react";

interface ResourceCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  items: { title: string; desc: string; path: string }[];
}

const categories: ResourceCategory[] = [
  {
    id: "learn",
    label: "Learn",
    icon: GraduationCap,
    color: "hsl(270,80%,60%)",
    items: [
      { title: "Blog", desc: "Latest insights, guides & updates", path: "/blog" },
      { title: "Help Center", desc: "Tutorials & how-to guides", path: "/help" },
      { title: "Testimonials", desc: "Customer success stories", path: "/testimonials" },
    ],
  },
  {
    id: "developers",
    label: "Developers",
    icon: Code,
    color: "hsl(142,71%,45%)",
    items: [
      { title: "API Documentation", desc: "RESTful API reference & examples", path: "/api/docs" },
      { title: "Webhooks", desc: "Real-time event notifications", path: "/features/integrations" },
      { title: "Integrations", desc: "Third-party app connectors", path: "/features/integrations" },
    ],
  },
  {
    id: "community",
    label: "Community",
    icon: Users2,
    color: "hsl(38,92%,50%)",
    items: [
      { title: "Partners", desc: "Join our partner ecosystem", path: "/partners" },
      { title: "Referral Program", desc: "Earn rewards for referrals", path: "/referrals" },
      { title: "Contact Us", desc: "Get in touch with our team", path: "/contact" },
    ],
  },
  {
    id: "tools",
    label: "Free Tools",
    icon: Wrench,
    color: "hsl(199,89%,48%)",
    items: [
      { title: "Invoice Builder", desc: "Create professional invoices free", path: "/tools/invoice-builder" },
      { title: "App Download", desc: "Get the mobile & desktop app", path: "/app-download" },
      { title: "Pricing Calculator", desc: "Find the right plan for you", path: "/pricing" },
    ],
  },
];

export function ResourcesMegaMenu() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const cat = categories[activeCategory];

  const close = useCallback(() => { clearTimeout(timeoutRef.current); setOpen(false); }, []);

  const handleTriggerEnter = () => { clearTimeout(timeoutRef.current); setOpen(true); };
  const handleTriggerLeave = () => { timeoutRef.current = setTimeout(close, 200); };
  const handlePanelEnter = () => { clearTimeout(timeoutRef.current); };
  const handlePanelLeave = () => { timeoutRef.current = setTimeout(close, 150); };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const handleBlur = () => close();
    const handleScroll = () => close();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [open, close]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-[13.5px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        Resources
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40"
              style={{ top: "64px" }}
              onClick={close}
            />

            <motion.div
              ref={panelRef}
              onMouseEnter={handlePanelEnter}
              onMouseLeave={handlePanelLeave}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 right-0 pt-3 z-50"
              style={{ top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom : 64 }}
            >
              <div className="w-full border-y border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="max-w-7xl mx-auto flex">
                  {/* Left sidebar */}
                  <div className="w-[260px] border-r border-border/40 bg-card/50 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                      Resources
                    </p>
                    {categories.map((c, i) => (
                      <button
                        key={c.id}
                        onMouseEnter={() => setActiveCategory(i)}
                        onClick={() => setActiveCategory(i)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          activeCategory === i
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground hover:bg-muted/30"
                        }`}
                      >
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200"
                          style={{
                            backgroundColor: activeCategory === i ? c.color + "18" : "transparent",
                          }}
                        >
                          <c.icon className="h-4 w-4" style={{ color: activeCategory === i ? c.color : undefined }} />
                        </div>
                        <span className="font-medium text-[13px]">{c.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Right panel */}
                  <div className="flex-1 p-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <cat.icon className="h-5 w-5" style={{ color: cat.color }} />
                          <h3 className="text-base font-bold text-foreground">{cat.label}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-6">
                          {cat.items.map((item) => (
                            <Link
                              key={item.title}
                              to={item.path}
                              onClick={close}
                              className="group flex items-start gap-3 p-3.5 rounded-xl hover:bg-muted/30 transition-all duration-200"
                            >
                              <div
                                className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: cat.color + "12" }}
                              >
                                <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>

                        <div
                          className="rounded-xl p-5 border border-border/40"
                          style={{ background: `linear-gradient(135deg, ${cat.color}08, ${cat.color}04)` }}
                        >
                          <p className="text-sm font-semibold text-foreground mb-1.5">
                            Explore {cat.label}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Discover resources to help you get the most out of our platform.
                          </p>
                          <Link
                            to={cat.items[0].path}
                            onClick={close}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors group/cta"
                            style={{ color: cat.color }}
                          >
                            Browse {cat.label.toLowerCase()}
                            <ArrowRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
                          </Link>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
