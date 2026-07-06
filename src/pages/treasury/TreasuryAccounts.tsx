// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Landmark, Plus, ArrowRightLeft, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Account { id: string; account_name: string; currency: string; balance: number; account_type: string; bank_name: string; is_active: boolean; }

export default function TreasuryAccounts() {
  const { tenantId, userId } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ account_name: "", currency: "USD", account_type: "operating", bank_name: "", balance: "0" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("treasury_accounts" as any).select("*").eq("tenant_id", tenantId);
    setAccounts((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createAccount = async () => {
    if (!form.account_name || !tenantId) return;
    const { error } = await supabase.from("treasury_accounts" as any).insert({ ...form, balance: Number(form.balance) || 0, tenant_id: tenantId, created_by: userId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created");
    setShowForm(false);
    fetchData();
  };

  const totalBalanceUSD = accounts.reduce((a, acc) => a + acc.balance, 0);
  const currencies = [...new Set(accounts.map(a => a.currency))];

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Landmark className="h-6 w-6 text-primary" /> Multi-Currency Treasury</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage accounts across currencies with FX tracking</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Account</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{accounts.length}</p><p className="text-xs text-muted-foreground">Accounts</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-primary">{currencies.length}</p><p className="text-xs text-muted-foreground">Currencies</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center sm:col-span-2"><p className="text-2xl font-bold text-success">${totalBalanceUSD.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Balance (est.)</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Treasury Account</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Account name" value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              {["USD", "EUR", "GBP", "BDT", "INR", "AUD", "CAD", "SGD", "JPY", "AED"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="operating">Operating</option><option value="savings">Savings</option><option value="investment">Investment</option><option value="escrow">Escrow</option>
            </select>
            <input placeholder="Bank name" value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input type="number" placeholder="Opening balance" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createAccount} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <div className="text-center py-12"><Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No treasury accounts yet</p></div>
        ) : accounts.map(acc => (
          <div key={acc.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-4 w-4 text-primary" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{acc.account_name}</p>
              <p className="text-xs text-muted-foreground">{acc.bank_name || "No bank"} · {acc.account_type}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{acc.currency} {acc.balance.toLocaleString()}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${acc.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{acc.is_active ? "Active" : "Closed"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
