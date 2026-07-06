// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, FileText, Users, Target, DollarSign, Headphones, Clock, Package, Briefcase, BarChart3, Zap, Calendar, ShoppingBag, ArrowRight } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  action: string;
  module: string | null;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
  details: any;
}

const moduleIcons: Record<string, React.ElementType> = {
  hrms: Users, employees: Users, crm: Target, deals: Target,
  accounting: DollarSign, invoices: DollarSign, expenses: DollarSign, payments: DollarSign,
  helpdesk: Headphones, tickets: Headphones,
  documents: FileText, attendance: Clock, attendance_records: Clock,
  wallet: Package, projects: Briefcase, reports: BarChart3,
  workflows: Zap, campaigns: Zap, leave_requests: Calendar,
  payroll_records: DollarSign, product_hub: ShoppingBag,
};

const moduleColors: Record<string, { color: string; bg: string }> = {
  hrms: { color: "text-primary", bg: "bg-primary/10" },
  employees: { color: "text-primary", bg: "bg-primary/10" },
  crm: { color: "text-chart-2", bg: "bg-chart-2/10" },
  deals: { color: "text-chart-2", bg: "bg-chart-2/10" },
  accounting: { color: "text-warning", bg: "bg-warning/10" },
  invoices: { color: "text-warning", bg: "bg-warning/10" },
  expenses: { color: "text-warning", bg: "bg-warning/10" },
  payments: { color: "text-warning", bg: "bg-warning/10" },
  payroll_records: { color: "text-warning", bg: "bg-warning/10" },
  helpdesk: { color: "text-info", bg: "bg-info/10" },
  tickets: { color: "text-info", bg: "bg-info/10" },
  documents: { color: "text-chart-4", bg: "bg-chart-4/10" },
  attendance: { color: "text-chart-5", bg: "bg-chart-5/10" },
  attendance_records: { color: "text-chart-5", bg: "bg-chart-5/10" },
  wallet: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  projects: { color: "text-primary", bg: "bg-primary/10" },
  workflows: { color: "text-chart-3", bg: "bg-chart-3/10" },
  campaigns: { color: "text-chart-3", bg: "bg-chart-3/10" },
  leave_requests: { color: "text-info", bg: "bg-info/10" },
};

const moduleLinks: Record<string, string> = {
  employees: "/hrms/employees", deals: "/crm", invoices: "/accounting/invoices",
  expenses: "/accounting/expenses", payments: "/accounting/payments", tickets: "/helpdesk",
  documents: "/documents", attendance_records: "/hrms/attendance", leave_requests: "/hrms/leave",
  campaigns: "/marketing/campaigns", projects: "/projects", payroll_records: "/hrms/payroll",
  approval_workflows: "/workflows", hrms: "/hrms/employees", crm: "/crm",
  accounting: "/accounting/invoices", helpdesk: "/helpdesk", attendance: "/hrms/attendance",
  wallet: "/wallet", workflows: "/workflows",
};

const friendlyTableNames: Record<string, string> = {
  employees: "Employee", deals: "Deal", invoices: "Invoice", expenses: "Expense",
  payments: "Payment", tickets: "Ticket", documents: "Document",
  attendance_records: "Attendance", leave_requests: "Leave request",
  campaigns: "Campaign", projects: "Project", payroll_records: "Payroll",
  workflows: "Workflow", approval_workflows: "Workflow",
};

function formatAction(item: ActivityItem): string {
  const raw = item.action;
  if (raw && !["INSERT", "UPDATE", "DELETE"].includes(raw)) return raw;
  const table = item.resource_type || item.module || "Record";
  const friendly = friendlyTableNames[table] || table.replace(/_/g, " ");
  const details = item.details as any;
  const getName = (): string => {
    if (!details) return "";
    const d = details.new || details.old || {};
    return d.full_name || d.name || d.title || d.employee_name || d.description?.slice(0, 40) || "";
  };
  const name = getName();
  const nameStr = name ? ` "${name}"` : "";
  switch (raw) {
    case "INSERT": return `New ${friendly.toLowerCase()}${nameStr} created`;
    case "UPDATE": return `${friendly}${nameStr} updated`;
    case "DELETE": return `${friendly}${nameStr} deleted`;
    default: return `${friendly} ${raw.toLowerCase()}`;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(item: ActivityItem): string {
  const details = item.details as any;
  if (!details) return "?";
  const d = details.new || details.old || {};
  const name = d.full_name || d.name || d.title || d.employee_name || "";
  if (!name) return (item.resource_type || "A")[0].toUpperCase();
  return name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function ActivityFeed() {
  const { tenantId, supabase } = useTenant();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, module, resource_type, resource_id, created_at, details")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(15);
      setActivities((data as ActivityItem[]) || []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel("audit-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        const newItem = payload.new as ActivityItem & { tenant_id?: string };
        if (newItem.tenant_id === tenantId) {
          setActivities((prev) => [newItem as ActivityItem, ...prev.filter(a => a.id !== newItem.id)].slice(0, 15));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  const getLink = (item: ActivityItem): string | null => {
    const mod = item.resource_type || item.module || "";
    return moduleLinks[mod] || null;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="h-4 w-32 bg-muted rounded-lg mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-2 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <button onClick={() => navigate("/audit-logs")} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
          {activities.map((item) => {
            const mod = item.module?.toLowerCase() || item.resource_type?.toLowerCase() || "system";
            const cfg = moduleColors[mod] || { color: "text-muted-foreground", bg: "bg-muted" };
            const _Icon = moduleIcons[mod] || Activity;
            const displayAction = formatAction(item);
            const link = getLink(item);
            const initials = getInitials(item);

            return (
              <div
                key={item.id}
                onClick={() => link && navigate(link)}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors",
                  link && "cursor-pointer"
                )}
              >
                {/* Avatar circle */}
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", cfg.bg, cfg.color)}>
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium truncate">{displayAction}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.created_at)}</p>
                </div>

                {/* Action indicator */}
                <span className={cn(
                  "text-[10px] font-semibold shrink-0",
                  item.action === "INSERT" ? "text-emerald-600 dark:text-emerald-400" : item.action === "DELETE" ? "text-destructive" : "text-muted-foreground"
                )}>
                  {item.action === "INSERT" ? "+New" : item.action === "DELETE" ? "Removed" : "Updated"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
