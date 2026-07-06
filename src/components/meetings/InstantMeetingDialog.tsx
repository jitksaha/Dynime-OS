import { useState } from "react";
import { X, Video, Link2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onCreated: (meeting: any) => void;
}

export function InstantMeetingDialog({ onClose, onCreated }: Props) {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [provider, setProvider] = useState<"google_meet" | "zoom">("google_meet");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [title, setTitle] = useState("Instant Meeting");
  const [saving, setSaving] = useState(false);

  const handleStart = async () => {
    if (!meetingUrl.trim()) return toast.error("Paste your meeting link to start");
    if (!tenantId || !user) return;
    setSaving(true);

    const { data, error } = await supabase.from("meetings" as any).insert({
      tenant_id: tenantId,
      created_by: user.id,
      title: title.trim() || "Instant Meeting",
      provider,
      meeting_url: meetingUrl.trim(),
      room_id: null,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      duration_minutes: 60,
      status: "live",
      meeting_type: "instant",
    } as any).select().single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Meeting started!");
    window.open(meetingUrl.trim(), "_blank");
    onCreated(data);
    onClose();
  };

  const providers = [
    { value: "google_meet" as const, label: "Google Meet", icon: "🟢", placeholder: "https://meet.google.com/xxx-yyyy-zzz", hint: "Go to meet.google.com → Start a new meeting → Copy link" },
    { value: "zoom" as const, label: "Zoom", icon: "🔵", placeholder: "https://zoom.us/j/1234567890", hint: "Open Zoom → New Meeting → Copy invite link" },
  ];

  const active = providers.find((p) => p.value === provider)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-destructive" /> Start Instant Meeting
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Provider */}
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
              <p className="text-sm font-semibold text-foreground mt-1">{p.label}</p>
            </button>
          ))}
        </div>

        {/* Quick title */}
        <div>
          <label className="text-xs font-medium text-foreground">Meeting Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Instant Meeting"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>

        {/* URL */}
        <div>
          <label className="text-xs font-medium text-foreground">Meeting Link</label>
          <div className="relative mt-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder={active.placeholder}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">{active.hint}</p>
        </div>

        <button
          onClick={handleStart}
          disabled={saving || !meetingUrl.trim()}
          className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Starting..." : "Start & Open Meeting"}
        </button>
      </div>
    </div>
  );
}
