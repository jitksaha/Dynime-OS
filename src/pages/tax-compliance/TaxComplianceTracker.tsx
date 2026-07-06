// @ts-nocheck
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Save, FileCheck, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface ComplianceRecord {
  id: string;
  tax_profile_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  filing_deadline: string | null;
  status: string;
  total_tax_collected: number;
  total_tax_paid: number;
  net_liability: number;
  payment_reference: string | null;
  notes: string | null;
}

interface TaxProfile { id: string; name: string; country: string; }

const STATUSES = ["pending", "filed", "overdue", "under_review", "completed"];

export default function TaxComplianceTracker() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ComplianceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tax_profile_id: "", period_label: "", period_start: "", period_end: "",
    filing_deadline: "", status: "pending", total_tax_collected: 0,
    total_tax_paid: 0, net_liability: 0, payment_reference: "", notes: "",
  });

  const fetchData = async () => {
    if (!tenantId) return;
    const [recordsRes, profilesRes] = await Promise.all([
      supabase.from("tax_compliance_records").select("*").eq("tenant_id", tenantId).order("period_start", { ascending: false }),
      supabase.from("tax_profiles").select("id, name, country").eq("tenant_id", tenantId),
    ]);
    setRecords((recordsRes.data as any[]) || []);
    setProfiles((profilesRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  useEffect(() => {
    setForm((f) => ({ ...f, net_liability: f.total_tax_collected - f.total_tax_paid }));
  }, [form.total_tax_collected, form.total_tax_paid]);

  const handleSave = async () => {
    if (!form.tax_profile_id || !form.period_label || !form.period_start || !form.period_end) {
      toast.error("Profile, period label, and dates are required"); return;
    }
    setSaving(true);
    const payload: any = {
      ...form,
      filing_deadline: form.filing_deadline || null,
      payment_reference: form.payment_reference || null,
      notes: form.notes || null,
      tenant_id: tenantId,
      net_liability: form.total_tax_collected - form.total_tax_paid,
    };
    if (editing) {
      const { error } = await supabase.from("tax_compliance_records").update(payload).eq("id", editing.id);
      if (error) toast.error("Failed to update"); else { toast.success("Record updated"); resetForm(); fetchData(); }
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("tax_compliance_records").insert(payload);
      if (error) toast.error("Failed to create: " + error.message); else { toast.success("Record created"); resetForm(); fetchData(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tax_compliance_records").delete().eq("id", id);
    if (error) toast.error("Failed to delete"); else { toast.success("Deleted"); fetchData(); }
  };

  const resetForm = () => {
    setForm({ tax_profile_id: profiles[0]?.id || "", period_label: "", period_start: "", period_end: "", filing_deadline: "", status: "pending", total_tax_collected: 0, total_tax_paid: 0, net_liability: 0, payment_reference: "", notes: "" });
    setEditing(null); setShowForm(false);
  };

  const startEdit = (r: ComplianceRecord) => {
    setEditing(r);
    setForm({
      tax_profile_id: r.tax_profile_id, period_label: r.period_label,
      period_start: r.period_start, period_end: r.period_end,
      filing_deadline: r.filing_deadline || "", status: r.status,
      total_tax_collected: r.total_tax_collected, total_tax_paid: r.total_tax_paid,
      net_liability: r.net_liability, payment_reference: r.payment_reference || "",
      notes: r.notes || "",
    });
    setShowForm(true);
  };

  const filtered = records.filter((r) => {
    const matchSearch = r.period_label.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.name || "—";

  const statusIcon = (s: string) => {
    switch (s) {
      case "completed": case "filed": return <FileCheck className="h-3.5 w-3.5 text-green-600" />;
      case "overdue": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": case "filed": return "bg-green-500/10 text-green-600";
      case "overdue": return "bg-destructive/10 text-destructive";
      case "under_review": return "bg-blue-500/10 text-blue-600";
      default: return "bg-amber-500/10 text-amber-600";
    }
  };

  // Summary stats
  const totalCollected = records.reduce((s, r) => s + r.total_tax_collected, 0);
  const totalPaid = records.reduce((s, r) => s + r.total_tax_paid, 0);
  const overdueCount = records.filter((r) => r.status === "overdue").length;

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">Track filings, deadlines, and compliance status</p>
        </div>
        <Button onClick={() => { resetForm(); setForm((f) => ({ ...f, tax_profile_id: profiles[0]?.id || "" })); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Collected</p>
           <p className="text-lg font-bold text-foreground">{formatPrice(totalCollected)}</p>
         </div>
         <div className="bg-card border border-border rounded-xl p-4">
           <p className="text-xs text-muted-foreground">Total Paid</p>
           <p className="text-lg font-bold text-foreground">{formatPrice(totalPaid)}</p>
         </div>
         <div className="bg-card border border-border rounded-xl p-4">
           <p className="text-xs text-muted-foreground">Net Liability</p>
           <p className={`text-lg font-bold ${totalCollected - totalPaid > 0 ? "text-destructive" : "text-green-600"}`}>{formatPrice(totalCollected - totalPaid)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className={`text-lg font-bold ${overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>{overdueCount}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editing ? "Edit" : "New"} Compliance Record</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax Profile</label>
              <select value={form.tax_profile_id} onChange={(e) => setForm({ ...form, tax_profile_id: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.country})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Period Label</label>
              <input value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} placeholder="Q1 2026" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Period Start</label>
              <input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Period End</label>
              <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Filing Deadline</label>
              <input type="date" value={form.filing_deadline} onChange={(e) => setForm({ ...form, filing_deadline: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax Collected</label>
              <input type="number" step="0.01" value={form.total_tax_collected} onChange={(e) => setForm({ ...form, total_tax_collected: parseFloat(e.target.value) || 0 })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax Paid</label>
              <input type="number" step="0.01" value={form.total_tax_paid} onChange={(e) => setForm({ ...form, total_tax_paid: parseFloat(e.target.value) || 0 })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Payment Reference</label>
              <input value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Net Liability (auto)</label>
              <input type="number" value={form.total_tax_collected - form.total_tax_paid} disabled className="w-full h-9 rounded-lg border border-input bg-muted px-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4 mr-2" /> {editing ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search periods..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-4 rounded-lg border border-input bg-background text-sm">
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Profile</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deadline</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Collected</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Liability</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{r.period_label}</td>
                <td className="px-4 py-3 text-muted-foreground">{getProfileName(r.tax_profile_id)}</td>
                <td className="px-4 py-3 text-foreground">{r.filing_deadline || "—"}</td>
                <td className="px-4 py-3 text-foreground font-mono">{formatPrice(r.total_tax_collected)}</td>
                <td className="px-4 py-3 text-foreground font-mono">{formatPrice(r.total_tax_paid)}</td>
                <td className={`px-4 py-3 font-mono font-medium ${r.net_liability > 0 ? "text-destructive" : "text-green-600"}`}>{formatPrice(r.net_liability)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>
                    {statusIcon(r.status)} {r.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(r)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No compliance records found</div>}
      </div>
    </div>
  );
}
