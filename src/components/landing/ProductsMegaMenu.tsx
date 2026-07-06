// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ArrowRight, Sparkles, Bot, Users, DollarSign,
  Megaphone, ShieldCheck, ShoppingBag, Briefcase, Truck, BarChart3,
  Zap, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAppInfo } from "@/hooks/useAppInfo";
import { getIconComponent } from "@/components/MegaMenuDropdown";

// ----- DB icon mapping -----
const iconNameMap: Record<string, string> = {
  users: "Users", handshake: "Target", megaphone: "Megaphone",
  workflow: "GitBranch", calculator: "Receipt", headphones: "Headphones",
  kanban: "FolderKanban", file: "FileText", "bar-chart": "BarChart3",
  wallet: "Wallet", "shopping-bag": "ShoppingCart", "message-square": "MessageSquare",
  calendar: "Calendar", briefcase: "Briefcase", percent: "Percent",
  shield: "Shield", zap: "Zap", globe: "Globe", smartphone: "Smartphone",
  phone: "Phone", video: "Video", bell: "Bell", code: "Code", mail: "Mail", bot: "Bot",
  target: "Target", "refresh-cw": "RefreshCw", "pie-chart": "PieChart",
  "graduation-cap": "GraduationCap", monitor: "Monitor", "dollar-sign": "DollarSign",
  building: "Building", leaf: "Leaf", store: "Store", map: "Map",
  gamepad: "Gamepad2", receipt: "Receipt", activity: "Activity",
  "building-2": "Building2", layers: "Layers",
};

const modulePathMap: Record<string, string> = {
  hrms: "/features/hrm", crm: "/features/crm", marketing: "/features/marketing",
  workflows: "/features/workflows", accounting: "/features/accounting",
  helpdesk: "/features/helpdesk", projects: "/features/projects",
  documents: "/features/documents", reports: "/features/reports",
  wallet: "/features/wallet", product_hub: "/features/pos",
  team_chat: "/features/team-chat", calendar: "/features/calendar",
  recruitment: "/features/recruitment", tax_compliance: "/features/tax-compliance",
  security: "/features/security", integrations: "/features/integrations",
  portals: "/features/portals", sms: "/features/sms", whatsapp: "/features/whatsapp",
  meetings: "/features/meetings", notifications: "/features/notifications",
  api: "/features/api", email: "/features/email", ai_assistant: "/features/ai",
  okr: "/features/okr", subscription_management: "/features/subscription-management",
  budget_planning: "/features/budget-planning", compliance: "/features/compliance",
  lms: "/features/lms", it_asset: "/features/it-asset",
  commission: "/features/commission", visitor_management: "/features/visitor-management",
  esg: "/features/esg", vendor_portal: "/features/vendor-portal",
  territory: "/features/territory", gamification: "/features/gamification",
  expense_management: "/features/expense-management",
  control_tower: "/features/control-tower", multi_entity: "/features/multi-entity",
};

// Category metadata: order, label, icon, color
interface CategoryMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}
const CATEGORY_META: CategoryMeta[] = [
  { key: "core",          label: "Core Suite",     icon: Briefcase,   color: "hsl(243,75%,58%)" },
  { key: "ai",            label: "AI & Automation", icon: Bot,        color: "hsl(260,80%,60%)" },
  { key: "communication", label: "Communication",   icon: Megaphone,  color: "hsl(270,80%,60%)" },
  { key: "commerce",      label: "Commerce & POS",  icon: ShoppingBag,color: "hsl(38,92%,50%)" },
  { key: "finance",       label: "Finance",         icon: DollarSign, color: "hsl(142,71%,45%)" },
  { key: "hr",            label: "HR & People",     icon: Users,      color: "hsl(310,60%,50%)" },
  { key: "productivity",  label: "Productivity",    icon: Zap,        color: "hsl(199,89%,48%)" },
  { key: "sales",         label: "Sales",           icon: BarChart3,  color: "hsl(200,80%,55%)" },
  { key: "compliance",    label: "Compliance",      icon: ShieldCheck,color: "hsl(0,72%,50%)" },
  { key: "procurement",   label: "Procurement",     icon: Truck,      color: "hsl(45,93%,47%)" },
  { key: "admin",         label: "Admin & IT",      icon: ShieldCheck,color: "hsl(220,13%,46%)" },
];

const moduleColorMap: Record<string, string> = {
  hrms: "hsl(243,75%,58%)", crm: "hsl(142,71%,45%)", marketing: "hsl(270,80%,60%)",
  workflows: "hsl(38,92%,50%)", accounting: "hsl(199,89%,48%)",
  helpdesk: "hsl(0,72%,50%)", projects: "hsl(200,80%,55%)",
  documents: "hsl(38,92%,50%)", reports: "hsl(290,65%,55%)",
  wallet: "hsl(142,71%,45%)", product_hub: "hsl(38,92%,50%)",
  team_chat: "hsl(270,80%,60%)", calendar: "hsl(199,89%,48%)",
  recruitment: "hsl(310,60%,50%)", tax_compliance: "hsl(0,72%,50%)",
  security: "hsl(220,70%,50%)", integrations: "hsl(45,93%,47%)",
  portals: "hsl(170,60%,45%)", sms: "hsl(160,60%,40%)",
  whatsapp: "hsl(142,70%,40%)", meetings: "hsl(210,80%,55%)",
  notifications: "hsl(350,70%,55%)", api: "hsl(250,60%,55%)",
  email: "hsl(15,80%,55%)", ai_assistant: "hsl(260,80%,60%)",
  okr: "hsl(270,80%,60%)", subscription_management: "hsl(199,89%,48%)",
  budget_planning: "hsl(38,92%,50%)", compliance: "hsl(0,72%,50%)",
  lms: "hsl(142,71%,45%)", it_asset: "hsl(220,13%,46%)",
  commission: "hsl(142,71%,45%)", visitor_management: "hsl(199,89%,48%)",
  esg: "hsl(142,71%,45%)", vendor_portal: "hsl(38,92%,50%)",
  territory: "hsl(243,75%,58%)", gamification: "hsl(38,92%,50%)",
  expense_management: "hsl(170,60%,45%)", control_tower: "hsl(270,80%,60%)",
  multi_entity: "hsl(220,13%,46%)",
};

interface ModuleItem {
  name: string;
  label: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  sort_order: number;
}

let cachedModules: ModuleItem[] | null = null;
let cacheTime = 0;

// Featured "spotlight" item shown at the top of the panel — always visible
const FEATURED = {
  title: "AI Social Agent",
  desc: "Auto-reply on Instagram, Facebook, WhatsApp, X — 24/7, like a human.",
  path: "/features/social-agent",
  icon: Bot,
  badge: "NEW",
  color: "hsl(260,80%,60%)",
};

export function ProductsMegaMenu() {
  const { appInfo } = useAppInfo();
  const appName = appInfo.app_name || "Dynime";
  const [modules, setModules] = useState<ModuleItem[]>(cachedModules || []);
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string>("core");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch modules
  useEffect(() => {
    if (cachedModules && Date.now() - cacheTime < 60000) {
      setModules(cachedModules);
      return;
    }
    supabase
      .from("platform_modules")
      .select("name, label, description, icon, category, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        cachedModules = data as ModuleItem[];
        cacheTime = Date.now();
        setModules(data as ModuleItem[]);
      });
  }, []);

  const close = useCallback(() => { clearTimeout(timeoutRef.current); setOpen(false); }, []);
  const handleTriggerEnter = () => { clearTimeout(timeoutRef.current); setOpen(true); };
  const handleTriggerLeave = () => { timeoutRef.current = setTimeout(close, 200); };
  const handlePanelEnter = () => { clearTimeout(timeoutRef.current); };
  const handlePanelLeave = () => { timeoutRef.current = setTimeout(close, 150); };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onScroll = () => close();
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open, close]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // Group modules by category, only show categories that have modules
  const grouped: Record<string, ModuleItem[]> = {};
  for (const m of modules) {
    const cat = m.category || "core";
    (grouped[cat] = grouped[cat] || []).push(m);
  }
  const visibleCats = CATEGORY_META.filter((c) => grouped[c.key]?.length);

  // Reset active cat if not in list
  useEffect(() => {
    if (visibleCats.length && !grouped[activeCat]) {
      setActiveCat(visibleCats[0].key);
    }
  }, [modules]); // eslint-disable-line

  const activeMeta = CATEGORY_META.find((c) => c.key === activeCat) || CATEGORY_META[0];
  const activeModules = grouped[activeCat] || [];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-[13.5px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        Products
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <div className="max-w-7xl mx-auto flex max-h-[78vh]">
                  {/* Left: Categories */}
                  <div className="w-[240px] shrink-0 border-r border-border/40 bg-muted/20 p-3 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                      Categories
                    </p>
                    {visibleCats.map((c) => {
                      const Icon = c.icon;
                      const active = c.key === activeCat;
                      return (
                        <button
                          key={c.key}
                          onMouseEnter={() => setActiveCat(c.key)}
                          onClick={() => setActiveCat(c.key)}
                          className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-[13px] transition-all duration-150 ${
                            active ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: active ? c.color + "1f" : c.color + "10" }}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: c.color }} />
                          </div>
                          <span className="font-medium flex-1 truncate">{c.label}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {grouped[c.key]?.length || 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Featured + active category items */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    {/* Featured spotlight */}
                    <Link
                      to={FEATURED.path}
                      onClick={close}
                      className="group flex items-center gap-4 p-4 mb-5 rounded-2xl border border-border/40 bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent hover:border-primary/40 transition-all"
                    >
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: FEATURED.color + "18" }}
                      >
                        <FEATURED.icon className="h-5 w-5" style={{ color: FEATURED.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{FEATURED.title}</p>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                            <Sparkles className="inline h-2.5 w-2.5 mr-0.5 -mt-0.5" />
                            {FEATURED.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{FEATURED.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeCat}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <activeMeta.icon className="h-4 w-4" style={{ color: activeMeta.color }} />
                          <h3 className="text-sm font-bold text-foreground">{activeMeta.label}</h3>
                          <span className="text-[10px] text-muted-foreground">
                            ({activeModules.length} {activeModules.length === 1 ? "product" : "products"})
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {activeModules.map((mod) => {
                            const iconKey = iconNameMap[mod.icon || ""] || "Heart";
                            const Icon = getIconComponent(iconKey);
                            const color = moduleColorMap[mod.name] || activeMeta.color;
                            const path = modulePathMap[mod.name] || `/features/${mod.name.replace(/_/g, "-")}`;
                            return (
                              <Link
                                key={mod.name}
                                to={path}
                                onClick={close}
                                className="group flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all"
                              >
                                <div
                                  className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color + "14" }}
                                >
                                  <Icon className="h-4 w-4" style={{ color }} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                                    {appName} {mod.label}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                                    {mod.description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
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
