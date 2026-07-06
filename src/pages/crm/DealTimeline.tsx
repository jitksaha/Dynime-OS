import { useState, useEffect } from "react";
import { Loader2, MessageSquare, Phone, Mail, Calendar, Users } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function DealTimeline() {
  const { tenantId, supabase } = useTenant();
  const [deals, setDeals] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("deals").select("id, name, stage, value, contact_name").eq("tenant_id", tenantId).order("updated_at", { ascending: false })
      .then(({ data }) => { setDeals(data || []); setLoading(false); });
  }, [tenantId]);

  useEffect(() => {
    if (!selectedDeal || !tenantId) { setFollowUps([]); return; }
    supabase.from("lead_follow_ups").select("*").eq("deal_id", selectedDeal).eq("tenant_id", tenantId).order("created_at", { ascending: false })
      .then(({ data }) => setFollowUps(data || []));
  }, [selectedDeal, tenantId]);

  const typeIcon: Record<string, React.ElementType> = { call: Phone, email: Mail, meeting: Calendar, note: MessageSquare };
  const typeColor: Record<string, string> = { call: "bg-success/10 text-success", email: "bg-info/10 text-info", meeting: "bg-primary/10 text-primary", note: "bg-warning/10 text-warning" };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-xl font-bold text-foreground">Deal Activity Timeline</h1><p className="text-sm text-muted-foreground mt-0.5">Full interaction history for each deal</p></div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Select Deal</label>
        <select value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)} className="w-full sm:w-80 h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="">Choose a deal...</option>
          {deals.map(d => <option key={d.id} value={d.id}>{d.name} — {d.contact_name || 'No contact'} ({d.stage})</option>)}
        </select>
      </div>

      {!selectedDeal ? (
        <div className="py-16 text-center bg-card border border-border rounded-xl">
          <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Select a deal to view activity timeline</p>
        </div>
      ) : followUps.length === 0 ? (
        <div className="py-12 text-center bg-card border border-border rounded-xl">
          <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No activities recorded for this deal</p>
          <p className="text-xs text-muted-foreground mt-1">Follow-ups added to this deal will appear here</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {followUps.map(f => {
              const Icon = typeIcon[f.type] || MessageSquare;
              const color = typeColor[f.type] || "bg-muted text-muted-foreground";
              return (
                <div key={f.id} className="relative flex items-start gap-4 pl-2">
                  <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 flex-1 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground capitalize">{f.type}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span>
                    </div>
                    {f.notes && <p className="text-sm text-muted-foreground">{f.notes}</p>}
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${f.status === 'completed' ? 'bg-success/10 text-success' : f.status === 'scheduled' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}`}>{f.status}</span>
                      {f.follow_up_date && <span className="text-[10px] text-muted-foreground">Follow-up: {new Date(f.follow_up_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
