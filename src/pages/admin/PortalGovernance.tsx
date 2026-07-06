import { useState, useEffect } from "react";
import { Globe, ToggleLeft, Users, Shield, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

export default function PortalGovernance() {
  const [selfServiceEnabled, setSelfServiceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "portal_self_service")
        .single();
      if (data) {
        const val = data.value as { enabled?: boolean };
        setSelfServiceEnabled(val?.enabled ?? false);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: { enabled: selfServiceEnabled } as any, updated_at: new Date().toISOString() })
      .eq("key", "portal_self_service");
    setSaving(false);
    if (error) {
      toast.error("Failed to save setting");
    } else {
      toast.success("Portal governance settings saved");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Portal Governance</h1>
        <p className="text-sm text-muted-foreground mt-1">Control how new portals are created in the system</p>
      </div>

      {/* Self-Service Toggle */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Portal Creation Mode</h2>
        </div>

        <div className="space-y-4">
          {/* Self-Service Mode */}
          <button
            onClick={() => setSelfServiceEnabled(true)}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              selfServiceEnabled
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className={`p-2.5 rounded-lg shrink-0 ${selfServiceEnabled ? "bg-primary/10" : "bg-secondary"}`}>
              <Users className={`h-5 w-5 ${selfServiceEnabled ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Self-Service Panel</p>
                {selfServiceEnabled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">Active</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Anyone can register via the public "Create Your Space" page and choose their portal type (Employee or Customer).
              </p>
            </div>
          </button>

          {/* Managed Access Mode */}
          <button
            onClick={() => setSelfServiceEnabled(false)}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              !selfServiceEnabled
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className={`p-2.5 rounded-lg shrink-0 ${!selfServiceEnabled ? "bg-primary/10" : "bg-secondary"}`}>
              <Shield className={`h-5 w-5 ${!selfServiceEnabled ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Managed Access</p>
                {!selfServiceEnabled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">Active</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Only established business accounts can generate portals. Owners assign Employee or Customer roles from their dashboard.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-info/10">
            <ToggleLeft className="h-4 w-4 text-info" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs font-semibold text-foreground mb-1">Self-Service Enabled</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Public "Create Your Space" page visible</li>
              <li>• Visitors register and pick portal type</li>
              <li>• Immediate onboarding into workspace</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs font-semibold text-foreground mb-1">Managed Access</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• No public portal creation</li>
              <li>• Business admins assign portal roles</li>
              <li>• Full control over user onboarding</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </button>
    </div>
  );
}
