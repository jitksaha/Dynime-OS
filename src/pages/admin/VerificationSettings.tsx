import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  Shield, Save, Loader2, Eye, EyeOff,
  UserCheck, Bot, Globe, Settings2, FileCheck, Building2,
  FlaskConical, Rocket, CheckCircle2, XCircle, Wifi,
  RefreshCw, ExternalLink, BookOpen, Layers, ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface VerificationConfig {
  method: "manual" | "ai" | "sumsub";
  sumsub_environment: "sandbox" | "live";
  sumsub_sandbox_app_token: string;
  sumsub_sandbox_secret_key: string;
  sumsub_live_app_token: string;
  sumsub_live_secret_key: string;
  sumsub_level_name: string;
  verification_types: string[];
  auto_approve_basic: boolean;
}

const DEFAULT_CONFIG: VerificationConfig = {
  method: "ai",
  sumsub_environment: "sandbox",
  sumsub_sandbox_app_token: "",
  sumsub_sandbox_secret_key: "",
  sumsub_live_app_token: "",
  sumsub_live_secret_key: "",
  sumsub_level_name: "",
  verification_types: ["kyc"],
  auto_approve_basic: false,
};

const METHODS = [
  {
    value: "manual" as const,
    label: "Manual Review",
    desc: "Admin manually reviews all KYC/KYB submissions",
    icon: UserCheck,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    value: "ai" as const,
    label: "AI Verification",
    desc: "AI-powered document analysis using vision models (built-in, no external API needed)",
    icon: Bot,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    value: "sumsub" as const,
    label: "Sumsub (KYC/KYB Provider)",
    desc: "Professional identity verification via Sumsub with liveness checks, AML screening & more",
    icon: Globe,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
];

const VERIFICATION_TYPES = [
  { value: "kyc", label: "KYC (Know Your Customer)", icon: FileCheck, desc: "Individual identity verification" },
  { value: "kyb", label: "KYB (Know Your Business)", icon: Building2, desc: "Business entity verification" },
];

export default function VerificationSettings() {
  const [config, setConfig] = useState<VerificationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTokens, setShowTokens] = useState({ sandboxToken: false, sandboxSecret: false, liveToken: false, liveSecret: false });
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [fetchingLevels, setFetchingLevels] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "kyc_verification_config")
      .maybeSingle();
    if (data?.value) {
      setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: config as any, updated_at: new Date().toISOString() })
      .eq("key", "kyc_verification_config");
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Verification settings saved!");
    }
    setSaving(false);
  };

  const handleFetchLevels = async () => {
    setFetchingLevels(true);
    setAvailableLevels([]);
    try {
      const { data, error } = await supabase.functions.invoke("sumsub-access-token", {
        body: { action: "test-credentials" },
      });
      if (error) {
        toast.error("Failed to fetch levels: " + error.message);
      } else if (data?.success && data?.level_names?.length > 0) {
        setAvailableLevels(data.level_names);
        toast.success(`Found ${data.level_names.length} verification level(s)`);
        // Auto-select first if none selected
        if (!config.sumsub_level_name && data.level_names.length > 0) {
          setConfig((p) => ({ ...p, sumsub_level_name: data.level_names[0] }));
        }
      } else {
        toast.error(data?.error || "No levels found. Create one in Sumsub Dashboard first.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch levels");
    }
    setFetchingLevels(false);
  };

  const handleTestCredentials = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sumsub-access-token", {
        body: { action: "test-credentials" },
      });
      if (error) {
        setTestResult({ success: false, message: error.message });
      } else if (data?.success) {
        setTestResult({ success: true, message: data.message });
        if (data?.level_names?.length > 0) {
          setAvailableLevels(data.level_names);
        }
      } else {
        setTestResult({ success: false, message: data?.error || "Connection failed" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Test failed" });
    }
    setTesting(false);
  };

  const toggleVerificationType = (type: string) => {
    setConfig((prev) => ({
      ...prev,
      verification_types: prev.verification_types.includes(type)
        ? prev.verification_types.filter((t) => t !== type)
        : [...prev.verification_types, type],
    }));
  };

  const toggleVisibility = (field: keyof typeof showTokens) => {
    setShowTokens((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSandbox = config.sumsub_environment === "sandbox";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Identity Verification Settings</h1>
            <p className="text-sm text-muted-foreground">Configure KYC, KYB & identity verification methods</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>

      {/* Verification Types */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Enabled Verification Types</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VERIFICATION_TYPES.map((vt) => {
            const active = config.verification_types.includes(vt.value);
            return (
              <button
                key={vt.value}
                onClick={() => toggleVerificationType(vt.value)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary/10" : "bg-muted"}`}>
                  <vt.icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{vt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{vt.desc}</p>
                </div>
                <div className={`ml-auto mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  active ? "border-primary bg-primary" : "border-border"
                }`}>
                  {active && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Verification Method */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-bold text-foreground mb-4">Verification Method</h2>
        <div className="grid grid-cols-1 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setConfig((prev) => ({ ...prev, method: m.value }))}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                config.method === m.value ? `${m.bg}` : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                config.method === m.value ? m.bg : "bg-muted"
              }`}>
                <m.icon className={`h-5 w-5 ${config.method === m.value ? m.color : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
              <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                config.method === m.value ? "border-primary bg-primary" : "border-border"
              }`}>
                {config.method === m.value && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sumsub Configuration */}
      {config.method === "sumsub" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">Sumsub Configuration</h2>
          </div>

          {/* Environment Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setConfig((p) => ({ ...p, sumsub_environment: "sandbox" }))}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                isSandbox
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              Sandbox
            </button>
            <button
              onClick={() => setConfig((p) => ({ ...p, sumsub_environment: "live" }))}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                !isSandbox
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              <Rocket className="h-4 w-4" />
              Live (Production)
            </button>
          </div>

          {isSandbox && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                🧪 Sandbox Mode — Test verifications without real documents. Get sandbox credentials from{" "}
                <a href="https://cockpit.sumsub.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Sumsub Dashboard
                </a>.
              </p>
            </div>
          )}
          {!isSandbox && (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                🚀 Live Mode — Real identity verifications. Ensure your Sumsub account is activated for production.
              </p>
            </div>
          )}

          {/* Sandbox Credentials */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
              Sandbox Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CredentialInput
                label="Sandbox App Token"
                value={config.sumsub_sandbox_app_token}
                onChange={(v) => setConfig((p) => ({ ...p, sumsub_sandbox_app_token: v }))}
                show={showTokens.sandboxToken}
                onToggle={() => toggleVisibility("sandboxToken")}
                placeholder="sbx:xxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <CredentialInput
                label="Sandbox Secret Key"
                value={config.sumsub_sandbox_secret_key}
                onChange={(v) => setConfig((p) => ({ ...p, sumsub_sandbox_secret_key: v }))}
                show={showTokens.sandboxSecret}
                onToggle={() => toggleVisibility("sandboxSecret")}
                placeholder="Enter sandbox secret key"
              />
            </div>
          </div>

          {/* Live Credentials */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5 text-emerald-500" />
              Live (Production) Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CredentialInput
                label="Live App Token"
                value={config.sumsub_live_app_token}
                onChange={(v) => setConfig((p) => ({ ...p, sumsub_live_app_token: v }))}
                show={showTokens.liveToken}
                onToggle={() => toggleVisibility("liveToken")}
                placeholder="prd:xxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <CredentialInput
                label="Live Secret Key"
                value={config.sumsub_live_secret_key}
                onChange={(v) => setConfig((p) => ({ ...p, sumsub_live_secret_key: v }))}
                show={showTokens.liveSecret}
                onToggle={() => toggleVisibility("liveSecret")}
                placeholder="Enter live secret key"
              />
            </div>
          </div>

          {/* Verification Level Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Verification Level
              </h3>
              <button
                onClick={handleFetchLevels}
                disabled={fetchingLevels}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {fetchingLevels ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Fetch Levels from Sumsub
              </button>
            </div>

            {availableLevels.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Select the verification level from your Sumsub account. This determines the checks performed (ID, liveness, phone, etc.).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableLevels.map((level) => {
                    const selected = config.sumsub_level_name === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setConfig((p) => ({ ...p, sumsub_level_name: level }))}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          selected ? "bg-primary/10" : "bg-muted"
                        }`}>
                          <Layers className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{level}</p>
                          <p className="text-[11px] text-muted-foreground">Level ID</p>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected ? "border-primary bg-primary" : "border-border"
                        }`}>
                          {selected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {config.sumsub_level_name && (
                  <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium">
                      Selected: <span className="font-bold">{config.sumsub_level_name}</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <input
                    value={config.sumsub_level_name}
                    onChange={(e) => setConfig((p) => ({ ...p, sumsub_level_name: e.target.value }))}
                    placeholder="e.g. id-and-liveness"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Click "Fetch Levels from Sumsub" above to load your available levels, or type the level name manually.
                </p>
              </div>
            )}
          </div>

          {/* Test Connection */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestCredentials}
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                Test {isSandbox ? "Sandbox" : "Live"} Connection
              </button>
              {testResult && (
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  testResult.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                }`}>
                  {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Documentation */}
          <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Sumsub Integration Guide & Documentation</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${docsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Quick Setup Steps</h4>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Create a <a href="https://sumsub.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Sumsub account</a> and access the dashboard</li>
                    <li>Go to <strong>Developers → Integration</strong> to generate your App Token & Secret Key</li>
                    <li>Paste the credentials above (Sandbox first for testing)</li>
                    <li>Go to <strong>Verification Levels</strong> and create at least one level (e.g., <code className="bg-muted px-1 py-0.5 rounded text-[11px]">id-and-liveness</code>)</li>
                    <li>Click <strong>"Fetch Levels from Sumsub"</strong> above to load and select your level</li>
                    <li>Click <strong>"Test Connection"</strong> to verify everything works</li>
                    <li>Save settings — users can now verify their identity!</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Verification Levels Explained</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>id-only</strong> — Basic ID document check (passport, driving licence, ID card)</li>
                    <li>• <strong>id-and-liveness</strong> — ID document + selfie liveness check for stronger assurance</li>
                    <li>• <strong>idv-and-phone-verification</strong> — ID + liveness + SMS phone verification</li>
                    <li>• You can create custom levels with AML screening, proof of address, etc. in the Sumsub Dashboard</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <a
                    href="https://docs.sumsub.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Official Sumsub Docs
                  </a>
                  <a
                    href="https://cockpit.sumsub.com/checkus#/sdkIntegrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Sumsub Dashboard
                  </a>
                  <a
                    href="https://docs.sumsub.com/reference/about"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    API Reference
                  </a>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Manual Review Options */}
      {config.method === "manual" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-foreground">Manual Review Settings</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            All submissions will remain in "Pending" status until a Super Admin manually reviews and approves/rejects them.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.auto_approve_basic}
              onChange={(e) => setConfig((p) => ({ ...p, auto_approve_basic: e.target.checked }))}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Auto-approve basic submissions</p>
              <p className="text-xs text-muted-foreground">Automatically approve submissions with all required fields</p>
            </div>
          </label>
        </div>
      )}

      {/* AI Settings */}
      {config.method === "ai" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">AI Verification Settings</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Documents are analyzed using AI vision models. No external API key needed.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-primary font-medium">✓ Built-in — no configuration needed</p>
            <p className="text-[11px] text-muted-foreground mt-1">AI verification is ready to use.</p>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-muted/30 border border-border rounded-xl p-5">
        <h3 className="text-xs font-bold text-foreground mb-2">How It Works</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• When a user submits KYC/KYB documents, the selected verification method is used</li>
          <li>• <strong>Manual:</strong> Submissions go to "Pending" → Admin reviews in KYC Management</li>
          <li>• <strong>AI:</strong> Documents are analyzed instantly by AI vision models</li>
          <li>• <strong>Sumsub:</strong> Users complete Sumsub's WebSDK verification flow with liveness detection</li>
          <li>• <strong>Sandbox vs Live:</strong> Use Sandbox to test the flow, switch to Live for real verifications</li>
          <li>• All documents are stored securely in encrypted storage buckets</li>
        </ul>
      </div>
    </div>
  );
}

function CredentialInput({
  label, value, onChange, show, onToggle, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
