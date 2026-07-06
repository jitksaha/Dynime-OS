import { useState, useEffect, useCallback } from "react";
import { Video, Plus, Clock, Calendar, ExternalLink, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/db";
import { format } from "date-fns";
import { InstantMeetingDialog } from "@/components/meetings/InstantMeetingDialog";

export function DashboardMeetingWidget() {
  const { tenantId } = useTenant();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstant, setShowInstant] = useState(false);

  const fetchMeetings = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("meetings" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["scheduled", "live"])
      .order("start_time", { ascending: true })
      .limit(5);
    setMeetings((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("dashboard-meetings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => fetchMeetings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchMeetings]);

  const providerIcon = (p: string) => p === "google_meet" ? "🟢" : "🔵";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" /> Meetings
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowInstant(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-[11px] font-semibold hover:bg-destructive/20 transition-colors"
          >
            <Play className="h-3 w-3" /> Instant
          </button>
          <Link
            to="/meetings"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3 w-3" /> Schedule
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-6">
          <Video className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No upcoming meetings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => {
            const isLive = m.status === "live";
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isLive
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span className="text-lg shrink-0">{providerIcon(m.provider)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    {isLive && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(m.start_time), "MMM d")}
                    <Clock className="h-3 w-3" />
                    {format(new Date(m.start_time), "h:mm a")}
                  </div>
                </div>
                {m.meeting_url && (
                  <a
                    href={m.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link
        to="/meetings"
        className="block text-center text-xs text-primary font-medium hover:underline"
      >
        View all meetings →
      </Link>

      {showInstant && (
        <InstantMeetingDialog
          onClose={() => setShowInstant(false)}
          onCreated={() => fetchMeetings()}
        />
      )}
    </div>
  );
}
