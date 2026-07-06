import { Link } from "react-router-dom";
import {
  Users, Target, Megaphone, GitBranch, Receipt, Headphones,
  FolderKanban, FileText, BarChart3, ChevronDown,
  MessageSquare, ShoppingCart, Calendar, Wallet, Percent,
  Heart, GraduationCap, Factory, ShoppingBag, Laptop, Landmark,
  Hotel, HardHat, Truck, HandHeart, Building2, Scale,
  Briefcase, Globe, Zap, Shield, Settings, Star,
  Smartphone, Phone, Video, Bell, Code, Mail, Bot,
  type LucideIcon,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const iconMap: Record<string, LucideIcon> = {
  Users, Target, Megaphone, GitBranch, Receipt, Headphones,
  FolderKanban, FileText, BarChart3, MessageSquare, ShoppingCart,
  Calendar, Wallet, Percent, Heart, GraduationCap, Factory,
  ShoppingBag, Laptop, Landmark, Hotel, HardHat, Truck,
  HandHeart, Building2, Scale, Briefcase, Globe, Zap, Shield,
  Settings, Star, ChevronDown, Smartphone, Phone, Video, Bell, Code, Mail, Bot,
};

export interface MegaMenuItem {
  title: string;
  desc: string;
  path: string;
  icon: string;
  color: string;
  visible?: boolean;
}

interface MegaMenuDropdownProps {
  label: string;
  items: MegaMenuItem[];
  columns?: number;
  width?: string;
  sectionTitle?: string;
}

export function getIconComponent(name: string): LucideIcon {
  return iconMap[name] || Heart;
}

export function MegaMenuDropdown({ label, items, columns = 3, width = "720px", sectionTitle }: MegaMenuDropdownProps) {
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

  const visibleItems = items.filter(i => i.visible !== false);
  if (visibleItems.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        {label}
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

            {/* Full-width panel */}
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
              <div className="w-full border-y border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
                <div className="max-w-7xl mx-auto px-6 py-6 max-h-[70vh] overflow-y-auto">
                  {sectionTitle && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">{sectionTitle}</p>
                  )}
                  <div className="gap-3" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {visibleItems.map((item) => {
                      const Icon = getIconComponent(item.icon);
                      return (
                        <Link
                          key={item.path + item.title}
                          to={item.path}
                          onClick={close}
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 transition-all duration-200 group"
                        >
                          <div
                            className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                            style={{ backgroundColor: item.color + "10" }}
                          >
                            <Icon className="h-4 w-4" style={{ color: item.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{item.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
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
