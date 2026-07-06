import { useState, useEffect } from "react";
import { Loader2, Plus, AlertTriangle, Shield, Check } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeOptions } from "@/hooks/useEmployeeOptions";
import EmployeeAutocomplete from "@/components/EmployeeAutocomplete";
import { toast } from "sonner";

export default function WarningTracker() {
  const { tenantId, supabase } = useTenant();
  const { user, profile } = useAuth();
  const { autocompleteOptions } = useEmployeeOptions();
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: "", warning_type: "verbal", severity: "low", reason: "", details: "" });

  const fetchData = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("employee_warnings").select("*").eq("tenant_id", tenantId).order("issued_date", { ascending: false });
    setWarnings(data || []); setLoading(false);
  };
  useEffect(() => { fetchData(); }, [tenantId]);

  const handleSubmit = async () => {
    if (!tenantId || !user || !form.employee_name || !form.reason) return;
    const existingCount = warnings.filter(w => w.employee_name === form.employee_name && w.status === 'Active').length;
    const { error } = await supabase.from("employee_warnings").insert({
      tenant_id: tenantId, created_by: user.id, issued_by: profile?.full_name || 'Admin',
      ...form, details: form.details || null, escalation_level: existingCount + 1,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Warning issued"); setShowForm(false);
    setForm({ employee_name: "", warning_type: "verbal", severity: "low", reason: "", details: "" }); fetchData();
  };

  const handleResolve = async (id: string) => {
    await supabase.from("employee_warnings").update({ status: "Resolved" }).eq("id", id);
    toast.success("Warning resolved"); fetchData();
  };

  const severityColor: Record<string, string> = { low: "bg-warning/10 text-warning", medium: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", high: "bg-destructive/10 text-destructive", critical: "bg-destructive text-destructive-foreground" };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">Warning & Disciplinary</h1><p className="text-sm text-muted-foreground mt-0.5">Manage employee warnings and escalations</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90"><Plus className="h-4 w-4" /> Issue Warning</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active", value: warnings.filter(w => w.status === 'Active').length, color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
          { label: "Resolved", value: warnings.filter(w => w.status === 'Resolved').length, color: "text-success", bg: "bg-success/10", icon: Check },
          { label: "Verbal", value: warnings.filter(w => w.warning_type === 'verbal').length, color: "text-warning", bg: "bg-warning/10", icon: Shield },
          { label: "Written", value: warnings.filter(w => w.warning_type === 'written').length, color: "text-info", bg: "bg-info/10", icon: Shield },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`p-2 rounded-lg ${s.bg} w-fit mb-3`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            <p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-card border-2 border-destructive/20 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">Issue Warning</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Employee Name</label><EmployeeAutocomplete value={form.employee_name} onChange={(v) => setForm({...form, employee_name: v})} options={autocompleteOptions} /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label><select value={form.warning_type} onChange={e => setForm({...form, warning_type: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="verbal">Verbal</option><option value="written">Written</option><option value="final">Final Warning</option><option value="suspension">Suspension</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Severity</label><select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason</label><input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Details</label><textarea value={form.details} onChange={e => setForm({...form, details: e.target.value})} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90">Issue Warning</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {warnings.length === 0 ? (
          <div className="py-12 text-center"><Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No warnings on record</p></div>
        ) : warnings.map(w => (
          <div key={w.id} className="px-5 py-4 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{w.employee_name}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${severityColor[w.severity] || 'bg-muted text-muted-foreground'}`}>{w.severity}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-info/10 text-info capitalize">{w.warning_type}</span>
                  <span className="text-[10px] text-muted-foreground">Level {w.escalation_level}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{w.reason}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Issued by {w.issued_by} on {new Date(w.issued_date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${w.status === 'Active' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{w.status}</span>
                {w.status === 'Active' && <button onClick={() => handleResolve(w.id)} className="text-xs text-success hover:underline">Resolve</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
