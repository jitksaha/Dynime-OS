// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Clock, CheckCircle, AlertTriangle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Job { id: string; title: string; description: string; assigned_to: string; customer_name: string; customer_address: string; customer_phone: string; status: string; priority: string; scheduled_date: string; check_in_time: string | null; check_out_time: string | null; notes: string; created_at: string; }

const STATUS_COLORS: Record<string, string> = { scheduled: "bg-blue-100 text-blue-700", in_progress: "bg-warning/10 text-warning", completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive" };
const PRIORITY_COLORS: Record<string, string> = { low: "text-muted-foreground", medium: "text-warning", high: "text-destructive", urgent: "text-destructive font-bold" };

export default function FieldServiceJobs() {
  const { tenantId, userId } = useTenant();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", customer_name: "", customer_address: "", customer_phone: "", assigned_to: "", priority: "medium", scheduled_date: new Date().toISOString().split("T")[0], description: "" });

  const fetchJobs = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("field_service_jobs" as any).select("*").eq("tenant_id", tenantId).order("scheduled_date", { ascending: false });
    setJobs((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const createJob = async () => {
    if (!form.title || !form.customer_name || !tenantId) { toast.error("Title and customer required"); return; }
    const { error } = await supabase.from("field_service_jobs" as any).insert({ ...form, tenant_id: tenantId, created_by: userId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Job created");
    setShowForm(false);
    setForm({ title: "", customer_name: "", customer_address: "", customer_phone: "", assigned_to: "", priority: "medium", scheduled_date: new Date().toISOString().split("T")[0], description: "" });
    fetchJobs();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "in_progress") updates.check_in_time = new Date().toISOString();
    if (status === "completed") updates.check_out_time = new Date().toISOString();
    await supabase.from("field_service_jobs" as any).update(updates).eq("id", id);
    toast.success(`Status → ${status.replace("_", " ")}`);
    fetchJobs();
  };

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" /> Field Service</h1>
          <p className="text-sm text-muted-foreground mt-1">Dispatch, track, and manage on-site service jobs</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Job</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{jobs.length}</p><p className="text-xs text-muted-foreground">Total Jobs</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-blue-600">{jobs.filter(j => j.status === "scheduled").length}</p><p className="text-xs text-muted-foreground">Scheduled</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-warning">{jobs.filter(j => j.status === "in_progress").length}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{jobs.filter(j => j.status === "completed").length}</p><p className="text-xs text-muted-foreground">Completed</p></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "scheduled", "in_progress", "completed", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Service Job</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Job title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Assigned to" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Customer name" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Customer phone" value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="Address" value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none sm:col-span-2" />
            <input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={createJob} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12"><MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No jobs found</p></div>
        ) : filtered.map(job => (
          <div key={job.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${STATUS_COLORS[job.status]?.split(" ")[0] || "bg-secondary"}`}>
                {job.status === "completed" ? <CheckCircle className="h-4 w-4" /> : job.status === "in_progress" ? <Clock className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">{job.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[job.status] || "bg-secondary text-muted-foreground"}`}>{job.status.replace("_", " ")}</span>
                  <span className={`text-[10px] ${PRIORITY_COLORS[job.priority]}`}>● {job.priority}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{job.customer_name}</span>
                  {job.customer_address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.customer_address}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.scheduled_date}</span>
                  {job.assigned_to && <span>→ {job.assigned_to}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {job.status === "scheduled" && <button onClick={() => updateStatus(job.id, "in_progress")} className="px-2 py-1 text-xs rounded-md bg-warning/10 text-warning hover:bg-warning/20">Check In</button>}
                {job.status === "in_progress" && <button onClick={() => updateStatus(job.id, "completed")} className="px-2 py-1 text-xs rounded-md bg-success/10 text-success hover:bg-success/20">Complete</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
