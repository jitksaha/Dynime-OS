import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { usePlatformModules, NEW_MODULE_NAMES } from "@/hooks/usePlatformModules";
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
  /** Limit to siblings of this category (auto-detect when omitted) */
  category?: string;
  /** Module name to exclude (the current page) */
  excludeName?: string;
  /** Maximum cards to show */
  limit?: number;
}

export function RelatedModulesSection({ category, excludeName, limit = 6 }: Props) {
  const { modules, isLoading, routeFor } = usePlatformModules();
  const { pathname } = useLocation();

  // Auto-detect from current path if not provided
  const currentModule = excludeName
    ? modules.find((m) => m.name === excludeName)
    : modules.find((m) => routeFor(m) === pathname);

  const targetCategory = category || currentModule?.category || "core";
  const list = modules
    .filter((m) => m.category === targetCategory && m.name !== currentModule?.name)
    .slice(0, limit);

  if (isLoading || list.length === 0) return null;

  return (
    <section className="border-t border-border bg-muted/20 py-16 sm:py-20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-3">
            Related
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Pairs nicely with
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Modules in the same category that work hand-in-hand.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((m, i) => {
            const Icon = getIconComponent(ICON_NORMALIZE[m.icon || ""] || "Layers");
            const isNew = NEW_MODULE_NAMES.has(m.name);
            return (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <Link
                  to={routeFor(m)}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all h-full"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 group-hover:scale-110 transition-all">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {m.label}
                      </h3>
                      {isNew && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-primary text-primary-foreground">
                          <Sparkles className="h-2 w-2" /> New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                      {m.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
