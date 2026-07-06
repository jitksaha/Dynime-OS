// @ts-nocheck
import { Link } from "react-router-dom";
import {
  Users, Target, DollarSign, Headphones, Briefcase, ShoppingBag,
  Megaphone, FileText, Calendar, MessageSquare, ArrowRight, Layers,
  BarChart3, Wallet, ClipboardList, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getModuleDisplayName } from "@/lib/module-labels";

interface Props {
  enabledModules: string[];
  counts: Record<string, any>;
  loading: boolean;
}

const moduleConfig: Record<string, { icon: React.ElementType; color: string; bg: string; link: string; stat?: (c: any) => string }> = {
  hrms: { icon: Users, color: "text-primary", bg: "bg-primary/10", link: "/hrms/employees", stat: (c) => `${c.employees || 0} employees` },
  crm: { icon: Target, color: "text-chart-2", bg: "bg-chart-2/10", link: "/crm", stat: (c) => `${c.deals || 0} active deals` },
  accounting: { icon: DollarSign, color: "text-warning", bg: "bg-warning/10", link: "/accounting/invoices", stat: (c) => `${c.pendingInvoices || 0} pending` },
  helpdesk: { icon: Headphones, color: "text-info", bg: "bg-info/10", link: "/helpdesk", stat: (c) => `${c.tickets || 0} open tickets` },
  projects: { icon: Briefcase, color: "text-primary", bg: "bg-primary/10", link: "/projects", stat: (c) => `${c.activeProjects || 0} active` },
  product_hub: { icon: ShoppingBag, color: "text-chart-3", bg: "bg-chart-3/10", link: "/pos", stat: () => "Point of Sale" },
  pos: { icon: ShoppingBag, color: "text-chart-3", bg: "bg-chart-3/10", link: "/pos", stat: () => "Point of Sale" },
  marketing: { icon: Megaphone, color: "text-chart-4", bg: "bg-chart-4/10", link: "/marketing/campaigns", stat: (c) => `${c.activeCampaigns || 0} campaigns` },
  documents: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted", link: "/documents", stat: () => "Document Manager" },
  calendar: { icon: Calendar, color: "text-info", bg: "bg-info/10", link: "/calendar", stat: () => "Calendar" },
  team_chat: { icon: MessageSquare, color: "text-chart-2", bg: "bg-chart-2/10", link: "/chat", stat: () => "Team Chat" },
  wallet: { icon: Wallet, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", link: "/wallet", stat: () => "Dynime Pay" },
  reports: { icon: BarChart3, color: "text-chart-5", bg: "bg-chart-5/10", link: "/reports", stat: () => "Reports & Analytics" },
  workflows: { icon: ClipboardList, color: "text-chart-3", bg: "bg-chart-3/10", link: "/workflows", stat: () => "Automations" },
  bookings: { icon: BookOpen, color: "text-info", bg: "bg-info/10", link: "/bookings", stat: () => "Bookings" },
};

// Priority order for display
const PRIORITY = ["crm", "hrms", "accounting", "projects", "helpdesk", "marketing", "product_hub", "pos", "wallet", "documents", "calendar", "team_chat", "reports", "workflows", "bookings"];

export function DashboardModuleHub({ enabledModules, counts, loading }: Props) {
  // Sort modules by priority, filter to enabled + configured
  const sortedModules = PRIORITY.filter(
    (m) => enabledModules.includes(m) && moduleConfig[m]
  );

  // Deduplicate pos/product_hub
  const deduped = sortedModules.filter((m) => {
    if (m === "pos" && sortedModules.includes("product_hub")) return false;
    return true;
  });

  const displayModules = deduped.slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Your Modules</h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
          {deduped.length} active
        </span>
      </div>

      {displayModules.length === 0 ? (
        <div className="text-center py-6">
          <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No modules activated yet.</p>
          <Link to="/subscription" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">
            Browse Plans →
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayModules.map((key) => {
            const cfg = moduleConfig[key];
            const Icon = cfg.icon;
            const label = getModuleDisplayName(key);
            const stat = cfg.stat ? cfg.stat(counts) : "";

            return (
              <Link
                key={key}
                to={cfg.link}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors group"
              >
                <div className={cn("p-2 rounded-lg shrink-0", cfg.bg)}>
                  <Icon className={cn("h-4 w-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
                  {!loading && stat && (
                    <p className="text-[10px] text-muted-foreground truncate">{stat}</p>
                  )}
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {deduped.length > 8 && (
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          +{deduped.length - 8} more modules
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <Link
          to="/subscription"
          className="flex items-center justify-center gap-1.5 w-full h-8 rounded-xl bg-primary/5 border border-primary/10 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          Manage Modules <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
