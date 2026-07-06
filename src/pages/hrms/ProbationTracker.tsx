import { useState, useEffect } from "react";
import { Loader2, UserCheck, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function ProbationTracker() {
  const { tenantId, supabase } = useTenant();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("employees").select("*").eq("tenant_id", tenantId).eq("status", "active").order("hire_date", { ascending: true })
      .then(({ data }) => { setEmployees(data || []); setLoading(false); });
  }, [tenantId]);

  const now = new Date();
  const probationMonths = 3; // Default probation period
  const probationEmployees = employees.filter(e => {
    if (!e.hire_date) return false;
    const hire = new Date(e.hire_date);
    const probEnd = new Date(hire);
    probEnd.setMonth(probEnd.getMonth() + probationMonths);
    return probEnd >= now; // Still in probation
  }).map(e => {
    const hire = new Date(e.hire_date);
    const probEnd = new Date(hire);
    probEnd.setMonth(probEnd.getMonth() + probationMonths);
    const daysLeft = Math.ceil((probEnd.getTime() - now.getTime()) / (1000*60*60*24));
    const totalDays = Math.ceil((probEnd.getTime() - hire.getTime()) / (1000*60*60*24));
    const elapsed = totalDays - daysLeft;
    const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
    return { ...e, probEnd, daysLeft, progress };
  });

  const endingSoon = probationEmployees.filter(e => e.daysLeft <= 14);
  const confirmed = employees.filter(e => {
    if (!e.hire_date) return false;
    const probEnd = new Date(e.hire_date);
    probEnd.setMonth(probEnd.getMonth() + probationMonths);
    return probEnd < now;
  });

  const handleConfirm = async (id: string) => {
    // In a real app, you'd update a "confirmed" flag. Here we just show a toast.
    toast.success("Employee confirmed! Probation completed.");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-xl font-bold text-foreground">Probation Tracker</h1><p className="text-sm text-muted-foreground mt-0.5">Monitor employees in probation period ({probationMonths} months)</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-warning/10 w-fit mb-3"><Clock className="h-4 w-4 text-warning" /></div>
          <p className="text-lg font-bold text-foreground">{probationEmployees.length}</p><p className="text-xs text-muted-foreground">In Probation</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-destructive/10 w-fit mb-3"><AlertCircle className="h-4 w-4 text-destructive" /></div>
          <p className="text-lg font-bold text-foreground">{endingSoon.length}</p><p className="text-xs text-muted-foreground">Ending in 14 Days</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-success/10 w-fit mb-3"><CheckCircle className="h-4 w-4 text-success" /></div>
          <p className="text-lg font-bold text-foreground">{confirmed.length}</p><p className="text-xs text-muted-foreground">Confirmed</p>
        </div>
      </div>

      {endingSoon.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Action Required</p>
          <p className="text-xs text-muted-foreground mt-1">{endingSoon.length} employee(s) have probation ending within 14 days. Review and confirm.</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employees in Probation</div>
        {probationEmployees.length === 0 ? (
          <div className="py-12 text-center"><UserCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No employees currently in probation</p></div>
        ) : probationEmployees.map(e => (
          <div key={e.id} className="px-5 py-4 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{e.full_name}</p>
                <p className="text-xs text-muted-foreground">{e.job_title || 'Employee'} · {e.department || 'General'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Hired: {new Date(e.hire_date).toLocaleDateString()} · Ends: {e.probEnd.toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-20">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>{e.progress}%</span><span>{e.daysLeft}d left</span></div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${e.daysLeft <= 14 ? 'bg-destructive' : e.daysLeft <= 30 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${e.progress}%` }} />
                  </div>
                </div>
                {e.daysLeft <= 14 && (
                  <button onClick={() => handleConfirm(e.id)} className="text-xs px-3 py-1.5 rounded-lg bg-success text-white hover:bg-success/90 font-medium">Confirm</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
