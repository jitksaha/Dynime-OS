import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle2, AlertTriangle, Flame, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface Props {
  counts: Record<string, any>;
}

export function DashboardProgressGoals({ counts }: Props) {
  const { symbol: cs } = useTenantCurrency();

  const goals = [
    {
      label: "Revenue Goal",
      description: "Monthly income target",
      target: 50000,
      current: counts.invoiceTotal || 0,
      color: "bg-emerald-500",
      trackColor: "bg-emerald-500/15",
      format: (v: number) => `${cs}${v >= 1000 ? (v / 1000).toFixed(1) + "K" : v}`,
      link: "/accounting/invoices",
    },
    {
      label: "CRM Pipeline",
      description: "Active deal target",
      target: 20,
      current: counts.deals || 0,
      color: "bg-primary",
      trackColor: "bg-primary/15",
      format: (v: number) => `${v} deals`,
      link: "/crm",
    },
    {
      label: "Support Health",
      description: "Open ticket count",
      target: 0,
      current: counts.tickets || 0,
      color: "bg-destructive",
      trackColor: "bg-destructive/15",
      format: (v: number) => `${v} open`,
      invert: true,
      link: "/helpdesk",
    },
    {
      label: "Team Growth",
      description: "Headcount target",
      target: 50,
      current: counts.employees || 0,
      color: "bg-info",
      trackColor: "bg-info/15",
      format: (v: number) => `${v} people`,
      link: "/hrms/employees",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Business Goals</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track progress across your core modules.</p>
        </div>
        <Link to="/reports" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {goals.map((goal) => {
          const pct = goal.invert
            ? (goal.current === 0 ? 100 : Math.max(0, 100 - goal.current * 10))
            : goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;

          const status = pct >= 100 ? "completed" : pct >= 75 ? "on_track" : pct >= 50 ? "near_limit" : "low";

          const statusConfig = {
            completed: { icon: CheckCircle2, label: "Completed!", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
            on_track: { icon: Flame, label: "On Track", color: "text-primary", bg: "bg-primary/10" },
            near_limit: { icon: AlertTriangle, label: "Near limit", color: "text-warning", bg: "bg-warning/10" },
            low: { icon: TrendingUp, label: "Getting started", color: "text-muted-foreground", bg: "bg-muted" },
          };

          const cfg = statusConfig[status];
          const StatusIcon = cfg.icon;

          return (
            <Link
              key={goal.label}
              to={goal.link}
              className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/15 hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-foreground tracking-tight">
                  {goal.format(goal.current)}
                </p>
                <div className={cn("p-1.5 rounded-lg", cfg.bg)}>
                  <StatusIcon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className={cn("h-1.5 rounded-full w-full", goal.trackColor)}>
                  <div
                    className={cn("h-1.5 rounded-full transition-all duration-700", goal.color)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {goal.invert ? `${goal.current} remaining` : `${goal.format(goal.current)} / ${goal.format(goal.target)}`}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{pct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div>
                  <p className="text-[10px] font-semibold text-foreground">{goal.label}</p>
                  <p className="text-[9px] text-muted-foreground">{goal.description}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
