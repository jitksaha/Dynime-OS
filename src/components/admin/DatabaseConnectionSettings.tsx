import { useState, useEffect, useCallback } from "react";
import { Database, Save, TestTube, CheckCircle2, XCircle, Loader2, RefreshCw, Activity, Shield, Clock, Globe, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface DbConnectionConfig {
  enabled: boolean;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  label: string;
}

interface HealthStatus {
  latency: number | null;
  tables: number | null;
  status: "connected" | "error" | "checking" | "idle";
  lastChecked: string | null;
  version: string | null;
}

const defaultConfig: DbConnectionConfig = {
  enabled: false,
  supabase_url: "",
  supabase_anon_key: "",
  supabase_service_role_key: "",
  label: "External Database",
};

export default function DatabaseConnectionSettings() {
  const [config, setConfig] = useState<DbConnectionConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [health, setHealth] = useState<HealthStatus>({ latency: null, tables: null, status: "idle", lastChecked: null, version: null });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "external_db_connection")
        .maybeSingle();
      if (data?.value) {
        setConfig({ ...defaultConfig, ...(data.value as any) });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        { key: "external_db_connection", value: config as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) toast.error("Failed to save database connection");
    else toast.success("Database connection saved!");
  };

  const testConnection = useCallback(async () => {
    if (!config.supabase_url || !config.supabase_anon_key) {
      toast.error("Please enter URL and Anon Key first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    setHealth(prev => ({ ...prev, status: "checking" }));
    const start = performance.now();
    try {
      const response = await fetch(`${config.supabase_url}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: config.supabase_anon_key,
          Authorization: `Bearer ${config.supabase_anon_key}`,
        },
      });
      const latency = Math.round(performance.now() - start);
      if (response.ok || response.status === 200) {
        setTestResult("success");
        setHealth({
          latency,
          tables: null,
          status: "connected",
          lastChecked: new Date().toISOString(),
          version: response.headers.get("x-pgrst-version") || null,
        });
        toast.success(`Connected! Latency: ${latency}ms`);
      } else {
        setTestResult("error");
        setHealth({ latency: null, tables: null, status: "error", lastChecked: new Date().toISOString(), version: null });
        toast.error(`Connection failed: HTTP ${response.status}`);
      }
    } catch (err: any) {
      setTestResult("error");
      setHealth({ latency: null, tables: null, status: "error", lastChecked: new Date().toISOString(), version: null });
      toast.error(err.message || "Connection failed");
    }
    setTesting(false);
  }, [config.supabase_url, config.supabase_anon_key]);

  const update = (field: keyof DbConnectionConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
    setHealth(prev => ({ ...prev, status: "idle" }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Database className="h-4 w-4 text-primary" /></div>
          <div className="h-4 w-48 bg-secondary animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 rounded-lg bg-secondary animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Database Hosting</h2>
            <p className="text-xs text-muted-foreground">
              Self-host your database or connect an external instance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config.enabled && health.status === "connected" && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
              <Activity className="h-2.5 w-2.5 mr-1" /> Live
            </Badge>
          )}
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => update("enabled", v)}
          />
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Health Monitor Bar */}
          {health.status !== "idle" && (
            <div className={`flex items-center gap-4 p-3 rounded-lg border text-xs ${
              health.status === "connected" ? "bg-green-500/5 border-green-500/20" :
              health.status === "error" ? "bg-destructive/5 border-destructive/20" :
              "bg-secondary/50 border-border"
            }`}>
              <div className="flex items-center gap-2">
                {health.status === "connected" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : health.status === "error" ? (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                <span className={`font-medium ${
                  health.status === "connected" ? "text-green-600" :
                  health.status === "error" ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {health.status === "connected" ? "Connected" : health.status === "error" ? "Unreachable" : "Checking..."}
                </span>
              </div>
              {health.latency && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{health.latency}ms</span>
                </div>
              )}
              {health.version && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>PostgREST {health.version}</span>
                </div>
              )}
              {health.lastChecked && (
                <span className="text-muted-foreground ml-auto">
                  Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ When enabled, the app uses this external database for data. Auth stays on the primary instance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Connection Label</Label>
              <Input
                value={config.label}
                onChange={(e) => update("label", e.target.value)}
                placeholder="e.g. Production DB, Staging DB"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Supabase Project URL
              </Label>
              <div className="flex gap-1">
                <Input
                  value={config.supabase_url}
                  onChange={(e) => update("supabase_url", e.target.value)}
                  placeholder="https://xxxxx.supabase.co"
                  type="url"
                  className="flex-1"
                />
                {config.supabase_url && (
                  <button onClick={() => copyToClipboard(config.supabase_url, "URL")} className="p-2 rounded-md hover:bg-secondary">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Supabase Anon Key</Label>
              <Input
                value={config.supabase_anon_key}
                onChange={(e) => update("supabase_anon_key", e.target.value)}
                placeholder="eyJhbGciOi..."
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Supabase Service Role Key</Label>
              <Input
                type="password"
                value={config.supabase_service_role_key}
                onChange={(e) => update("supabase_service_role_key", e.target.value)}
                placeholder="eyJhbGciOi..."
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Used by backend functions. Never exposed to clients.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={testConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {health.status === "connected" && (
              <button
                onClick={testConnection}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-secondary transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-check
              </button>
            )}
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ml-auto"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Connection"}
            </button>
          </div>
        </>
      )}

      {!config.enabled && (
        <div className="p-4 rounded-lg bg-secondary/50 text-center">
          <Database className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Enable to connect an external database for self-hosted deployments.
            <br />
            Your data will be stored on your own infrastructure.
          </p>
        </div>
      )}
    </div>
  );
}
