// @ts-nocheck
import { useState, useEffect } from "react";
import { Loader2, Plus, DollarSign, CreditCard, TrendingDown, AlertTriangle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useEmployeeOptions } from "@/hooks/useEmployeeOptions";
import EmployeeAutocomplete from "@/components/EmployeeAutocomplete";
import { toast } from "sonner";

export default function EmployeeLoans() {
  const { tenantId, supabase } = useTenant();
  const { user } = useAuth();
  const { formatPrice } = useTenantCurrency();
  const { autocompleteOptions } = useEmployeeOptions();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: "", loan_type: "salary_advance", amount: "", installments: "1", notes: "" });

  const fetchLoans = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("employee_loans").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setLoans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLoans(); }, [tenantId]);

  const handleSubmit = async () => {
    if (!tenantId || !user || !form.employee_name || !form.amount) return;
    const amount = Number(form.amount);
    const installments = Number(form.installments) || 1;
    const emi = Math.round((amount / installments) * 100) / 100;
    const { error } = await supabase.from("employee_loans").insert({
      tenant_id: tenantId, created_by: user.id, employee_name: form.employee_name,
      loan_type: form.loan_type, amount, emi_amount: emi, remaining: amount,
      installments, notes: form.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Loan record created!");
    setShowForm(false); setForm({ employee_name: "", loan_type: "salary_advance", amount: "", installments: "1", notes: "" });
    fetchLoans();
  };

  const handleApprove = async (id: string) => {
    await supabase.from("employee_loans").update({ status: "Active", approved_by: user?.id }).eq("id", id);
    toast.success("Loan approved"); fetchLoans();
  };

  const totalOutstanding = loans.filter(l => l.status === "Active").reduce((s, l) => s + Number(l.remaining || 0), 0);
  const totalPending = loans.filter(l => l.status === "Pending").length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Loan Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Salary advances and employee loans</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Loan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-destructive/10 w-fit mb-3"><TrendingDown className="h-4 w-4 text-destructive" /></div>
          <p className="text-lg font-bold text-foreground">{formatPrice(totalOutstanding)}</p>
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-warning/10 w-fit mb-3"><AlertTriangle className="h-4 w-4 text-warning" /></div>
          <p className="text-lg font-bold text-foreground">{totalPending}</p>
          <p className="text-xs text-muted-foreground">Pending Approval</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-success/10 w-fit mb-3"><CreditCard className="h-4 w-4 text-success" /></div>
          <p className="text-lg font-bold text-foreground">{loans.filter(l => l.status === "Completed").length}</p>
          <p className="text-xs text-muted-foreground">Completed Loans</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">New Loan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Employee Name</label>
              <EmployeeAutocomplete value={form.employee_name} onChange={(v) => setForm({...form, employee_name: v})} options={autocompleteOptions} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select value={form.loan_type} onChange={e => setForm({...form, loan_type: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="salary_advance">Salary Advance</option><option value="personal_loan">Personal Loan</option><option value="emergency">Emergency Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Installments</label>
              <input type="number" min="1" value={form.installments} onChange={e => setForm({...form, installments: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px_80px_80px] gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Employee</span><span>Type</span><span>Amount</span><span>Remaining</span><span>EMI</span><span>Progress</span><span>Status</span>
        </div>
        {loans.length === 0 ? (
          <div className="py-12 text-center"><DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No loan records</p></div>
        ) : loans.map(l => (
          <div key={l.id} className="px-5 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
            <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px_80px_80px] gap-2 items-center text-sm">
              <span className="font-medium text-foreground truncate">{l.employee_name}</span>
              <span className="text-xs text-muted-foreground capitalize">{l.loan_type.replace('_',' ')}</span>
              <span className="text-foreground">{formatPrice(l.amount)}</span>
              <span className="text-destructive font-medium">{formatPrice(l.remaining)}</span>
              <span className="text-muted-foreground">{formatPrice(l.emi_amount)}</span>
              <span className="text-xs">{l.paid_installments}/{l.installments}</span>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${l.status === 'Active' ? 'bg-info/10 text-info' : l.status === 'Completed' ? 'bg-success/10 text-success' : l.status === 'Pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{l.status}</span>
                {l.status === 'Pending' && <button onClick={() => handleApprove(l.id)} className="text-[10px] text-primary hover:underline">Approve</button>}
              </div>
            </div>
            <div className="sm:hidden space-y-1">
              <div className="flex justify-between"><span className="font-medium text-sm">{l.employee_name}</span><span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'Active' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}`}>{l.status}</span></div>
              <p className="text-xs text-muted-foreground">{formatPrice(l.amount)} · {l.paid_installments}/{l.installments} paid · Remaining: {formatPrice(l.remaining)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
