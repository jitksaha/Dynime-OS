// @ts-nocheck
import { useState } from "react";
import { X, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface GoogleConnectDialogProps {
  tenantId: string;
  isConnected: boolean;
  onClose: () => void;
  onStatusChange: (connected: boolean) => void;
}

export function GoogleConnectDialog({ tenantId, isConnected, onClose, onStatusChange }: GoogleConnectDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) return toast.error("API key is required");
    setSaving(true);
    try {
      // Upsert tenant_integrations for google_calendar
      const { error } = await supabase
        .from("tenant_integrations" as any)
        .upsert(
          {
            tenant_id: tenantId,
            integration_key: "google_calendar",
            is_enabled: true,
            config: { api_key: apiKey, calendar_id: calendarId || "primary" },
          } as any,
          { onConflict: "tenant_id,integration_key" }
        );
      if (error) throw error;
      toast.success("Google Calendar connected!");
      onStatusChange(true);
      onClose();
    } catch (err: any) {
      toast.error("Failed to connect: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await supabase
        .from("tenant_integrations" as any)
        .update({ is_enabled: false } as any)
        .eq("tenant_id", tenantId)
        .eq("integration_key", "google_calendar");
      toast.success("Google Calendar disconnected");
      onStatusChange(false);
      onClose();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M20.94 12.13A9 9 0 1 0 12 21a8.9 8.9 0 0 0 5.3-1.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
                <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Google Calendar</h2>
              <p className="text-xs text-muted-foreground">Sync events automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-emerald-400 font-medium">Connected & syncing</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Events created on this platform will automatically sync to your Google Calendar.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="w-full py-2 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              {saving ? "Disconnecting..." : "Disconnect Google Calendar"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How to get your API key:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Go to Google Cloud Console</li>
                  <li>Enable Google Calendar API</li>
                  <li>Create an API key under Credentials</li>
                </ol>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Google Calendar API Key</label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                type="password"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Calendar ID</label>
              <input
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="primary"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Use "primary" for your main calendar or a specific calendar ID</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Connecting..." : "Connect Google Calendar"}
            </button>

            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
            >
              Open Google Cloud Console <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
