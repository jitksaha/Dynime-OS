// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Receipt, Loader2, Clock, Check, X, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmployeeExpenseClaims() {
  const { user, profile } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "general", description: "" });

  const fetchClaims = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("employee_expense_claims")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setClaims(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClaims(); }, [user]);

  const handleSubmit = async () => {
    if (!form.title || !form.amount) { toast.error("Title and amount are required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("employee_expense_claims").insert({
      tenant_id: profile?.tenant_id,
      user_id: user!.id,
      employee_name: profile?.full_name || "Employee",
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description,
    });
    if (error) toast.error(error.message);
    else { toast.success("Expense claim submitted"); setShowForm(false); setForm({ title: "", amount: "", category: "general", description: "" }); fetchClaims(); }
    setSubmitting(false);
  };

  const statusIcon = (s: string) => {
    if (s === "approved") return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    if (s === "rejected") return <X className="h-3.5 w-3.5 text-destructive" />;
    return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  };

  const categories = ["general", "travel", "meals", "office_supplies", "software", "equipment", "other"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and track your reimbursement requests</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Claim
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Claims", value: claims.length, icon: Receipt },
          { label: "Pending", value: claims.filter(c => c.status === "pending").length, icon: Clock },
          { label: "Total Approved", value: `$${claims.filter(c => c.status === "approved").reduce((a, c) => a + Number(c.amount), 0).toFixed(2)}`, icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
            <s.icon className="h-4 w-4 text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-border rounded-xl bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Expense Claim</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Expense title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-9" />
            <Input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="h-9" />
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map(c => <option key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
            <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-9" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null} Submit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No expense claims yet</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
          {claims.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">{statusIcon(c.status)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                <p className="text-[10px] text-muted-foreground">{c.category} · {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">${Number(c.amount).toFixed(2)}</span>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                c.status === "approved" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
                c.status === "rejected" ? "bg-destructive/10 text-destructive" :
                "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
              )}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
