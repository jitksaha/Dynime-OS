import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Layers, GitBranch, ArrowUpRight, Target, DollarSign, Headphones, Clock, BarChart3, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

const MODULE_LINKS: Record<string, string> = {
  employees: "/hrms/employees",
  deals: "/crm",
  invoices: "/accounting/invoices",
  expenses: "/accounting/expenses",
  payments: "/accounting/payments",
  tickets: "/helpdesk",
  projects: "/projects",
  attendance_records: "/hrms/attendance",
  campaigns: "/marketing/campaigns",
  documents: "/documents",
  leave_requests: "/hrms/leave",
  payroll_records: "/hrms/payroll",
  departments: "/departments",
  approval_workflows: "/approvals",
  budgets: "/accounting/budget-tracking",
};

export default function CompanyAdminDashboard() {
  const { profile } = useAuth();
  const { symbol: cs } = useTenantCurrency();
  const [stats, setStats] = useState({
    employees: 0, departments: 0, workflows: 0,
    deals: 0, dealValue: 0, openTickets: 0, invoiceTotal: 0, attendance: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const tid = profile.tenant_id;
    const fetchAll = async () => {
      const [empRes, depRes, wfRes, dealRes, ticketRes, invRes, attRes, activityRes] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("approval_workflows").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("deals").select("value").eq("tenant_id", tid),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("tenant_id", tid).eq("status", "Open"),
        supabase.from("invoices").select("amount, status").eq("tenant_id", tid).eq("status", "Paid"),
        supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("tenant_id", tid).eq("attendance_date", new Date().toISOString().split("T")[0]),
        supabase.from("audit_logs").select("id, action, module, resource_type, created_at, details").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(15),
      ]);
      const deals = dealRes.data || [];
      const invoices = invRes.data || [];
      setStats({
        employees: empRes.count || 0,
        departments: depRes.count || 0,
        workflows: wfRes.count || 0,
        deals: deals.length,
        dealValue: deals.reduce((a: number, b: any) => a + (b.value || 0), 0),
        openTickets: ticketRes.count || 0,
        invoiceTotal: invoices.reduce((a: number, b: any) => a + Number(b.amount || 0), 0),
        attendance: attRes.count || 0,
      });
      setRecentActivity(activityRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [profile?.tenant_id]);

  const cards = [
    { label: "Employees", value: stats.employees, icon: Users, color: "text-primary", bg: "bg-primary/10", link: "/company-employees" },
    { label: "Departments", value: stats.departments, icon: Layers, color: "text-chart-2", bg: "bg-chart-2/10", link: "/departments" },
    { label: "Approval Workflows", value: stats.workflows, icon: GitBranch, color: "text-warning", bg: "bg-warning/10", link: "/approvals" },
    { label: "Active Deals", value: stats.deals, icon: Target, color: "text-success", bg: "bg-success/10", link: "/crm" },
    { label: "Revenue (Paid)", value: `${cs}${stats.invoiceTotal.toLocaleString()}`, icon: DollarSign, color: "text-warning", bg: "bg-warning/10", link: "/accounting/invoices" },
    { label: "Open Tickets", value: stats.openTickets, icon: Headphones, color: "text-info", bg: "bg-info/10", link: "/helpdesk" },
    { label: "Today's Attendance", value: stats.attendance, icon: Clock, color: "text-chart-5", bg: "bg-chart-5/10", link: "/hrms/attendance" },
    { label: "Deal Pipeline", value: `${cs}${stats.dealValue >= 1000 ? (stats.dealValue / 1000).toFixed(0) + "K" : stats.dealValue}`, icon: BarChart3, color: "text-primary", bg: "bg-primary/10", link: "/crm" },
  ];

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getActivityLabel = (log: any) => {
    const action = ACTION_LABELS[log.action] || log.action;
    const module = (log.resource_type || log.module || "record").replace(/_/g, " ");
    return `${action} ${module}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Company Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your company's settings, departments, and employees</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.link}
            className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {loading ? <span className="inline-block h-7 w-12 bg-muted rounded-lg animate-pulse" /> : c.value}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </div>
            <ArrowUpRight className="absolute top-3 right-3 h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      {/* Recent Activity — real data from audit_logs */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          <span className="text-xs text-muted-foreground">{recentActivity.length} latest events</span>
        </div>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet. Actions like creating employees, deals, invoices will appear here automatically.</p>
          ) : (
            recentActivity.map((log: any) => {
              const mod = log.resource_type || log.module || "";
              const link = MODULE_LINKS[mod] || "#";
              return (
                <Link
                  key={log.id}
                  to={link}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {getActivityLabel(log)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mod.replace(/_/g, " ") || "System"} · {formatTimeAgo(log.created_at)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
