// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Crown, ArrowRight, Monitor, Zap, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { DashboardWidgets } from "@/components/DashboardWidgets";
import { DashboardCharts } from "@/components/DashboardCharts";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AIInsightsWidget } from "@/components/AIInsightsWidget";
import { DashboardMeetingWidget } from "@/components/meetings/DashboardMeetingWidget";
import { DashboardProgressGoals } from "@/components/DashboardProgressGoals";
import { DashboardModuleHub } from "@/components/DashboardModuleHub";
import { useKybStatus } from "@/hooks/useKybStatus";
import { supabase } from "@/integrations/supabase/db";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

export default function Dashboard() {
  const navigate = useNavigate();
  const { tenantId, supabase: tenantSupabase } = useTenant();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { roles } = useUserRole();
  const { isVerified } = useKybStatus();
  const { isFreePlan } = useSubscriptionGate();
  const { enabledModules } = useModuleAccess();
  const { symbol: cs } = useTenantCurrency();
  const primaryRole = roles[0];
  const [counts, setCounts] = useState<Record<string, any>>({
    employees: 0, deals: 0, dealValue: 0, tickets: 0, invoiceTotal: 0,
    attendanceToday: 0, activeProjects: 0, pendingInvoices: 0, activeCampaigns: 0,
    expenseTotal: 0,
  });
  const [prevCounts, setPrevCounts] = useState<Record<string, any>>({
    employees: 0, deals: 0, dealValue: 0, tickets: 0, invoiceTotal: 0,
    attendanceToday: 0, activeProjects: 0, pendingInvoices: 0, activeCampaigns: 0,
    expenseTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!tenantId) return;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [emp, deals, tickets, invoices, attendance, projects, pendingInv, campaigns, expenses,
           prevEmp, prevDeals, prevTickets, prevInvoices, prevProjects, prevCampaigns, prevExpenses] = await Promise.all([
      tenantSupabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      tenantSupabase.from("deals").select("id, value").eq("tenant_id", tenantId),
      tenantSupabase.from("tickets").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "Open"),
      tenantSupabase.from("invoices").select("amount").eq("tenant_id", tenantId).eq("status", "Paid"),
      tenantSupabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("attendance_date", new Date().toISOString().split("T")[0]),
      tenantSupabase.from("projects").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).neq("status", "Completed"),
      tenantSupabase.from("invoices").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "Pending"),
      tenantSupabase.from("campaigns").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "Active"),
      tenantSupabase.from("expenses").select("amount").eq("tenant_id", tenantId).eq("status", "Approved"),
      // Previous period
      tenantSupabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).lt("created_at", thirtyDaysAgo),
      tenantSupabase.from("deals").select("id, value").eq("tenant_id", tenantId).lt("created_at", thirtyDaysAgo),
      tenantSupabase.from("tickets").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "Open").lt("created_at", thirtyDaysAgo),
      tenantSupabase.from("invoices").select("amount").eq("tenant_id", tenantId).eq("status", "Paid").lt("created_at", thirtyDaysAgo),
      tenantSupabase.from("projects").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).neq("status", "Completed").lt("created_at", thirtyDaysAgo),
      tenantSupabase.from("campaigns").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "Active").lt("created_at", thirtyDaysAgo),
      tenantSupabase.from("expenses").select("amount").eq("tenant_id", tenantId).eq("status", "Approved").lt("created_at", thirtyDaysAgo),
    ]);

    const dealValue = (deals.data || []).reduce((a: number, b: any) => a + (b.value || 0), 0);
    const invoiceTotal = (invoices.data || []).reduce((a: number, b: any) => a + (b.amount || 0), 0);
    const expenseTotal = (expenses.data || []).reduce((a: number, b: any) => a + (b.amount || 0), 0);
    const prevDealValue = (prevDeals.data || []).reduce((a: number, b: any) => a + (b.value || 0), 0);
    const prevInvoiceTotal = (prevInvoices.data || []).reduce((a: number, b: any) => a + (b.amount || 0), 0);
    const prevExpenseTotal = (prevExpenses.data || []).reduce((a: number, b: any) => a + (b.amount || 0), 0);

    setCounts({
      employees: emp.count || 0, deals: deals.data?.length || 0, dealValue, tickets: tickets.count || 0,
      invoiceTotal, expenseTotal, attendanceToday: attendance.count || 0, activeProjects: projects.count || 0,
      pendingInvoices: pendingInv.count || 0, activeCampaigns: campaigns.count || 0,
    });
    setPrevCounts({
      employees: prevEmp.count || 0, deals: prevDeals.data?.length || 0, dealValue: prevDealValue,
      tickets: prevTickets.count || 0, invoiceTotal: prevInvoiceTotal, expenseTotal: prevExpenseTotal,
      attendanceToday: 0, activeProjects: prevProjects.count || 0, pendingInvoices: 0, activeCampaigns: prevCampaigns.count || 0,
    });
    setLoading(false);
  }, [tenantId, tenantSupabase]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("company-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchCounts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchCounts]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  // Net profit
  const netProfit = (counts.invoiceTotal || 0) - (counts.expenseTotal || 0);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-[1400px] mx-auto">
      {/* ── Welcome Header ── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {greeting()}{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("dashboard_subtitle")}</p>
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

      {/* ── Banners ── */}
      {isFreePlan && (
        <motion.div variants={fadeUp} className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="p-2 rounded-xl bg-primary/10"><Crown className="h-4 w-4 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">You're on the Free Plan</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Unlock all modules, unlimited users, and premium features.</p>
          </div>
          <Link to="/subscription" className="shrink-0 inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            Upgrade <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      )}

      {isVerified && (
        <motion.div variants={fadeUp} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
          <BadgeCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Verified Business</p>
            <p className="text-xs text-muted-foreground">Your company is verified with full access to premium features.</p>
          </div>
        </motion.div>
      )}

      {/* ── KPI Widgets ── */}
      <motion.div variants={fadeUp}>
        <DashboardWidgets counts={counts} prevCounts={prevCounts} loading={loading} userRole={primaryRole} />
      </motion.div>

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* ── Left Column ── */}
        <div className="space-y-5 min-w-0">
          {/* Financial Summary Row */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-xs text-muted-foreground font-medium mb-1">Total Income</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {loading ? <span className="inline-block h-7 w-20 bg-muted rounded animate-pulse" /> : `${cs}${counts.invoiceTotal.toLocaleString()}`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">From paid invoices</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-xs text-muted-foreground font-medium mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {loading ? <span className="inline-block h-7 w-20 bg-muted rounded animate-pulse" /> : `${cs}${counts.expenseTotal.toLocaleString()}`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Approved expenses</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-xs text-muted-foreground font-medium mb-1">Net Profit</p>
              <p className={`text-2xl font-bold tracking-tight ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {loading ? <span className="inline-block h-7 w-20 bg-muted rounded animate-pulse" /> : `${cs}${netProfit.toLocaleString()}`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Income − Expenses</p>
            </div>
          </motion.div>

          {/* Charts */}
          <motion.div variants={fadeUp}>
            <DashboardCharts counts={counts} />
          </motion.div>

          {/* Module Goals */}
          <motion.div variants={fadeUp}>
            <DashboardProgressGoals counts={counts} />
          </motion.div>

          {/* AI Insights */}
          <motion.div variants={fadeUp}>
            <AIInsightsWidget businessData={counts} />
          </motion.div>

          {/* Remote Tracking Quick Access Widget */}
          <motion.div variants={fadeUp}>
            <div className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Remote Work Tracker</h3>
                  <p className="text-xs text-muted-foreground">Monitor productivity & time tracking</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate("/remote-tracking")}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left group"
                >
                  <BarChart3 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Admin Dashboard</p>
                    <p className="text-[10px] text-muted-foreground">View team activity</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/remote-tracking/employee")}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left group"
                >
                  <Zap className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <p className="text-xs font-medium text-foreground">My Tracker</p>
                    <p className="text-[10px] text-muted-foreground">Start tracking work</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-5">
          {/* Active Modules Hub */}
          <motion.div variants={fadeUp}>
            <DashboardModuleHub enabledModules={enabledModules} counts={counts} loading={loading} />
          </motion.div>

          {/* Meetings */}
          <motion.div variants={fadeUp}>
            <DashboardMeetingWidget />
          </motion.div>

          {/* Activity */}
          <motion.div variants={fadeUp}>
            <ActivityFeed />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
