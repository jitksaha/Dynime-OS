import { useState, useEffect } from "react";
import { X, KeyRound, Eye, EyeOff, CheckCircle2, Save, ExternalLink, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

interface StepGuide {
  title: string;
  steps: string[];
  tips?: string[];
}

interface ProviderConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  fields: { key: string; label: string; type: string; placeholder: string; hint?: string }[];
  docsUrl: string;
  docsLabel: string;
  guide: StepGuide;
}

const PROVIDERS: ProviderConfig[] = [
  {
    key: "google_meet",
    label: "Google Meet",
    icon: "🟢",
    color: "border-green-500/30 bg-green-500/5",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    docsLabel: "Google Cloud Console",
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com", hint: "Found in API Credentials → OAuth 2.0 Client IDs" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-xxxxxxxxxx", hint: "Shown once when creating the OAuth client" },
      { key: "refresh_token", label: "Refresh Token", type: "password", placeholder: "1//0xxxxxxxxxxxxxx", hint: "Generated after completing OAuth consent" },
    ],
    guide: {
      title: "Google Meet API Setup Guide",
      steps: [
        "Go to Google Cloud Console → console.cloud.google.com",
        "Create a new project or select an existing one from the top dropdown",
        "Navigate to APIs & Services → Library from the left menu",
        "Search for \"Google Calendar API\" and click Enable (Google Meet uses Calendar API)",
        "Go to APIs & Services → OAuth consent screen",
        "Choose \"External\" user type → click Create",
        "Fill in App name, User support email, and Developer email → Save",
        "Go to APIs & Services → Credentials",
        "Click + CREATE CREDENTIALS → OAuth client ID",
        "Choose Application type: \"Web application\"",
        "Under Authorized redirect URIs, add: https://developers.google.com/oauthplayground",
        "Click Create → Copy the Client ID and Client Secret shown",
        "Open OAuth Playground: developers.google.com/oauthplayground",
        "Click the ⚙️ gear icon (top right) → Check \"Use your own OAuth credentials\"",
        "Paste your Client ID and Client Secret into the fields",
        "In Step 1 (left panel), find and select: https://www.googleapis.com/auth/calendar",
        "Click \"Authorize APIs\" → Sign in with your Google account → Allow access",
        "In Step 2, click \"Exchange authorization code for tokens\"",
        "Copy the Refresh Token from the response — paste it below",
      ],
      tips: [
        "The Refresh Token does not expire unless you revoke access",
        "You only need to do this setup once per Google account",
        "Make sure Google Calendar API is enabled, not just Google Meet API",
      ],
    },
  },
  {
    key: "zoom",
    label: "Zoom",
    icon: "🔵",
    color: "border-blue-500/30 bg-blue-500/5",
    docsUrl: "https://marketplace.zoom.us/develop/create",
    docsLabel: "Zoom App Marketplace",
    fields: [
      { key: "account_id", label: "Account ID", type: "text", placeholder: "Your Zoom Account ID", hint: "Found in App Credentials after creating the app" },
      { key: "client_id", label: "Client ID", type: "text", placeholder: "Your Zoom Client ID", hint: "Found in App Credentials tab" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Your Zoom Client Secret", hint: "Click \"Regenerate\" if you lost it" },
    ],
    guide: {
      title: "Zoom API Setup Guide",
      steps: [
        "Go to Zoom App Marketplace → marketplace.zoom.us",
        "Sign in with your Zoom account (must be Admin or Owner role)",
        "Click Develop → Build App from the top menu",
        "Choose \"Server-to-Server OAuth\" app type → click Create",
        "Give your app a name (e.g., \"My Company Meetings\") → click Create",
        "On the App Credentials page, you'll see Account ID, Client ID, and Client Secret",
        "Copy all three values — you'll paste them below",
        "Click Continue to the \"Information\" tab",
        "Fill in Company Name, Developer Name, and Developer Email → Continue",
        "Skip the \"Feature\" tab → click Continue",
        "On the \"Scopes\" tab, click + Add Scopes",
        "Search and add these scopes: meeting:write:admin, meeting:read:admin, user:read:admin",
        "Click Done → Continue",
        "Click Activate your app on the final page",
        "Your app is now active — paste the credentials below",
      ],
      tips: [
        "Server-to-Server OAuth apps don't need user login — they work automatically",
        "You must be a Zoom Admin or Owner to create apps",
        "Free Zoom accounts can create Server-to-Server OAuth apps",
        "If scopes are missing, meetings will fail to create — make sure all 3 scopes are added",
      ],
    },
  },
];

export function MeetingCredentialsDialog({ onClose }: Props) {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("google_meet");
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("integration_configs" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .in("integration_key", ["google_meet_api", "zoom_api"]);
      const loaded: Record<string, Record<string, string>> = {};
      const savedMap: Record<string, boolean> = {};
      (data as any[] || []).forEach((row: any) => {
        const providerKey = row.integration_key.replace("_api", "");
        loaded[providerKey] = row.config || {};
        savedMap[providerKey] = true;
      });
      setConfigs(loaded);
      setSaved(savedMap);
    })();
  }, [tenantId]);

  const handleFieldChange = (provider: string, field: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] || {}), [field]: value },
    }));
  };

  const handleSave = async (providerKey: string) => {
    if (!tenantId || !user) return;
    setSaving(true);
    const integrationKey = `${providerKey}_api`;
    const config = configs[providerKey] || {};

    const payload: any = {
      tenant_id: tenantId,
      integration_key: integrationKey,
      config,
      is_enabled: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("integration_configs" as any)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("integration_key", integrationKey)
      .maybeSingle();

    let error;
    if ((existing as any)?.id) {
      ({ error } = await supabase
        .from("integration_configs" as any)
        .update(payload as any)
        .eq("id", (existing as any).id));
    } else {
      ({ error } = await supabase
        .from("integration_configs" as any)
        .insert({ ...payload, created_by: user.id } as any));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${providerKey === "google_meet" ? "Google Meet" : "Zoom"} credentials saved`);
      setSaved((prev) => ({ ...prev, [providerKey]: true }));
    }
    setSaving(false);
  };

  const activeProvider = PROVIDERS.find((p) => p.key === activeTab)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Meeting API Credentials
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Configure API credentials to auto-create Google Meet or Zoom meetings directly from the platform — no need to manually paste links.
        </p>

        {/* Provider Tabs */}
        <div className="grid grid-cols-2 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setActiveTab(p.key); setShowGuide(false); }}
              className={`p-3 rounded-xl border text-center transition-all ${
                activeTab === p.key
                  ? `${p.color} ring-1 ring-primary/30`
                  : "border-border hover:border-primary/20"
              }`}
            >
              <span className="text-xl">{p.icon}</span>
              <p className="text-sm font-semibold text-foreground mt-1">{p.label}</p>
              {saved[p.key] && (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Setup Guide Toggle */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            {activeProvider.guide.title}
          </span>
          {showGuide ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Setup Guide Content */}
        {showGuide && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <div className="space-y-2">
              {activeProvider.guide.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-foreground leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>

            {activeProvider.guide.tips && activeProvider.guide.tips.length > 0 && (
              <div className="border-t border-border pt-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">💡 Tips</p>
                {activeProvider.guide.tips.map((tip, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-px">•</span> {tip}
                  </p>
                ))}
              </div>
            )}

            <a
              href={activeProvider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              Open {activeProvider.docsLabel} →
            </a>
          </div>
        )}

        {/* Credential Fields */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">
            Paste your {activeProvider.label} credentials below:
          </p>
          {activeProvider.fields.map((field, idx) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                  {String.fromCharCode(65 + idx)}
                </span>
                {field.label}
              </label>
              <div className="relative mt-1">
                <input
                  type={field.type === "password" && !showSecrets[`${activeTab}_${field.key}`] ? "password" : "text"}
                  value={configs[activeTab]?.[field.key] || ""}
                  onChange={(e) => handleFieldChange(activeTab, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm font-mono"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowSecrets((prev) => ({
                        ...prev,
                        [`${activeTab}_${field.key}`]: !prev[`${activeTab}_${field.key}`],
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets[`${activeTab}_${field.key}`] ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
              {field.hint && <p className="text-[10px] text-muted-foreground mt-1">{field.hint}</p>}
            </div>
          ))}
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
            onClick={() => handleSave(activeTab)}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Credentials"}
          </button>
        </div>
      </div>
    </div>
  );
}
