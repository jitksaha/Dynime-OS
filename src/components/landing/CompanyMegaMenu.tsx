import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Building2, Mail, Shield, FileText, Scale } from "lucide-react";

const items = [
  { icon: Building2, title: "About Us", desc: "Our mission & team", path: "/about", color: "hsl(243,75%,58%)" },
  { icon: Mail, title: "Contact", desc: "Get in touch", path: "/contact", color: "hsl(142,71%,45%)" },
  { icon: Shield, title: "Privacy Policy", desc: "Data protection", path: "/privacy", color: "hsl(199,89%,48%)" },
  { icon: FileText, title: "Terms of Service", desc: "Usage agreement", path: "/terms", color: "hsl(38,92%,50%)" },
  { icon: Scale, title: "Refund Policy", desc: "Return guidelines", path: "/refund", color: "hsl(270,80%,60%)" },
];

export function CompanyMegaMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
        Company
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Invisible backdrop for click-outside on body */}
            <div className="fixed inset-0 z-40" onClick={close} />

            <motion.div
              ref={panelRef}
              onMouseEnter={handlePanelEnter}
              onMouseLeave={handlePanelLeave}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full right-0 pt-3 z-50"
            >
              <div className="w-[280px] rounded-2xl shadow-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-3">
                {items.map((item) => (
                  <Link
                    key={item.title}
                    to={item.path}
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-all duration-200 group"
                  >
                    <div
                      className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: item.color + "12" }}
                    >
                      <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
