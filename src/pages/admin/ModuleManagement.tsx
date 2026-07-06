// @ts-nocheck
import { useState, useEffect } from "react";
import { Package, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Modules fetched dynamically from platform_modules table

export default function ModuleManagement() {
  const { profile } = useAuth();
  const [allModules, setAllModules] = useState<{ name: string; label: string; desc: string }[]>([]);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const fetchData = async () => {
      const [tenantModRes, platformModRes] = await Promise.all([
        supabase.from("tenant_modules").select("module_name, is_enabled").eq("tenant_id", profile.tenant_id!),
        supabase.from("platform_modules").select("name, label, description").eq("is_active", true).order("sort_order"),
      ]);
      const moduleMap: Record<string, boolean> = {};
      if (tenantModRes.data) tenantModRes.data.forEach((m: any) => { moduleMap[m.module_name] = m.is_enabled; });
      setEnabledModules(moduleMap);
      if (platformModRes.data) setAllModules(platformModRes.data.map(m => ({ name: m.name, label: m.label, desc: m.description || "" })));
      setLoading(false);
    };
    fetchData();
  }, [profile?.tenant_id]);

  const toggleModule = async (moduleName: string) => {
    if (!profile?.tenant_id) return;
    const isCurrentlyEnabled = enabledModules[moduleName] ?? false;
    const newState = !isCurrentlyEnabled;

    // Optimistic update
    setEnabledModules((prev) => ({ ...prev, [moduleName]: newState }));

    // Upsert
    const { error } = await supabase.from("tenant_modules").upsert(
      { tenant_id: profile.tenant_id!, module_name: moduleName, is_enabled: newState },
      { onConflict: "tenant_id,module_name" }
    );

    if (error) {
      setEnabledModules((prev) => ({ ...prev, [moduleName]: isCurrentlyEnabled }));
      toast.error(error.message);
    } else {
      toast.success(`${moduleName.toUpperCase()} ${newState ? "enabled" : "disabled"}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Toggle modules to control which features are available to your team.</p>
      <div className="space-y-2">
        {allModules.map((mod) => {
          const enabled = enabledModules[mod.name] ?? true; // default enabled if not configured
          return (
            <div key={mod.name} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${enabled ? "bg-success/10" : "bg-secondary"}`}>
                  <Package className={`h-4 w-4 ${enabled ? "text-success" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{mod.label}</p>
                  <p className="text-xs text-muted-foreground">{mod.desc}</p>
                </div>
              </div>
              <button
                onClick={() => toggleModule(mod.name)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${enabled ? "bg-success" : "bg-secondary"}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
