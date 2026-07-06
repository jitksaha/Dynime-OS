import { useState, useEffect } from "react";
import { ToggleLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface TenantModule {
  id: string;
  tenant_id: string;
  module_name: string;
  is_enabled: boolean;
  tenant_name?: string;
}

export default function FeatureToggles() {
  const [modules, setModules] = useState<TenantModule[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [modsRes, tenantsRes] = await Promise.all([
        supabase.from("tenant_modules").select("*"),
        supabase.from("tenants").select("id, name"),
      ]);
      const tenantMap: Record<string, string> = {};
      (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t.name; });
      const enriched = (modsRes.data || []).map((m: any) => ({ ...m, tenant_name: tenantMap[m.tenant_id] || "Unknown" }));
      setModules(enriched);
      setTenants(tenantsRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleModule = async (mod: TenantModule) => {
    const { error } = await supabase.from("tenant_modules").update({ is_enabled: !mod.is_enabled }).eq("id", mod.id);
    if (error) { toast.error(error.message); return; }
    setModules((prev) => prev.map((m) => m.id === mod.id ? { ...m, is_enabled: !m.is_enabled } : m));
    toast.success(`${mod.module_name} ${!mod.is_enabled ? "enabled" : "disabled"} for ${mod.tenant_name}`);
  };

  const filtered = modules.filter((m) =>
    m.module_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.tenant_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Feature Toggles</h1>
        <p className="text-sm text-muted-foreground mt-1">Control module access per tenant across the platform</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search modules or tenants..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <ToggleLeft className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No feature toggles configured yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="text-sm font-medium text-foreground capitalize">{mod.module_name}</p>
                <p className="text-xs text-muted-foreground">{mod.tenant_name}</p>
              </div>
              <button
                onClick={() => toggleModule(mod)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${mod.is_enabled ? "bg-success" : "bg-secondary"}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${mod.is_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
