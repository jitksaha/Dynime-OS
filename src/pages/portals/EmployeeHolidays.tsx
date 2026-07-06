import { useState, useEffect } from "react";
import { Calendar, Loader2, PartyPopper, Sun } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function EmployeeHolidays() {
  const { tenantId, supabase } = useTenant();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("company_holidays")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("holiday_date", { ascending: true })
      .then(({ data }) => { setHolidays(data || []); setLoading(false); });
  }, [tenantId]);

  const now = new Date();
  const upcoming = holidays.filter(h => new Date(h.holiday_date) >= now);
  const past = holidays.filter(h => new Date(h.holiday_date) < now);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Holiday Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Upcoming company holidays and days off</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-success/10 w-fit mb-3"><Sun className="h-4 w-4 text-success" /></div>
          <p className="text-lg font-bold text-foreground">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">Upcoming Holidays</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3"><Calendar className="h-4 w-4 text-primary" /></div>
          <p className="text-lg font-bold text-foreground">{holidays.length}</p>
          <p className="text-xs text-muted-foreground">Total This Year</p>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map(h => {
              const d = new Date(h.holiday_date);
              const daysAway = Math.ceil((d.getTime() - now.getTime()) / (1000*60*60*24));
              return (
                <div key={h.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{d.toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-lg font-black text-primary leading-tight">{d.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{d.toLocaleDateString('en', { weekday: 'long' })}{h.description ? ` · ${h.description}` : ''}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success shrink-0">
                    {daysAway === 0 ? 'Today!' : daysAway === 1 ? 'Tomorrow' : `${daysAway} days`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past Holidays</h2>
          <div className="space-y-2">
            {past.map(h => {
              const d = new Date(h.holiday_date);
              return (
                <div key={h.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 opacity-60">
                  <div className="h-12 w-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{d.toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-lg font-black text-muted-foreground leading-tight">{d.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{d.toLocaleDateString('en', { weekday: 'long' })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {holidays.length === 0 && (
        <div className="py-16 text-center bg-card border border-border rounded-xl">
          <PartyPopper className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No holidays scheduled yet</p>
          <p className="text-xs text-muted-foreground mt-1">Company holidays will appear here</p>
        </div>
      )}
    </div>
  );
}
