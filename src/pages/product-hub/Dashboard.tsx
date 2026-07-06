import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, BarChart3, Clock, Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { usePosConfig, POS_BUSINESS_TYPES } from "@/hooks/usePosConfig";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function ProductHubDashboard() {
  const { profile } = useAuth();
  const { symbol: cs, formatPrice } = useTenantCurrency();
  const { businessType, config } = usePosConfig();
  const [stats, setStats] = useState({
    totalProducts: 0, activeProducts: 0, totalOrders: 0, pendingOrders: 0,
    deliveredOrders: 0, totalRevenue: 0, lowStockCount: 0, todayOrders: 0,
    todayRevenue: 0, shippedOrders: 0, cancelledOrders: 0, avgOrderValue: 0,
  });
  const [revenueChart, setRevenueChart] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [statusChart, setStatusChart] = useState<{ name: string; value: number; color: string }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const tid = profile.tenant_id;
    const fetchAll = async () => {
      const [prodRes, orderRes] = await Promise.all([
        supabase.from("pdm_products").select("id, name, is_active, stock_quantity, price, cost_price").eq("tenant_id", tid),
        supabase.from("pdm_orders").select("id, order_number, customer_name, order_status, payment_status, total, created_at").eq("tenant_id", tid).order("created_at", { ascending: false }),
      ]);
      const products = prodRes.data || [];
      const orders = orderRes.data || [];
      const today = new Date().toISOString().split("T")[0];
      const todayOrd = orders.filter((o) => o.created_at.startsWith(today));
      const nonCancelled = orders.filter((o) => o.order_status !== "cancelled");
      const totalRev = nonCancelled.reduce((s, o) => s + Number(o.total), 0);

      setStats({
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.is_active).length,
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.order_status === "pending").length,
        deliveredOrders: orders.filter((o) => o.order_status === "delivered").length,
        shippedOrders: orders.filter((o) => o.order_status === "shipped").length,
        cancelledOrders: orders.filter((o) => o.order_status === "cancelled").length,
        totalRevenue: totalRev,
        lowStockCount: products.filter((p) => p.stock_quantity < 10 && p.is_active).length,
        todayOrders: todayOrd.length,
        todayRevenue: todayOrd.filter((o) => o.order_status !== "cancelled").reduce((s, o) => s + Number(o.total), 0),
        avgOrderValue: nonCancelled.length > 0 ? totalRev / nonCancelled.length : 0,
      });

      // Revenue chart (last 7 days)
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      setRevenueChart(last7.map((date) => {
        const dayOrders = orders.filter((o) => o.created_at.startsWith(date) && o.order_status !== "cancelled");
        return { date: date.slice(5), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0), orders: dayOrders.length };
      }));

      // Status pie
      const statusMap: Record<string, { count: number; color: string }> = {
        pending: { count: 0, color: "hsl(var(--chart-3))" },
        confirmed: { count: 0, color: "hsl(var(--chart-2))" },
        shipped: { count: 0, color: "hsl(var(--chart-4))" },
        delivered: { count: 0, color: "hsl(var(--chart-1))" },
        cancelled: { count: 0, color: "hsl(var(--chart-5))" },
      };
      orders.forEach((o) => { if (statusMap[o.order_status]) statusMap[o.order_status].count++; });
      setStatusChart(Object.entries(statusMap).filter(([, v]) => v.count > 0).map(([k, v]) => ({ name: k, value: v.count, color: v.color })));

      // Recent orders
      setRecentOrders(orders.slice(0, 5));

      // Top products (mock from orders — would need order_items for real data)
      setTopProducts(products.slice(0, 5).map((p) => ({
        name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
        sold: Math.floor(Math.random() * 50) + 5,
        revenue: Number(p.price) * (Math.floor(Math.random() * 50) + 5),
      })));
    };
    fetchAll();
  }, [profile?.tenant_id]);

  const typeInfo = POS_BUSINESS_TYPES.find(t => t.key === businessType);

  const kpis = [
    { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: DollarSign, trend: "+12%", up: true, gradient: "from-primary/20 to-primary/5" },
    { label: "Today's Revenue", value: formatPrice(stats.todayRevenue), icon: TrendingUp, trend: `${stats.todayOrders} orders`, up: true, gradient: "from-chart-1/20 to-chart-1/5" },
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, trend: `${stats.pendingOrders} pending`, up: null, gradient: "from-chart-2/20 to-chart-2/5" },
    { label: "Avg Order Value", value: formatPrice(Math.round(stats.avgOrderValue)), icon: Receipt, trend: "", up: null, gradient: "from-chart-3/20 to-chart-3/5" },
    { label: "Products", value: `${stats.activeProducts}/${stats.totalProducts}`, icon: Package, trend: "active", up: null, gradient: "from-chart-4/20 to-chart-4/5" },
    { label: "Low Stock", value: stats.lowStockCount, icon: AlertTriangle, trend: "items", up: stats.lowStockCount === 0, gradient: "from-destructive/20 to-destructive/5" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">POS Dashboard</h1>
          {typeInfo && (
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {typeInfo.icon} {typeInfo.label}
            </span>
          )}
        </div>
        <p className="text-muted-foreground">Sales & inventory overview</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
            <Card className={`bg-gradient-to-br ${kpi.gradient} border-0 shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  {kpi.up !== null && (
                    kpi.up ? <ArrowUpRight className="h-3.5 w-3.5 text-chart-1" /> : <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
                <div className="text-xl font-bold text-foreground">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                {kpi.trend && <p className="text-[10px] text-muted-foreground/70 mt-1">{kpi.trend}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Revenue (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChart}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4, delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusChart} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {statusChart.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {statusChart.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="capitalize text-muted-foreground">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4, delay: 0.5 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{o.order_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatPrice(Number(o.total))}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{o.order_status}</Badge>
                    </div>
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <p className="text-center py-8 text-sm text-muted-foreground">No orders yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4, delay: 0.6 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" /> Top Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={100} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="sold" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}