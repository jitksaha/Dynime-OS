import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { usePlatformModules, NEW_MODULE_NAMES, CATEGORY_LABELS } from "@/hooks/usePlatformModules";
import { getIconComponent } from "@/components/MegaMenuDropdown";

const ICON_NORMALIZE: Record<string, string> = {
  users: "Users", handshake: "Target", megaphone: "Megaphone", workflow: "GitBranch",
  calculator: "Receipt", headphones: "Headphones", kanban: "FolderKanban",
  file: "FileText", "bar-chart": "BarChart3", wallet: "Wallet",
  "shopping-bag": "ShoppingCart", "message-square": "MessageSquare", calendar: "Calendar",
  briefcase: "Briefcase", percent: "Percent", shield: "Shield", zap: "Zap",
  globe: "Globe", smartphone: "Smartphone", phone: "Phone", video: "Video",
  bell: "Bell", code: "Code", mail: "Mail", bot: "Bot", target: "Target",
  "refresh-cw": "RefreshCw", "pie-chart": "PieChart", "graduation-cap": "GraduationCap",
  monitor: "Monitor", "dollar-sign": "DollarSign", building: "Building", leaf: "Leaf",
  store: "Store", map: "Map", gamepad: "Gamepad2", receipt: "Receipt",
  activity: "Activity", "building-2": "Building2", layers: "Layers",
};

interface Props {
  /** Optional override title. */
  title?: string;
  /** Optional override eyebrow. */
  eyebrow?: string;
  /** Optional override description. */
  description?: string;
  /** Limit max categories shown (defaults to all). */
  maxCategories?: number;
  /** Filter to specific category keys */
  categoryKeys?: string[];
}

export function ModuleGrid({
  title = "One platform. Every workflow.",
  eyebrow = "Modules",
  description = "Toggle any module on or off — pay only for what your team uses.",
  maxCategories,
  categoryKeys,
}: Props) {
  const { byCategory, isLoading, routeFor, modules } = usePlatformModules();

  const cats = useMemo(() => {
    const all = Object.keys(byCategory);
    const ordered = Object.keys(CATEGORY_LABELS).filter((k) => all.includes(k));
    const remainder = all.filter((k) => !ordered.includes(k));
    let list = [...ordered, ...remainder];
    if (categoryKeys) list = list.filter((k) => categoryKeys.includes(k));
    if (maxCategories) list = list.slice(0, maxCategories);
    return list;
  }, [byCategory, maxCategories, categoryKeys]);

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const activeKey = activeCat || cats[0];
  const visibleModules = activeKey ? byCategory[activeKey] || [] : [];

  return (
    <section className="border-y border-border bg-background py-16 sm:py-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{eyebrow}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">{description}</p>
          {!isLoading && modules.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{modules.length}+</span> modules across{" "}
              <span className="font-bold text-foreground">{cats.length}</span> categories
            </p>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {cats.map((c) => {
            const active = c === activeKey;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {CATEGORY_LABELS[c] || c}
                <span className="ml-1.5 text-[10px] opacity-70">{byCategory[c]?.length}</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {visibleModules.map((m) => {
              const Icon = getIconComponent(ICON_NORMALIZE[m.icon || ""] || "Layers");
              const isNew = NEW_MODULE_NAMES.has(m.name);
              return (
                <Link
                  key={m.name}
                  to={routeFor(m)}
                  className="group relative p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
                >
                  {isNew && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                      <Sparkles className="h-2.5 w-2.5" /> New
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {m.label}
                        </h3>
                        {m.is_premium && (
                          <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-500/10 text-amber-600">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                        {m.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
