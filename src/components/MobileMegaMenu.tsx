// @ts-nocheck
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ArrowRight, Sparkles, Bot,
  Briefcase, Megaphone, ShoppingBag, DollarSign, Users, Zap, BarChart3,
  ShieldCheck, Truck, BookOpen, Code, Users2, Wrench, GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAppInfo } from "@/hooks/useAppInfo";
import { getIconComponent } from "@/components/MegaMenuDropdown";

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

const iconNameMap: Record<string, string> = {
  users: "Users", handshake: "Target", megaphone: "Megaphone",
  workflow: "GitBranch", calculator: "Receipt", headphones: "Headphones",
  kanban: "FolderKanban", file: "FileText", "bar-chart": "BarChart3",
  wallet: "Wallet", "shopping-bag": "ShoppingCart", "message-square": "MessageSquare",
  calendar: "Calendar", briefcase: "Briefcase", percent: "Percent",
  shield: "Shield", zap: "Zap", globe: "Globe", smartphone: "Smartphone",
  phone: "Phone", video: "Video", bell: "Bell", code: "Code", mail: "Mail", bot: "Bot",
};

interface CategoryMeta { key: string; label: string; icon: LucideIcon; color: string; }
const CATEGORY_META: CategoryMeta[] = [
  { key: "core", label: "Core Suite", icon: Briefcase, color: "hsl(243,75%,58%)" },
  { key: "ai", label: "AI & Automation", icon: Bot, color: "hsl(260,80%,60%)" },
  { key: "communication", label: "Communication", icon: Megaphone, color: "hsl(270,80%,60%)" },
  { key: "commerce", label: "Commerce & POS", icon: ShoppingBag, color: "hsl(38,92%,50%)" },
  { key: "finance", label: "Finance", icon: DollarSign, color: "hsl(142,71%,45%)" },
  { key: "hr", label: "HR & People", icon: Users, color: "hsl(310,60%,50%)" },
  { key: "productivity", label: "Productivity", icon: Zap, color: "hsl(199,89%,48%)" },
  { key: "sales", label: "Sales", icon: BarChart3, color: "hsl(200,80%,55%)" },
  { key: "compliance", label: "Compliance", icon: ShieldCheck, color: "hsl(0,72%,50%)" },
  { key: "procurement", label: "Procurement", icon: Truck, color: "hsl(45,93%,47%)" },
  { key: "admin", label: "Admin & IT", icon: ShieldCheck, color: "hsl(220,13%,46%)" },
];

interface ResourceCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  items: { title: string; desc: string; path: string }[];
}
const RESOURCE_CATEGORIES: ResourceCategory[] = [
  { id: "learn", label: "Learn", icon: GraduationCap, color: "hsl(270,80%,60%)", items: [
    { title: "Blog", desc: "Latest insights & guides", path: "/blog" },
    { title: "Help Center", desc: "Tutorials & how-to guides", path: "/help" },
    { title: "Testimonials", desc: "Customer success stories", path: "/testimonials" },
  ]},
  { id: "developers", label: "Developers", icon: Code, color: "hsl(142,71%,45%)", items: [
    { title: "API Documentation", desc: "RESTful API reference", path: "/api/docs" },
    { title: "Webhooks", desc: "Real-time event notifications", path: "/features/integrations" },
    { title: "Integrations", desc: "Third-party app connectors", path: "/features/integrations" },
  ]},
  { id: "community", label: "Community", icon: Users2, color: "hsl(38,92%,50%)", items: [
    { title: "Partners", desc: "Join our partner ecosystem", path: "/partners" },
    { title: "Referral Program", desc: "Earn rewards for referrals", path: "/referrals" },
    { title: "Contact Us", desc: "Get in touch with our team", path: "/contact" },
  ]},
  { id: "tools", label: "Free Tools", icon: Wrench, color: "hsl(199,89%,48%)", items: [
    { title: "Invoice Builder", desc: "Create invoices free", path: "/tools/invoice-builder" },
    { title: "App Download", desc: "Get the mobile & desktop app", path: "/app-download" },
    { title: "Pricing Calculator", desc: "Find the right plan", path: "/pricing" },
  ]},
];

interface ModuleItem {
  name: string; label: string; description: string | null;
  icon: string | null; category: string | null; sort_order: number;
}

interface SolutionItem {
  name: string; description: string; slug: string; icon: string; color: string;
}

const FEATURED = {
  title: "AI Social Agent",
  desc: "Auto-reply on Instagram, Facebook, WhatsApp & X — 24/7.",
  path: "/features/social-agent",
  icon: Bot,
  color: "hsl(260,80%,60%)",
};

interface MobileMegaMenuProps {
  onNavigate: () => void;
}

export function MobileMegaMenu({ onNavigate }: MobileMegaMenuProps) {
  const { appInfo } = useAppInfo();
  const appName = appInfo.app_name || "Dynime";
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [openTop, setOpenTop] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("platform_modules")
      .select("name, label, description, icon, category, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => { if (data) setModules(data as ModuleItem[]); });

    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "industry_solutions")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) setSolutions(data.value as SolutionItem[]);
      });
  }, []);

  const toggleTop = (k: string) => {
    setOpenTop(prev => prev === k ? null : k);
    setOpenCat(null);
  };
  const toggleCat = (k: string) => setOpenCat(prev => prev === k ? null : k);

  // Group modules
  const grouped: Record<string, ModuleItem[]> = {};
  for (const m of modules) {
    const cat = m.category || "core";
    (grouped[cat] = grouped[cat] || []).push(m);
  }
  const visibleProductCats = CATEGORY_META.filter((c) => grouped[c.key]?.length);

  return (
    <div className="space-y-1">
      {/* PRODUCTS */}
      <div className="rounded-xl overflow-hidden">
        <button
          onClick={() => toggleTop("products")}
          className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </span>
            Products
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openTop === "products" ? "rotate-180" : ""}`} />
        </button>

        {openTop === "products" && (
          <div className="pb-2 space-y-1">
            {/* Featured */}
            <Link
              to={FEATURED.path}
              onClick={onNavigate}
              className="flex items-start gap-3 mx-2 mt-1 p-3 rounded-xl border border-primary/30 bg-primary/5"
            >
              <div className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: FEATURED.color + "1A" }}>
                <FEATURED.icon className="h-4 w-4" style={{ color: FEATURED.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                  {FEATURED.title}
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold">NEW</span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">{FEATURED.desc}</p>
              </div>
            </Link>

            {/* Categories */}
            <div className="px-2 space-y-0.5">
              {visibleProductCats.map((cat) => {
                const isOpen = openCat === cat.key;
                return (
                  <div key={cat.key} className="rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCat(cat.key)}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: cat.color + "15" }}>
                          <cat.icon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                        </span>
                        {cat.label}
                        <span className="text-[10px] text-muted-foreground">({grouped[cat.key].length})</span>
                      </span>
                      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                    </button>

                    {isOpen && (
                      <div className="ml-9 mr-1 mb-1 mt-0.5 space-y-0.5 border-l-2" style={{ borderColor: cat.color + "40" }}>
                        {grouped[cat.key].map((m) => {
                          const Icon = getIconComponent(iconNameMap[m.icon || ""] || "Heart");
                          const path = modulePathMap[m.name] || `/features/${m.name.replace(/_/g, "-")}`;
                          return (
                            <Link
                              key={m.name}
                              to={path}
                              onClick={onNavigate}
                              className="flex items-start gap-2.5 pl-3 pr-2 py-2 rounded-md hover:bg-muted/40 transition-colors"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: cat.color }} />
                              <div className="min-w-0">
                                <p className="text-[12.5px] font-medium text-foreground leading-tight">
                                  {appName} {m.label}
                                </p>
                                {m.description && (
                                  <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{m.description}</p>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SOLUTIONS */}
      {solutions.length > 0 && (
        <div className="rounded-xl overflow-hidden">
          <button
            onClick={() => toggleTop("solutions")}
            className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-lg bg-accent/30 flex items-center justify-center">
                <Briefcase className="h-3.5 w-3.5 text-foreground" />
              </span>
              Solutions
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openTop === "solutions" ? "rotate-180" : ""}`} />
          </button>

          {openTop === "solutions" && (
            <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
              {solutions.map((s) => {
                const Icon = getIconComponent(s.icon || "Heart");
                return (
                  <Link
                    key={s.slug}
                    to={`/solutions/${s.slug}`}
                    onClick={onNavigate}
                    className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: (s.color || "hsl(0,72%,50%)") + "15" }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: s.color || "hsl(0,72%,50%)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground leading-tight">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{s.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PRICING (flat link) */}
      <Link
        to="/pricing"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
        </span>
        Pricing
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
      </Link>

      {/* RESOURCES */}
      <div className="rounded-xl overflow-hidden">
        <button
          onClick={() => toggleTop("resources")}
          className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <BookOpen className="h-3.5 w-3.5 text-amber-500" />
            </span>
            Resources
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openTop === "resources" ? "rotate-180" : ""}`} />
        </button>

        {openTop === "resources" && (
          <div className="px-2 pb-2 space-y-0.5">
            {RESOURCE_CATEGORIES.map((cat) => {
              const isOpen = openCat === `res-${cat.id}`;
              return (
                <div key={cat.id} className="rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCat(`res-${cat.id}`)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: cat.color + "15" }}>
                        <cat.icon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                      </span>
                      {cat.label}
                    </span>
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="ml-9 mr-1 mb-1 mt-0.5 space-y-0.5 border-l-2" style={{ borderColor: cat.color + "40" }}>
                      {cat.items.map((item) => (
                        <Link
                          key={item.path + item.title}
                          to={item.path}
                          onClick={onNavigate}
                          className="block pl-3 pr-2 py-2 rounded-md hover:bg-muted/40 transition-colors"
                        >
                          <p className="text-[12.5px] font-medium text-foreground leading-tight">{item.title}</p>
                          <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{item.desc}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
