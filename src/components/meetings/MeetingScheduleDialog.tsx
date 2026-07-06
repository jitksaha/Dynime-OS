import { useState } from "react";
import { X, Video, Calendar, Clock, Users, RefreshCw, Link2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface Props {
  meeting?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function MeetingScheduleDialog({ meeting, onClose, onSaved }: Props) {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const isEdit = !!meeting;

  const [title, setTitle] = useState(meeting?.title || "");
  const [description, setDescription] = useState(meeting?.description || "");
  const [provider, setProvider] = useState<string>(meeting?.provider || "google_meet");
  const [meetingUrl, setMeetingUrl] = useState(meeting?.meeting_url || "");
  const [startDate, setStartDate] = useState(
    meeting ? new Date(meeting.start_time).toISOString().slice(0, 16) : ""
  );
  const [duration, setDuration] = useState(meeting?.duration_minutes || 30);
  const [meetingType, setMeetingType] = useState(meeting?.meeting_type || "one_time");
  const [recurrenceRule, setRecurrenceRule] = useState(meeting?.recurrence_rule || "weekly");
  const [attendees, setAttendees] = useState(meeting?.attendees?.join(", ") || "");
  const [password, setPassword] = useState(meeting?.password || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !startDate) return toast.error("Title and start time are required");
    if (!meetingUrl.trim()) return toast.error("Meeting URL is required");
    if (!tenantId || !user) return;

    setSaving(true);
    const startTime = new Date(startDate).toISOString();
    const endTime = new Date(new Date(startDate).getTime() + duration * 60000).toISOString();

    const payload: any = {
      tenant_id: tenantId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      provider,
      meeting_url: meetingUrl.trim(),
      room_id: null,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      meeting_type: meetingType,
      recurrence_rule: meetingType === "recurring" ? recurrenceRule : null,
      attendees: attendees ? attendees.split(",").map((e: string) => e.trim()).filter(Boolean) : [],
      password: password || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("meetings" as any).update(payload as any).eq("id", meeting.id));
    } else {
      ({ error } = await supabase.from("meetings" as any).insert(payload as any));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isEdit ? "Meeting updated" : "Meeting scheduled");
      onSaved();
    }
    setSaving(false);
  };

  const providers = [
    { value: "google_meet", label: "Google Meet", icon: "🟢", desc: "Paste your Meet link", placeholder: "https://meet.google.com/xxx-yyyy-zzz" },
    { value: "zoom", label: "Zoom", icon: "🔵", desc: "Paste your Zoom link", placeholder: "https://zoom.us/j/1234567890" },
  ];

  const activeProvider = providers.find((p) => p.value === provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Meeting" : "Schedule Meeting"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">Video Provider</label>
          <div className="grid grid-cols-2 gap-3">
            {providers.map((p) => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  provider === p.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <p className="text-sm font-semibold text-foreground mt-1.5">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Meeting URL */}
        <div>
          <label className="text-xs font-medium text-foreground">Meeting URL</label>
          <div className="relative mt-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder={activeProvider?.placeholder}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {provider === "google_meet"
              ? "Create a meeting at meet.google.com and paste the link here"
              : "Create a meeting at zoom.us and paste the link here"}
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-foreground">Meeting Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Team standup"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-foreground">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Meeting agenda..."
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
          />
        </div>

        {/* Date & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Start Time
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        {/* Meeting Type */}
        <div>
          <label className="text-xs font-medium text-foreground">Meeting Type</label>
          <div className="flex gap-2 mt-1">
            {[
              { value: "one_time", label: "One-time", icon: Calendar },
              { value: "recurring", label: "Recurring", icon: RefreshCw },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setMeetingType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  meetingType === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {meetingType === "recurring" && (
          <div>
            <label className="text-xs font-medium text-foreground">Recurrence</label>
            <select
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        {/* Attendees */}
        <div>
          <label className="text-xs font-medium text-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Attendees (comma-separated emails)
          </label>
          <input
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="john@example.com, jane@example.com"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-medium text-foreground">Meeting Password (optional)</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Optional password"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !startDate || !meetingUrl.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update Meeting" : "Schedule Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}
