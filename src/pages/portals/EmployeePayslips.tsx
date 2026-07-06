import { useState, useEffect } from "react";
import { DollarSign, Loader2, FileText, TrendingUp } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

export default function EmployeePayslips() {
  const { tenantId, supabase } = useTenant();
  const { profile } = useAuth();
  const { formatPrice: formatCurrency } = useTenantCurrency();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  useEffect(() => {
    if (!tenantId || !profile?.full_name) return;
    supabase
      .from("payroll_records")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_name", profile.full_name)
      .order("created_at", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        setPayslips(data || []);
        setLoading(false);
      });
  }, [tenantId, profile?.full_name]);

  const latestPay = payslips[0];
  const totalEarned = payslips.filter(p => p.status === "Paid").reduce((s, p) => s + Number(p.net_pay || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Payslips</h1>
        <p className="text-sm text-muted-foreground mt-0.5">View your salary breakdown and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-success/10 w-fit mb-3">
            <DollarSign className="h-4 w-4 text-success" />
          </div>
          <p className="text-lg font-bold text-foreground">{latestPay ? formatCurrency(latestPay.net_pay) : "—"}</p>
          <p className="text-xs text-muted-foreground">Latest Net Pay</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalEarned)}</p>
          <p className="text-xs text-muted-foreground">Total Earned (Paid)</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-info/10 w-fit mb-3">
            <FileText className="h-4 w-4 text-info" />
          </div>
          <p className="text-lg font-bold text-foreground">{payslips.length}</p>
          <p className="text-xs text-muted-foreground">Total Payslips</p>
        </div>
      </div>

      {/* Payslip Detail Modal */}
      {selectedSlip && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Payslip — {selectedSlip.pay_period}</h3>
            <button onClick={() => setSelectedSlip(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Basic Salary", value: formatCurrency(selectedSlip.basic_salary) },
              { label: "HRA", value: formatCurrency(selectedSlip.hra) },
              { label: "Allowances", value: formatCurrency(selectedSlip.allowances) },
              { label: "Deductions", value: formatCurrency(selectedSlip.deductions), negative: true },
              { label: "Net Pay", value: formatCurrency(selectedSlip.net_pay), highlight: true },
              { label: "Status", value: selectedSlip.status },
            ].map((row) => (
              <div key={row.label} className={`p-3 rounded-lg ${row.highlight ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"}`}>
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className={`font-semibold ${row.negative ? "text-destructive" : row.highlight ? "text-primary" : "text-foreground"}`}>{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payslip List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px] gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Period</span><span>Basic</span><span>Deductions</span><span>Net Pay</span><span>Status</span>
        </div>
        {payslips.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No payslips available yet</p>
          </div>
        ) : payslips.map((p) => (
          <div key={p.id}>
            {/* Desktop */}
            <div
              onClick={() => setSelectedSlip(p)}
              className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px] gap-2 px-5 py-3 border-b border-border last:border-b-0 items-center text-sm hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <span className="font-medium text-foreground">{p.pay_period}</span>
              <span className="text-muted-foreground">{formatCurrency(p.basic_salary)}</span>
              <span className="text-destructive">{formatCurrency(p.deductions)}</span>
              <span className="text-foreground font-semibold">{formatCurrency(p.net_pay)}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                p.status === "Paid" ? "bg-success/10 text-success" : p.status === "Processed" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"
              }`}>{p.status}</span>
            </div>
            {/* Mobile */}
            <div
              onClick={() => setSelectedSlip(p)}
              className="sm:hidden px-4 py-3 border-b border-border last:border-b-0 space-y-1 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">{p.pay_period}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  p.status === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>{p.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">Net: {formatCurrency(p.net_pay)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
