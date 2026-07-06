import { useState, useEffect } from "react";
import { Shield, Plus, Trash2, Save, Loader2, Globe, Lock, UserCheck, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

interface SecurityConfig {
  enforce_2fa: boolean;
  session_timeout_minutes: number;
  max_sessions: number;
  password_min_length: number;
  require_uppercase: boolean;
  require_numbers: boolean;
}

interface IPEntry {
  id: string;
  ip_address: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

const defaultSecurity: SecurityConfig = {
  enforce_2fa: false,
  session_timeout_minutes: 1440,
  max_sessions: 5,
  password_min_length: 8,
  require_uppercase: true,
  require_numbers: true,
};

export default function SecuritySuite() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SecurityConfig>(defaultSecurity);
  const [saving, setSaving] = useState(false);
  const [ipList, setIpList] = useState<IPEntry[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addingIp, setAddingIp] = useState(false);

  // GDPR
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchIPs();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from("platform_settings").select("value").eq("key", "security_config").maybeSingle();
    if (data?.value) setConfig({ ...defaultSecurity, ...(data.value as any) });
  };

  const fetchIPs = async () => {
    const { data } = await supabase.from("ip_whitelist").select("*").order("created_at", { ascending: false });
    setIpList((data as IPEntry[]) || []);
  };

  const saveConfig = async () => {
    setSaving(true);
    await supabase.from("platform_settings").upsert({ key: "security_config", value: config as any }, { onConflict: "key" });
    toast.success("Security settings saved!");
    setSaving(false);
  };

  const addIP = async () => {
    if (!newIp.trim()) return;
    setAddingIp(true);
    await supabase.from("ip_whitelist").insert({ ip_address: newIp.trim(), label: newLabel.trim(), created_by: user?.id || "" } as any);
    setNewIp("");
    setNewLabel("");
    fetchIPs();
    toast.success("IP added to whitelist");
    setAddingIp(false);
  };

  const removeIP = async (id: string) => {
    await supabase.from("ip_whitelist").delete().eq("id", id);
    fetchIPs();
    toast.success("IP removed");
  };

  const handleGDPRExport = async () => {
    if (!user) return;
    setExportingData(true);
    try {
      // Fetch user's personal data
      const [profileRes, sessionsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("active_sessions").select("*").eq("user_id", user.id),
        supabase.from("user_roles").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        user_email: user.email,
        profile: profileRes.data,
        sessions: sessionsRes.data,
        roles: rolesRes.data,
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Log the export
      await supabase.from("gdpr_export_requests").insert({ user_id: user.id, status: "completed", completed_at: new Date().toISOString() });

      toast.success("Data exported successfully!");
    } catch {
      toast.error("Export failed");
    }
    setExportingData(false);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Security & Compliance</h1>
          <p className="text-xs text-muted-foreground">2FA enforcement, IP whitelisting, GDPR data export</p>
        </div>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies"><Lock className="h-3.5 w-3.5 mr-1.5" />Policies</TabsTrigger>
          <TabsTrigger value="ip"><Globe className="h-3.5 w-3.5 mr-1.5" />IP Whitelist</TabsTrigger>
          <TabsTrigger value="gdpr"><UserCheck className="h-3.5 w-3.5 mr-1.5" />GDPR Export</TabsTrigger>
        </TabsList>

        {/* Security Policies */}
        <TabsContent value="policies" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Enforce Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground mt-0.5">Require all users to set up 2FA before accessing the platform</p>
              </div>
              <Toggle checked={config.enforce_2fa} onChange={v => setConfig(p => ({ ...p, enforce_2fa: v }))} />
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Require Uppercase in Passwords</p>
                <p className="text-xs text-muted-foreground mt-0.5">Passwords must contain at least one uppercase letter</p>
              </div>
              <Toggle checked={config.require_uppercase} onChange={v => setConfig(p => ({ ...p, require_uppercase: v }))} />
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Require Numbers in Passwords</p>
                <p className="text-xs text-muted-foreground mt-0.5">Passwords must contain at least one digit</p>
              </div>
              <Toggle checked={config.require_numbers} onChange={v => setConfig(p => ({ ...p, require_numbers: v }))} />
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={config.session_timeout_minutes}
                  onChange={e => setConfig(p => ({ ...p, session_timeout_minutes: parseInt(e.target.value) || 1440 }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Max Concurrent Sessions</label>
                <input
                  type="number"
                  value={config.max_sessions}
                  onChange={e => setConfig(p => ({ ...p, max_sessions: parseInt(e.target.value) || 5 }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Min Password Length</label>
                <input
                  type="number"
                  value={config.password_min_length}
                  onChange={e => setConfig(p => ({ ...p, password_min_length: parseInt(e.target.value) || 8 }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-input bg-background text-sm"
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Policies
          </button>
        </TabsContent>

        {/* IP Whitelist */}
        <TabsContent value="ip" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-warning">When enabled, only whitelisted IPs can access the platform. Leave empty to allow all.</p>
            </div>

            <div className="flex gap-2">
              <input
                value={newIp}
                onChange={e => setNewIp(e.target.value)}
                placeholder="192.168.1.0/24"
                className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-40 px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
              <button
                onClick={addIP}
                disabled={addingIp}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                {addingIp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>

            <div className="divide-y divide-border">
              {ipList.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No IP restrictions configured — all IPs allowed</p>
              )}
              {ipList.map(ip => (
                <div key={ip.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-mono font-medium text-foreground">{ip.ip_address}</p>
                    <p className="text-xs text-muted-foreground">{ip.label || "No label"}</p>
                  </div>
                  <button onClick={() => removeIP(ip.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* GDPR Export */}
        <TabsContent value="gdpr" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-info" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Personal Data Export (GDPR)</h2>
                <p className="text-xs text-muted-foreground">Download all your personal data in a machine-readable format</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                In compliance with GDPR Article 20 (Right to Data Portability), you can export all personal data
                associated with your account. The export includes your profile, activity logs, session history,
                and role assignments. The file is generated in JSON format.
              </p>
            </div>

            <button
              onClick={handleGDPRExport}
              disabled={exportingData}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-info text-info-foreground text-sm font-medium hover:bg-info/90"
            >
              {exportingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export My Data
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}