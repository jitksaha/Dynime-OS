import { useState, useEffect, useCallback } from "react";
import { Brain, Save, Loader2, Zap, TestTube, CheckCircle2, AlertCircle, Key, ShieldCheck, Eye, EyeOff, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { useAppInfo } from "@/hooks/useAppInfo";
import { AIErrorLogsPanel } from "@/components/admin/AIErrorLogsPanel";
import { AIProviderStatusPanel } from "@/components/admin/AIProviderStatusPanel";
import { AISettingsMigrationPanel } from "@/components/admin/AISettingsMigrationPanel";

interface AIConfig {
  ai_provider: string;
  model: string;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  enabled: boolean;
  api_keys: Record<string, string>;
}

const PROVIDERS: Record<string, { label: string; tagline: string; keyUrl: string; placeholder: string; managed?: boolean }> = {
  openai: {
    label: "OpenAI (ChatGPT)",
    tagline: "GPT-4o, o1, o3 — best for complex reasoning & accuracy",
    keyUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-...",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    tagline: "Claude Sonnet 4, Opus — excellent for nuanced writing & analysis",
    keyUrl: "https://console.anthropic.com/account/keys",
    placeholder: "sk-ant-...",
  },
  google: {
    label: "Google Gemini",
    tagline: "Gemini 2.5 Pro/Flash — strong multimodal & speed",
    keyUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
  },
};

const defaultConfig: AIConfig = {
  ai_provider: "openai",
  model: "gpt-4o",
  system_prompt: "",
  max_tokens: 2048,
  temperature: 0.7,
  enabled: true,
  api_keys: {},
};

export default function AIConfiguration() {
  const { appInfo } = useAppInfo();
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [modelSource, setModelSource] = useState<"live" | "fallback" | "">("");
  const [loadingModels, setLoadingModels] = useState(false);

  const loadModels = useCallback(async (provider: string, autoPickLatest = false) => {
    setLoadingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-models-list", {
        body: {},
        method: "GET",
      } as any);
      // Fallback: invoke doesn't support GET cleanly, use direct fetch
    } catch {}
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-models-list?provider=${provider}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const j = await r.json();
      const list = j.models || [];
      setModels(list);
      setModelSource(j.source || "");
      if (autoPickLatest && list[0]) {
        setConfig((p) => ({ ...p, model: list[0].id }));
      }
    } catch (e) {
      setModels([]);
    }
    setLoadingModels(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "ai_config")
        .maybeSingle();
      if (data?.value) {
        const merged = { ...defaultConfig, ...(data.value as any) };
        merged.api_keys = merged.api_keys || {};
        setConfig(merged);
        loadModels(merged.ai_provider);
      } else {
        loadModels("openai");
      }
    })();
  }, [loadModels]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "ai_config", value: config as any }, { onConflict: "key" });
    if (error) toast.error("Failed to save");
    else toast.success("AI configuration saved! All AI features will use this provider.");
    setSaving(false);
  };

  const testAI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Save first to ensure backend uses latest
      await supabase.from("platform_settings").upsert({ key: "ai_config", value: config as any }, { onConflict: "key" });
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: [{ role: "user", content: "Say 'AI is working!' in one sentence." }] },
      });
      if (error) throw error;
      setTestResult({ success: true, message: `✅ Connected to ${PROVIDERS[config.ai_provider]?.label} — ${config.model}` });
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Connection failed. Check your API key." });
    }
    setTesting(false);
  };

  const changeProvider = async (provider: string) => {
    setConfig((p) => ({ ...p, ai_provider: provider }));
    await loadModels(provider, true);
  };

  const refreshModels = async () => {
    // Save key first so the edge function uses it
    await supabase.from("platform_settings").upsert({ key: "ai_config", value: config as any }, { onConflict: "key" });
    await loadModels(config.ai_provider, true);
    toast.success("Model list refreshed");
  };

  const currentProvider = PROVIDERS[config.ai_provider];
  const currentKey = config.api_keys[config.ai_provider] || "";

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">AI Configuration</h1>
          <p className="text-xs text-muted-foreground">Provider, API key & model — all dynamic, no code changes needed</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5">
        {/* Enable/Disable */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground">AI Features</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Toggle all AI-powered features across {appInfo.app_name}</p>
            </div>
            <button
              onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${config.enabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">AI Provider</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Object.entries(PROVIDERS).map(([key, p]) => {
              const active = config.ai_provider === key;
              const hasKey = p.managed ? true : !!config.api_keys[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeProvider(key)}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary" : "border-muted-foreground/30"}`}>
                      {active && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.managed && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">Managed</span>}
                      {hasKey && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-2">{p.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key Input — hidden for managed providers */}
        {!currentProvider.managed && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">API Key — {currentProvider.label}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Saved securely in the database. No need to redeploy or edit code — paste your key here and click Save.
          </p>
          <div className="relative">
            <input
              type={showKey[config.ai_provider] ? "text" : "password"}
              value={currentKey}
              onChange={(e) => setConfig((p) => ({ ...p, api_keys: { ...p.api_keys, [p.ai_provider]: e.target.value } }))}
              placeholder={currentProvider.placeholder}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => ({ ...s, [config.ai_provider]: !s[config.ai_provider] }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Toggle visibility"
            >
              {showKey[config.ai_provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <a
            href={currentProvider.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            Get your {currentProvider.label} API key →
          </a>
        </div>
        )}

        {currentProvider.managed && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-xs text-foreground space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> {currentProvider.label} is platform-managed
            </p>
            <p className="text-muted-foreground">No API key required — billing is handled at the workspace level.</p>
          </div>
        )}

        {/* Model Selection — dynamic */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Model</h2>
              {modelSource === "live" && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-medium">
                  <span className="h-1 w-1 rounded-full bg-success animate-pulse" /> Live
                </span>
              )}
              {modelSource === "fallback" && (
                <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-medium">Cached</span>
              )}
            </div>
            <button
              onClick={refreshModels}
              disabled={loadingModels}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {loadingModels ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={config.model}
              onChange={(e) => setConfig((p) => ({ ...p, model: e.target.value }))}
              className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
              disabled={loadingModels || !models.length}
            >
              {!models.length && <option>{loadingModels ? "Loading..." : "Add API key & refresh"}</option>}
              {models.map((m, i) => (
                <option key={m.id} value={m.id}>
                  {m.label} {i === 0 ? "— Latest" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => models[0] && setConfig((p) => ({ ...p, model: models[0].id }))}
              disabled={!models.length}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/15 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5" /> Use Latest
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Models are fetched live from {currentProvider.label} when an API key is saved. The list auto-updates as the provider releases new models.
          </p>
        </div>

        {/* Advanced Settings */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Advanced Settings</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max Tokens</label>
              <input
                type="number"
                value={config.max_tokens}
                onChange={(e) => setConfig((p) => ({ ...p, max_tokens: parseInt(e.target.value) || 2048 }))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Temperature (0–1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.temperature}
                onChange={(e) => setConfig((p) => ({ ...p, temperature: parseFloat(e.target.value) || 0.7 }))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Custom System Prompt (optional)</label>
            <textarea
              value={config.system_prompt}
              onChange={(e) => setConfig((p) => ({ ...p, system_prompt: e.target.value }))}
              rows={4}
              placeholder="Leave empty to use defaults. Custom prompt applies to all AI features."
              className="w-full mt-1 px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none"
            />
          </div>
        </div>

        {/* Test & Save */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sticky bottom-0 sm:static bg-background/80 backdrop-blur-sm sm:bg-transparent py-3 sm:py-0 -mx-4 sm:mx-0 px-4 sm:px-0 border-t sm:border-0 border-border">
          <button
            onClick={testAI}
            disabled={testing || !currentKey}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
            Test Connection
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 sm:ml-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </button>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 break-words">{testResult.message}</span>
          </div>
        )}

        {/* Provider live status & credits */}
        <AIProviderStatusPanel />

        {/* Migrate to another provider */}
        <AISettingsMigrationPanel
          currentProvider={config.ai_provider}
          config={config}
          onMigrated={(p, m) => { setConfig((c) => ({ ...c, ai_provider: p, model: m })); loadModels(p); }}
        />

        {/* Error logs */}
        <AIErrorLogsPanel />

        {/* Info */}
        <div className="bg-muted/30 border border-border rounded-2xl p-5 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground text-sm">How it works</p>
          <p>• API keys are stored securely in the platform database — no code changes or redeploys required.</p>
          <p>• Model lists are fetched live from each provider's API and sorted newest-first automatically.</p>
          <p>• Click <strong>Use Latest</strong> to instantly switch to the newest available model whenever a provider releases one.</p>
          <p>• All AI features (Assistant, Live Chat, Insights, KYC, Copilot, Social Agent) route through the centralized AI Proxy and use this configuration.</p>
        </div>
      </div>
    </div>
  );
}
