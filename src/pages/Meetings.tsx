import { useState, useEffect, useCallback } from "react";
import { Video, Plus, Calendar, Clock, Users, ExternalLink, Trash2, Edit, RefreshCw, Search, VideoOff, Play, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { format, isPast, isFuture } from "date-fns";
import { MeetingScheduleDialog } from "@/components/meetings/MeetingScheduleDialog";
import { InstantMeetingDialog } from "@/components/meetings/InstantMeetingDialog";
import { MeetingCredentialsDialog } from "@/components/meetings/MeetingCredentialsDialog";
import { Badge } from "@/components/ui/badge";

export default function Meetings() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showInstant, setShowInstant] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [editMeeting, setEditMeeting] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "past">("upcoming");
  const [search, setSearch] = useState("");

  const fetchMeetings = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("meetings" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_time", { ascending: true });
    setMeetings((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("meetings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => fetchMeetings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchMeetings]);

  const handleDelete = async (id: string) => {
    await supabase.from("meetings" as any).delete().eq("id", id);
    toast.success("Meeting deleted");
  };

  const handleJoin = (meeting: any) => {
    if (meeting.meeting_url) {
      window.open(meeting.meeting_url, "_blank");
      // Mark as live
      supabase.from("meetings" as any).update({ status: "live" } as any).eq("id", meeting.id);
    } else {
      toast.error("No meeting URL available");
    }
  };

  const filtered = meetings.filter((m) => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    const now = new Date();
    if (filter === "upcoming") return m.status === "scheduled" && new Date(m.start_time) > now;
    if (filter === "live") return m.status === "live";
    if (filter === "past") return m.status === "ended" || m.status === "cancelled" || (m.status === "scheduled" && isPast(new Date(m.end_time || m.start_time)));
    return true;
  });

  const providerIcon = (p: string) => p === "google_meet" ? "🟢" : "🔵";
  const providerLabel = (p: string) => p === "google_meet" ? "Google Meet" : "Zoom";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" /> Meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and join Google Meet & Zoom meetings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCredentials(true)}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            title="Configure Meeting API Credentials"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" /> API Config
          </button>
          <button
            onClick={() => setShowInstant(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
          >
            <Play className="h-4 w-4" /> Instant Meeting
          </button>
          <button
            onClick={() => { setEditMeeting(null); setShowSchedule(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border">
          {(["upcoming", "live", "all", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "live" ? "🔴 Live" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm"
          />
        </div>
      </div>

      {/* Meeting List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted/30 animate-pulse border border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <VideoOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">No meetings found</p>
          <p className="text-sm text-muted-foreground mt-1">Schedule a Google Meet or Zoom meeting</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((m, i) => {
              const isLive = m.status === "live";
              const isUpcoming = m.status === "scheduled" && isFuture(new Date(m.start_time));
              const isPassed = m.status === "ended" || m.status === "cancelled";
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className={`relative rounded-2xl border p-5 space-y-3 transition-all hover:shadow-lg ${
                    isLive
                      ? "border-destructive/40 bg-gradient-to-br from-destructive/5 to-transparent"
                      : isPassed
                      ? "border-border/50 bg-muted/20 opacity-70"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={isLive ? "destructive" : isUpcoming ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse mr-1" />}
                      {m.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{providerIcon(m.provider)} {providerLabel(m.provider)}</span>
                  </div>

                  <h3 className="font-semibold text-foreground text-base truncate">{m.title}</h3>
                  {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(m.start_time), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(m.start_time), "h:mm a")}
                    </span>
                  </div>

                  {m.attendees?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{m.attendees.length} attendee{m.attendees.length > 1 ? "s" : ""}</span>
                    </div>
                  )}

                  {m.meeting_type === "recurring" && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <RefreshCw className="h-3 w-3" /> Recurring
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {(isLive || isUpcoming) && (
                      <button
                        onClick={() => handleJoin(m)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          isLive
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> {isLive ? "Join Now" : "Open Meeting"}
                      </button>
                    )}
                    {!isPassed && (
                      <button
                        onClick={() => { setEditMeeting(m); setShowSchedule(true); }}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 rounded-lg border border-border hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {showSchedule && (
        <MeetingScheduleDialog
          meeting={editMeeting}
          onClose={() => { setShowSchedule(false); setEditMeeting(null); }}
          onSaved={() => { setShowSchedule(false); setEditMeeting(null); fetchMeetings(); }}
        />
      )}

      {showInstant && (
        <InstantMeetingDialog
          onClose={() => setShowInstant(false)}
          onCreated={() => fetchMeetings()}
        />
      )}

      {showCredentials && (
        <MeetingCredentialsDialog onClose={() => setShowCredentials(false)} />
      )}
    </div>
  );
}
