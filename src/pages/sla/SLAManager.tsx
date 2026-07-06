// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Policy { id: string; name: string; module: string; response_time_hours: number; resolution_time_hours: number; escalation_rules: any[]; is_active: boolean; }
interface Tracking { id: string; sla_policy_id: string; resource_type: string; resource_id: string; started_at: string; first_response_at: string | null; resolved_at: string | null; breached: boolean; breach_type: string | null; }

export default function SLAManager() {
  const { tenantId, userId } = useTenant();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [tracking, setTracking] = useState<Tracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", module: "helpdesk", response_time_hours: "4", resolution_time_hours: "24" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const [p, t] = await Promise.all([
      supabase.from("sla_policies" as any).select("*").eq("tenant_id", tenantId),
      supabase.from("sla_tracking" as any).select("*").eq("tenant_id", tenantId).order("started_at", { ascending: false }).limit(50),
    ]);
    setPolicies((p.data as any[]) || []);
    setTracking((t.data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createPolicy = async () => {
    if (!form.name || !tenantId) return;
    const { error } = await supabase.from("sla_policies" as any).insert({
      name: form.name, module: form.module, response_time_hours: Number(form.response_time_hours),
      resolution_time_hours: Number(form.resolution_time_hours), tenant_id: tenantId, created_by: userId,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("SLA Policy created");
    setShowForm(false);
    fetchData();
  };

  const breachRate = tracking.length > 0 ? Math.round((tracking.filter(t => t.breached).length / tracking.length) * 100) : 0;

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> SLA Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Define SLA rules, track compliance, and auto-escalate breaches</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Policy</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{policies.length}</p><p className="text-xs text-muted-foreground">Policies</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{tracking.length}</p><p className="text-xs text-muted-foreground">Tracked Items</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className={`text-2xl font-bold ${breachRate <= 10 ? "text-success" : "text-destructive"}`}>{100 - breachRate}%</p><p className="text-xs text-muted-foreground">Compliance</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-destructive">{tracking.filter(t => t.breached).length}</p><p className="text-xs text-muted-foreground">Breaches</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New SLA Policy</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Policy name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <select value={form.module} onChange={e => setForm(p => ({ ...p, module: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="helpdesk">Helpdesk</option><option value="projects">Projects</option><option value="crm">CRM</option><option value="field_service">Field Service</option>
            </select>
            <input type="number" placeholder="Response time (hours)" value={form.response_time_hours} onChange={e => setForm(p => ({ ...p, response_time_hours: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="number" placeholder="Resolution time (hours)" value={form.resolution_time_hours} onChange={e => setForm(p => ({ ...p, resolution_time_hours: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createPolicy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Active Policies</h2>
        {policies.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <Shield className={`h-5 w-5 ${p.is_active ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.module} · Response: {p.response_time_hours}h · Resolution: {p.resolution_time_hours}h</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{p.is_active ? "Active" : "Paused"}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Recent Tracking</h2>
        {tracking.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tracked items yet</p>
        ) : tracking.slice(0, 20).map(t => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            {t.breached ? <XCircle className="h-4 w-4 text-destructive" /> : t.resolved_at ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-warning" />}
            <div className="flex-1">
              <p className="text-xs text-foreground">{t.resource_type} · {t.resource_id.slice(0, 8)}</p>
              <p className="text-[10px] text-muted-foreground">Started {new Date(t.started_at).toLocaleString()}</p>
            </div>
            {t.breached && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Breached: {t.breach_type}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
