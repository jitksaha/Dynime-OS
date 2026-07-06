import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, DollarSign, Target, Users, ArrowUpRight, BarChart3, Calendar } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

type DateRange = "3m" | "6m" | "12m";

interface DashboardChartsProps {
  counts: Record<string, any>;
}

export function DashboardCharts({ counts }: DashboardChartsProps) {
  const { symbol: cs } = useTenantCurrency();
  const { tenantId, supabase } = useTenant();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [dealStages, setDealStages] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("6m");

  const monthCount = dateRange === "3m" ? 3 : dateRange === "12m" ? 12 : 6;

  useEffect(() => {
    if (!tenantId) return;
    const fetchChartData = async () => {
      setLoading(true);
      const [invoicesRes, dealsRes, expensesRes, attendanceRes] = await Promise.all([
        supabase.from("invoices").select("amount, status, issue_date").eq("tenant_id", tenantId),
        supabase.from("deals").select("stage, value").eq("tenant_id", tenantId),
        supabase.from("expenses").select("category, amount, status").eq("tenant_id", tenantId),
        supabase.from("attendance_records").select("attendance_date, status").eq("tenant_id", tenantId),
      ]);

      const invoices = invoicesRes.data || [];
      const deals = dealsRes.data || [];
      const expenses = expensesRes.data || [];
      const attendance = attendanceRes.data || [];

      const monthMap: Record<string, { paid: number; pending: number }> = {};
      const now = new Date();
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString("default", { month: "short" });
        monthMap[key] = { paid: 0, pending: 0 };
      }
      invoices.forEach((inv: any) => {
        const d = new Date(inv.issue_date);
        const key = d.toLocaleString("default", { month: "short" });
        if (monthMap[key]) {
          if (inv.status === "Paid") monthMap[key].paid += Number(inv.amount);
          else monthMap[key].pending += Number(inv.amount);
        }
      });
      setRevenueData(Object.entries(monthMap).map(([month, v]) => ({ month, ...v })));

      const stageMap: Record<string, { count: number; value: number }> = {};
      deals.forEach((d: any) => {
        if (!stageMap[d.stage]) stageMap[d.stage] = { count: 0, value: 0 };
        stageMap[d.stage].count++;
        stageMap[d.stage].value += Number(d.value);
      });
      setDealStages(Object.entries(stageMap).map(([name, v]) => ({ name, ...v })));

      const catMap: Record<string, number> = {};
      expenses.forEach((e: any) => {
        catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
      });
      setExpenseCategories(Object.entries(catMap).slice(0, 5).map(([name, value]) => ({ name, value })));

      const attMap: Record<string, number> = {};
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString("default", { month: "short" });
        attMap[key] = 0;
      }
      attendance.forEach((a: any) => {
        const d = new Date(a.attendance_date);
        const key = d.toLocaleString("default", { month: "short" });
        if (attMap[key] !== undefined && a.status === "present") attMap[key]++;
      });
      setMonthlyTrend(Object.entries(attMap).map(([month, present]) => ({ month, present })));

      setLoading(false);
    };
    fetchChartData();
  }, [tenantId, monthCount]);

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-[300px]">
              <div className="h-4 w-32 bg-muted rounded-lg mb-4 animate-pulse" />
              <div className="h-[200px] bg-muted/30 rounded-xl animate-pulse" />
              <div className="flex gap-4 mt-3">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const EmptyChartMessage = () => (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground">No data yet. Start adding records to see charts.</p>
    </div>
  );

  const hasRevenue = revenueData.some(d => d.paid > 0 || d.pending > 0);
  const hasDeals = dealStages.length > 0;
  const hasExpenses = expenseCategories.length > 0;
  const hasAttendance = monthlyTrend.some(d => d.present > 0);

  const chartCards = [
    {
      title: "Revenue Overview",
      icon: DollarSign,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      link: "/accounting/invoices",
      content: hasRevenue ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="paid" stroke="hsl(var(--primary))" fill="url(#paidGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="pending" stroke="hsl(var(--chart-4))" fill="url(#pendingGrad)" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Paid</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-dashed" style={{ borderColor: "hsl(var(--chart-4))" }} /> Pending</span>
          </div>
        </>
      ) : <EmptyChartMessage />,
    },
    {
      title: "Deal Pipeline",
      icon: Target,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
      link: "/crm",
      content: hasDeals ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dealStages}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChartMessage />,
    },
    {
      title: "Expense Breakdown",
      icon: TrendingUp,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      link: "/accounting/expenses",
      content: hasExpenses ? (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {expenseCategories.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2.5">
            {expenseCategories.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-md" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-foreground font-medium">{cat.name}</span>
                </span>
                <span className="text-muted-foreground font-medium">{cs}{Number(cat.value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <EmptyChartMessage />,
    },
    {
      title: "Attendance Trend",
      icon: Users,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
      link: "/hrms/attendance",
      content: hasAttendance ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="present" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r: 5, fill: "hsl(var(--chart-2))", strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <EmptyChartMessage />,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Analytics</span>
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-muted/50 border border-border rounded-lg">
          {([
            { key: "3m" as DateRange, label: "3M" },
            { key: "6m" as DateRange, label: "6M" },
            { key: "12m" as DateRange, label: "1Y" },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                dateRange === opt.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {chartCards.map((chart) => (
          <Link
            key={chart.title}
            to={chart.link}
            className="block bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${chart.iconBg}`}>
                  <chart.icon className={`h-4 w-4 ${chart.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{chart.title}</h3>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
            {chart.content}
          </Link>
        ))}
      </div>
    </div>
  );
}
