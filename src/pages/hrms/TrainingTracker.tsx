// @ts-nocheck
import { useState, useEffect } from "react";
import { Loader2, Plus, GraduationCap, Award, Calendar, AlertCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeOptions } from "@/hooks/useEmployeeOptions";
import EmployeeAutocomplete from "@/components/EmployeeAutocomplete";
import { toast } from "sonner";

export default function TrainingTracker() {
  const { tenantId, supabase } = useTenant();
  const { user } = useAuth();
  const { autocompleteOptions } = useEmployeeOptions();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: "", training_name: "", category: "General", provider: "", start_date: "", end_date: "", expiry_date: "" });

  const fetch = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("training_records").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setRecords(data || []); setLoading(false);
  };
  useEffect(() => { fetch(); }, [tenantId]);

  const handleSubmit = async () => {
    if (!tenantId || !user || !form.employee_name || !form.training_name) return;
    const { error } = await supabase.from("training_records").insert({
      tenant_id: tenantId, created_by: user.id, ...form,
      start_date: form.start_date || null, end_date: form.end_date || null, expiry_date: form.expiry_date || null, provider: form.provider || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Training record added!"); setShowForm(false);
    setForm({ employee_name: "", training_name: "", category: "General", provider: "", start_date: "", end_date: "", expiry_date: "" }); fetch();
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await supabase.from("training_records").update({ status }).eq("id", id);
    toast.success(`Status updated to ${status}`); fetch();
  };

  const expiringSoon = records.filter(r => r.expiry_date && new Date(r.expiry_date) <= new Date(Date.now() + 30*24*60*60*1000) && new Date(r.expiry_date) >= new Date());
  const statusColors: Record<string, string> = { Assigned: "bg-info/10 text-info", "In Progress": "bg-warning/10 text-warning", Completed: "bg-success/10 text-success", Expired: "bg-destructive/10 text-destructive" };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">Training & Certifications</h1><p className="text-sm text-muted-foreground mt-0.5">Track employee training progress</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Training</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: GraduationCap, label: "Total", value: records.length, color: "text-primary", bg: "bg-primary/10" },
          { icon: Award, label: "Completed", value: records.filter(r => r.status === "Completed").length, color: "text-success", bg: "bg-success/10" },
          { icon: Calendar, label: "In Progress", value: records.filter(r => r.status === "In Progress").length, color: "text-warning", bg: "bg-warning/10" },
          { icon: AlertCircle, label: "Expiring Soon", value: expiringSoon.length, color: "text-destructive", bg: "bg-destructive/10" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`p-2 rounded-lg ${s.bg} w-fit mb-3`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            <p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">New Training Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Employee", key: "employee_name", type: "autocomplete" },
              { label: "Training Name", key: "training_name", type: "text" },
              { label: "Category", key: "category", type: "select", options: ["General", "Technical", "Compliance", "Safety", "Leadership", "Soft Skills"] },
              { label: "Provider", key: "provider", type: "text" },
              { label: "Start Date", key: "start_date", type: "date" },
              { label: "End Date", key: "end_date", type: "date" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
                {f.type === "select" ? (
                  <select value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {f.options!.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === "autocomplete" ? (
                  <EmployeeAutocomplete value={(form as any)[f.key]} onChange={(v) => setForm({...form, [f.key]: v})} options={autocompleteOptions} />
                ) : (
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {records.length === 0 ? (
          <div className="py-12 text-center"><GraduationCap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No training records</p></div>
        ) : records.map(r => (
          <div key={r.id} className="px-5 py-3 border-b border-border last:border-b-0 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{r.employee_name}</p>
              <p className="text-xs text-muted-foreground">{r.training_name} · {r.category}{r.provider ? ` · ${r.provider}` : ''}</p>
              {r.expiry_date && <p className="text-[10px] text-warning mt-0.5">Expires: {new Date(r.expiry_date).toLocaleDateString()}</p>}
            </div>
            <select value={r.status} onChange={e => handleStatusUpdate(r.id, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option>Assigned</option><option>In Progress</option><option>Completed</option><option>Expired</option>
            </select>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-muted text-muted-foreground'}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
