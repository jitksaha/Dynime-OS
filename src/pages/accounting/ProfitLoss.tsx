import { useState, useEffect } from "react";
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ProfitLoss() {
  const { tenantId, supabase } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      supabase.from("invoices").select("amount, status, issue_date").eq("tenant_id", tenantId),
      supabase.from("expenses").select("amount, category, expense_date, status").eq("tenant_id", tenantId),
      supabase.from("payments").select("amount, payment_type, payment_date, status").eq("tenant_id", tenantId),
    ]).then(([inv, exp, pay]) => {
      setInvoices(inv.data || []); setExpenses(exp.data || []); setPayments(pay.data || []);
      setLoading(false);
    });
  }, [tenantId]);

  const totalRevenue = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalExpenses = expenses.filter(e => e.status === "Approved").reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalIncoming = payments.filter(p => p.payment_type === "incoming").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOutgoing = payments.filter(p => p.payment_type === "outgoing").reduce((s, p) => s + Number(p.amount || 0), 0);
  const netProfit = totalRevenue + totalIncoming - totalExpenses - totalOutgoing;

  // Monthly breakdown
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en', { month: 'short' });
    const rev = invoices.filter(inv => inv.status === 'Paid' && inv.issue_date?.startsWith(key)).reduce((s, inv) => s + Number(inv.amount || 0), 0);
    const exp = expenses.filter(e => e.status === 'Approved' && e.expense_date?.startsWith(key)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { name: label, Revenue: rev, Expenses: exp, Profit: rev - exp };
  });

  const expenseByCategory = Object.entries(
    expenses.filter(e => e.status === 'Approved').reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0); return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', '#10b981', '#8b5cf6', '#f59e0b'];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-xl font-bold text-foreground">Profit & Loss</h1><p className="text-sm text-muted-foreground mt-0.5">Financial overview from invoices, expenses and payments</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: TrendingUp, label: "Revenue", value: formatPrice(totalRevenue), color: "text-success", bg: "bg-success/10" },
          { icon: TrendingDown, label: "Expenses", value: formatPrice(totalExpenses), color: "text-destructive", bg: "bg-destructive/10" },
          { icon: DollarSign, label: "Net Profit", value: formatPrice(netProfit), color: netProfit >= 0 ? "text-success" : "text-destructive", bg: netProfit >= 0 ? "bg-success/10" : "bg-destructive/10" },
          { icon: BarChart3, label: "Margin", value: totalRevenue > 0 ? `${Math.round((netProfit / totalRevenue) * 100)}%` : "—", color: "text-primary", bg: "bg-primary/10" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`p-2 rounded-lg ${s.bg} w-fit mb-3`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            <p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue vs Expenses (6 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Expenses by Category</h3>
          {expenseByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">No expense data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {expenseByCategory.map((c, i) => (
              <span key={c.name} className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{c.name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
