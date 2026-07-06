import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Eye, EyeOff, ExternalLink, ChevronDown, ChevronUp, BookOpen, ShieldCheck, Copy, CheckCircle2, Power } from "lucide-react";

interface Provider {
  id: string;
  provider_key: string;
  provider_name: string;
  is_enabled: boolean;
  client_id: string;
  client_secret: string;
  additional_config: Record<string, any>;
}

interface ProviderGuide {
  color: string;
  icon: React.ReactNode;
  bg: string;
  docs: string;
  callbackNote: string;
  scopes?: string[];
  steps: string[];
  tips?: string[];
  extraFields?: { key: string; label: string; placeholder: string; hint: string }[];
  credentialLabels?: { id: string; secret: string };
}

const ALLOWED_PROVIDERS = ["google", "apple"];

const providerGuides: Record<string, ProviderGuide> = {
  google: {
    color: "bg-red-500/10 text-red-600",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
    bg: "bg-white dark:bg-zinc-800 border border-border",
    docs: "https://console.cloud.google.com/apis/credentials",
    callbackNote: "Add your platform's callback URL under Authorized redirect URIs",
    scopes: ["openid", "email", "profile"],
    steps: [
      "Go to Google Cloud Console → console.cloud.google.com",
      "Create a new project (or select existing) from the top dropdown bar",
      "Navigate to APIs & Services → OAuth consent screen from the left sidebar",
      "Choose 'External' user type → click Create",
      "Fill in: App name, User support email, Developer contact email → Save and Continue",
      "On Scopes page, click 'Add or Remove Scopes' → select openid, email, profile → Update → Save",
      "Go to APIs & Services → Credentials from the left sidebar",
      "Click + CREATE CREDENTIALS → choose 'OAuth client ID'",
      "Select Application type: 'Web application'",
      "Under 'Authorized redirect URIs', add your callback URL (shown below)",
      "Click Create → copy Client ID and Client Secret",
      "To go live: Go to OAuth consent screen → click 'Publish App'",
    ],
    tips: [
      "While in 'Testing' mode, only added test users can sign in",
      "Publishing the app removes the 100-user limit",
      "The Client Secret is shown only once during creation — save it securely",
    ],
  },
  apple: {
    color: "bg-gray-800/10 text-gray-800 dark:bg-gray-200/10 dark:text-gray-200",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>,
    bg: "bg-black text-white",
    docs: "https://developer.apple.com/account/resources",
    callbackNote: "Add your callback URL in the Return URLs section of your Service ID",
    scopes: ["name", "email"],
    steps: [
      "Go to Apple Developer portal → developer.apple.com/account",
      "You need an Apple Developer Program membership ($99/year)",
      "Navigate to Certificates, Identifiers & Profiles → Identifiers",
      "Create an App ID, then create a Service ID",
      "Check 'Sign In with Apple' → Configure",
      "Add your domain and callback URL (shown below)",
      "Create a Key with 'Sign In with Apple' enabled",
      "Download the .p8 key file (save it securely!)",
      "Your Client ID is the Service ID Identifier",
      "Generate a JWT client secret using the .p8 key, Key ID, and Team ID",
    ],
    tips: [
      "The .p8 key file can only be downloaded once — store it safely",
      "Apple requires HTTPS for all redirect URIs",
      "The JWT client secret expires after 6 months",
    ],
    extraFields: [
      { key: "team_id", label: "Team ID", placeholder: "ABCDE12345", hint: "Found in top-right of Apple Developer portal" },
      { key: "key_id", label: "Key ID", placeholder: "ABC123DEFG", hint: "Shown when you created the Sign In with Apple key" },
    ],
  },
};

export default function SocialSignInConfig() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Use the live site URL for the callback — clean branded URL
  const siteOrigin = window.location.origin;
  const callbackUrl = `${siteOrigin}/auth/oauth-callback`;

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    const { data, error } = await supabase
      .from("social_signin_providers")
      .select("*")
      .order("provider_name");
    if (error) {
      toast.error("Failed to load providers");
    } else {
      // Filter to only allowed providers
      const filtered = ((data as any[]) || []).filter(
        (p) => ALLOWED_PROVIDERS.includes(p.provider_key)
      );
      setProviders(filtered);
    }
    setLoading(false);
  };

  const toggleProvider = async (provider: Provider) => {
    const newEnabled = !provider.is_enabled;
    const { error } = await supabase
      .from("social_signin_providers")
      .update({ is_enabled: newEnabled } as any)
      .eq("id", provider.id);
    if (error) {
      toast.error("Failed to update provider");
    } else {
      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? { ...p, is_enabled: newEnabled } : p))
      );
      toast.success(`${provider.provider_name} ${newEnabled ? "enabled" : "disabled"}`);
    }
  };

  const updateField = (id: string, field: string, value: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const updateAdditionalConfig = (id: string, key: string, value: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, additional_config: { ...p.additional_config, [key]: value } }
          : p
      )
    );
  };

  const saveProvider = async (provider: Provider) => {
    setSaving(provider.id);
    const { error } = await supabase
      .from("social_signin_providers")
      .update({
        client_id: provider.client_id,
        client_secret: provider.client_secret,
        additional_config: provider.additional_config as any,
      } as any)
      .eq("id", provider.id);
    setSaving(null);
    if (error) {
      toast.error("Failed to save credentials");
    } else {
      toast.success(`${provider.provider_name} credentials saved!`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledCount = providers.filter((p) => p.is_enabled).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Social Sign-In Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enable and configure social login providers — only supported platforms are shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {enabledCount} of {providers.length} enabled
          </span>
        </div>
      </div>

      {/* Callback URL Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Your OAuth Callback URL</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-2 font-mono text-foreground break-all">
            {callbackUrl}
          </code>
          <button
            onClick={() => copyToClipboard(callbackUrl, "Callback URL")}
            className="shrink-0 p-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            {copied === "Callback URL" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Use this URL as the redirect/callback URI when configuring each provider's OAuth app.
        </p>
      </div>

      {/* Providers - Wide tile layout */}
      <div className="space-y-3">
        {providers.map((provider) => {
          const guide = providerGuides[provider.provider_key];
          if (!guide) return null;
          const isExpanded = expanded === provider.id;
          const isGuideOpen = showGuide[provider.id];

          return (
            <div
              key={provider.id}
              className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200"
            >
              {/* Header - Wide tile with social media name */}
              <div className="flex items-center gap-4 p-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${guide.bg}`}>
                  {guide.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{provider.provider_name}</h3>
                    {provider.is_enabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium flex items-center gap-1">
                        <Power className="h-3 w-3" /> Active
                      </span>
                    )}
                    {provider.client_id && !provider.is_enabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Configured</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {provider.client_id
                      ? `Client ID: ${provider.client_id.slice(0, 20)}...`
                      : `Sign in with ${provider.provider_name} — click Configure to set up`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <Switch checked={provider.is_enabled} onCheckedChange={() => toggleProvider(provider)} />
                    <span className="text-[9px] text-muted-foreground">{provider.is_enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpanded(isExpanded ? null : provider.id)}
                    className="text-xs"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                    {isExpanded ? "Close" : "Configure"}
                  </Button>
                </div>
              </div>

              {/* Expanded Config */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4 bg-muted/20 animate-in slide-in-from-top-1 duration-150">

                  {/* Setup Guide Toggle */}
                  <button
                    onClick={() => setShowGuide((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Step-by-Step Setup Guide for {provider.provider_name}
                    </span>
                    {isGuideOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {/* Setup Guide Content */}
                  {isGuideOpen && (
                    <div className="rounded-xl border border-border bg-background p-5 space-y-4">
                      {guide.scopes && guide.scopes.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Scopes / Permissions</p>
                          <div className="flex flex-wrap gap-1.5">
                            {guide.scopes.map((scope) => (
                              <code key={scope} className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono">{scope}</code>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {guide.steps.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-xs text-foreground leading-relaxed pt-1">{step}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                        <p className="text-[11px] font-semibold text-foreground">📌 {guide.callbackNote}</p>
                        <div className="flex items-center gap-2">
                          <code className="text-[11px] text-primary font-mono break-all">{callbackUrl}</code>
                          <button
                            onClick={() => copyToClipboard(callbackUrl, `${provider.provider_name} callback`)}
                            className="shrink-0 p-1 rounded hover:bg-muted"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {guide.tips && guide.tips.length > 0 && (
                        <div className="border-t border-border pt-3 space-y-1.5">
                          <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">💡 Pro Tips</p>
                          {guide.tips.map((tip, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-px">•</span> {tip}
                            </p>
                          ))}
                        </div>
                      )}

                      <a
                        href={guide.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open {provider.provider_name} Developer Console →
                      </a>
                    </div>
                  )}

                  {/* Credential Fields */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground">Paste your credentials:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">{guide.credentialLabels?.id || "Client ID"}</Label>
                        <Input
                          value={provider.client_id}
                          onChange={(e) => updateField(provider.id, "client_id", e.target.value)}
                          placeholder={`Enter ${guide.credentialLabels?.id || "OAuth Client ID"}`}
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{guide.credentialLabels?.secret || "Client Secret"}</Label>
                        <div className="relative mt-1">
                          <Input
                            type={showSecrets[provider.id] ? "text" : "password"}
                            value={provider.client_secret}
                            onChange={(e) => updateField(provider.id, "client_secret", e.target.value)}
                            placeholder={`Enter ${guide.credentialLabels?.secret || "OAuth Client Secret"}`}
                            className="pr-10 font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSecrets[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {guide.extraFields && guide.extraFields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {guide.extraFields.map((ef) => (
                          <div key={ef.key}>
                            <Label className="text-xs text-muted-foreground">{ef.label}</Label>
                            <Input
                              value={provider.additional_config?.[ef.key] || ""}
                              onChange={(e) => updateAdditionalConfig(provider.id, ef.key, e.target.value)}
                              placeholder={ef.placeholder}
                              className="mt-1 font-mono text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">{ef.hint}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => saveProvider(provider)}
                      disabled={saving === provider.id}
                    >
                      {saving === provider.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1" />
                      )}
                      {saving === provider.id ? "Saving..." : "Save Credentials"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Provider Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {providers.map((p) => {
            const guide = providerGuides[p.provider_key];
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  p.is_enabled
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${guide?.bg || "bg-muted"}`} style={{ fontSize: '0.65rem' }}>
                  {guide?.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{p.provider_name}</p>
                  <p className={`text-[9px] ${p.is_enabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {p.is_enabled ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
