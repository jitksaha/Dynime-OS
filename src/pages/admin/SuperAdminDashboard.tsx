import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Users, CreditCard, Headphones, Activity, DollarSign, Globe,
  ArrowUpRight, TrendingUp, TrendingDown, Minus, Server, ShieldCheck,
  BarChart3, Zap, ArrowRight, Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/db";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";

export default function SuperAdminDashboard() {
  const { formatPrice: fp } = usePlatformCurrency();
  const [stats, setStats] = useState({
    totalTenants: 0, activeTenants: 0, suspendedTenants: 0,
    totalUsers: 0, totalSubscriptions: 0, totalRevenue: 0,
    openTickets: 0, totalPlans: 0, recentLogs: 0,
    monthlyRevenue: 0,
  });
  const [prevStats, setPrevStats] = useState({
    totalTenants: 0, activeTenants: 0, totalUsers: 0,
    totalSubscriptions: 0, totalRevenue: 0, openTickets: 0,
  });
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [tenantsRes, profilesRes, subsRes, ticketsRes, plansRes, logsRes,
           prevTenantsRes, prevProfilesRes, prevSubsRes, prevTicketsRes, monthlySubsRes] = await Promise.all([
      supabase.from("tenants").select("id, name, plan, is_active, created_at, slug").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("tenant_subscriptions").select("id, amount, status"),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "Open"),
      supabase.from("subscription_plans").select("id", { count: "exact", head: true }),
      supabase.from("audit_logs").select("id, action, module, resource_type, created_at, details").order("created_at", { ascending: false }).limit(8),
      supabase.from("tenants").select("id, is_active", { count: "exact" }).lt("created_at", thirtyDaysAgo),
      supabase.from("profiles").select("id", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo),
      supabase.from("tenant_subscriptions").select("id, amount, status").lt("created_at", thirtyDaysAgo),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "Open").lt("created_at", thirtyDaysAgo),
      supabase.from("tenant_subscriptions").select("amount, status").gte("created_at", monthStart),
    ]);

    const tenants = tenantsRes.data || [];
    const subs = subsRes.data || [];
    const revenue = subs.filter((s: any) => s.status === "active").reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
    const monthlyRevenue = (monthlySubsRes.data || []).filter((s: any) => s.status === "active").reduce((a: number, b: any) => a + Number(b.amount || 0), 0);

    const prevTenants = prevTenantsRes.data || [];
    const prevSubs = prevSubsRes.data || [];
    const prevRevenue = prevSubs.filter((s: any) => s.status === "active").reduce((a: number, b: any) => a + Number(b.amount || 0), 0);

    setStats({
      totalTenants: tenants.length, activeTenants: tenants.filter((t: any) => t.is_active).length,
      suspendedTenants: tenants.filter((t: any) => !t.is_active).length,
      totalUsers: profilesRes.count || 0, totalSubscriptions: subs.length, totalRevenue: revenue,
      openTickets: ticketsRes.count || 0, totalPlans: plansRes.count || 0, recentLogs: logsRes.data?.length || 0,
      monthlyRevenue,
    });
    setPrevStats({
      totalTenants: prevTenants.length, activeTenants: prevTenants.filter((t: any) => t.is_active).length,
      totalUsers: prevProfilesRes.count || 0, totalSubscriptions: prevSubs.length,
      totalRevenue: prevRevenue, openTickets: prevTicketsRes.count || 0,
    });
    setRecentTenants(tenants.slice(0, 5));
    setRecentActivity(logsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("superadmin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tenant_subscriptions" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const getGrowth = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return { pct: 0, direction: "neutral" as const };
    if (previous === 0) return { pct: 100, direction: "up" as const };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { pct: Math.abs(pct), direction: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "neutral" as const };
  };

  const GrowthBadge = ({ current, previous, invertColor = false }: { current: number; previous: number; invertColor?: boolean }) => {
    const { pct, direction } = getGrowth(current, previous);
    if (direction === "neutral") return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> 0%</span>;
    const isPositive = invertColor ? direction === "down" : direction === "up";
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
        {direction === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {pct}%
      </span>
    );
  };

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  const statCards = [
    { label: "Total Companies", value: stats.totalTenants, prev: prevStats.totalTenants, icon: Building2, color: "text-primary", bg: "bg-primary/10", link: "/superadmin/tenants" },
    { label: "Active Users", value: stats.totalUsers, prev: prevStats.totalUsers, icon: Users, color: "text-success", bg: "bg-success/10", link: "/superadmin/users" },
    { label: "Total Revenue", value: fp(stats.totalRevenue), rawValue: stats.totalRevenue, prev: prevStats.totalRevenue, icon: DollarSign, color: "text-warning", bg: "bg-warning/10", link: "/superadmin/billing" },
    { label: "Subscriptions", value: stats.totalSubscriptions, prev: prevStats.totalSubscriptions, icon: CreditCard, color: "text-info", bg: "bg-info/10", link: "/superadmin/subscriptions" },
    { label: "Active Tenants", value: stats.activeTenants, prev: prevStats.activeTenants, icon: Globe, color: "text-chart-4", bg: "bg-chart-4/10", link: "/superadmin/tenants" },
    { label: "Open Tickets", value: stats.openTickets, prev: prevStats.openTickets, icon: Headphones, color: "text-destructive", bg: "bg-destructive/10", link: "/helpdesk", invertColor: true },
  ];

  const activityLinks: Record<string, string> = {
    employees: "/hrms/employees", deals: "/crm", invoices: "/accounting/invoices",
    expenses: "/accounting/expenses", payments: "/accounting/payments", tickets: "/helpdesk",
    projects: "/projects", attendance_records: "/hrms/attendance", campaigns: "/marketing/campaigns",
    documents: "/documents", leave_requests: "/hrms/leave", payroll_records: "/hrms/payroll",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const conversionRate = stats.totalTenants > 0 ? Math.round((stats.activeTenants / stats.totalTenants) * 100) : 0;
  const arpu = stats.activeTenants > 0 ? stats.totalRevenue / stats.activeTenants : 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">System-wide metrics across all tenants and users</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <Link
            key={s.label}
            to={s.link}
            className="group relative p-4 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <GrowthBadge current={s.rawValue ?? (typeof s.value === "number" ? s.value : 0)} previous={s.prev} invertColor={s.invertColor} />
            </div>
          </Link>
        ))}
      </motion.div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* Left Column */}
        <div className="space-y-5 min-w-0">
          {/* Revenue & Metrics Row */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">Monthly Revenue</p>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{fp(stats.monthlyRevenue)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Current billing period</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">Conversion Rate</p>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-1">Active / Total tenants</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">ARPU</p>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{fp(arpu)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Avg revenue per user</p>
            </div>
          </motion.div>

          {/* Platform Health */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Platform Health</h2>
              </div>
              <Link to="/superadmin/system" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Active Tenants", value: stats.activeTenants, total: stats.totalTenants, color: "bg-success" },
                { label: "Suspended", value: stats.suspendedTenants, total: stats.totalTenants, color: "bg-destructive" },
                { label: "Plans Available", value: stats.totalPlans, total: null, color: "bg-info" },
                { label: "Audit Events", value: stats.recentLogs, total: null, color: "bg-warning" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-2 w-2 rounded-full ${item.color}`} />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{item.value}</p>
                  {item.total !== null && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all`}
                          style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              </div>
              <Link to="/superadmin/audit-logs" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity logged yet</p>
              ) : recentActivity.map((log: any) => {
                const mod = log.resource_type || log.module || "";
                const link = activityLinks[mod] || "#";
                return (
                  <Link
                    key={log.id} to={link}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group"
                  >
                    <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{log.action}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {log.module || "System"} · {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "Manage Tenants", icon: Building2, path: "/superadmin/tenants", desc: "View & manage companies" },
                { label: "User Management", icon: Users, path: "/superadmin/users", desc: "Global user directory" },
                { label: "Billing & Plans", icon: CreditCard, path: "/superadmin/subscriptions", desc: "Subscription plans" },
                { label: "Security Suite", icon: ShieldCheck, path: "/superadmin/security-suite", desc: "Security controls" },
                { label: "System Status", icon: Server, path: "/superadmin/system", desc: "Health & monitoring" },
              ].map((action) => (
                <Link
                  key={action.path} to={action.path}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                    <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Companies */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Companies</h2>
              <Link to="/superadmin/tenants" className="text-xs text-primary font-medium hover:underline">View all</Link>
            </div>
            <div className="space-y-1.5">
              {recentTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No companies yet</p>
              ) : recentTenants.map((t: any) => (
                <Link
                  key={t.id} to="/superadmin/tenants"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{(t.name || "?")[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{t.plan} plan</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {t.is_active ? "Active" : "Suspended"}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
