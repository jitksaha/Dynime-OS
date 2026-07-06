// @ts-nocheck
import { useState, useEffect } from "react";
import { Building2, Plus, Save, X, Pause, Play, Search, ChevronDown, ChevronUp, Package, ToggleLeft, ToggleRight, Trash2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { getModuleDisplayName } from "@/lib/module-labels";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  industry: string | null;
  size: string | null;
  is_active: boolean;
  trial_ends_at: string | null;
  created_at: string;
}

interface TenantModule {
  id: string;
  tenant_id: string;
  module_name: string;
  is_enabled: boolean;
}

interface PlatformModule {
  name: string;
  label: string;
}

export default function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", slug: "", plan: "starter", industry: "", size: "" });
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [tenantModules, setTenantModules] = useState<TenantModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [platformModules, setPlatformModules] = useState<PlatformModule[]>([]);

  const fetchPlatformModules = async () => {
    const { data } = await supabase
      .from("platform_modules")
      .select("name, label")
      .eq("is_active", true)
      .order("sort_order");
    if (data) setPlatformModules(data);
  };

  const handleDeleteTenant = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete", {
      body: { type: "tenant", id: deleteTarget.id },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Failed to delete company");
    } else {
      toast.success(`Company "${deleteTarget.name}" deleted`);
      fetchTenants();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const fetchTenants = async () => {
    const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    if (data) setTenants(data);
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); fetchPlatformModules(); }, []);

  const toggleActive = async (tenant: Tenant) => {
    const { error } = await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id);
    if (error) { toast.error(error.message); return; }
    toast.success(tenant.is_active ? "Tenant suspended" : "Tenant activated");
    fetchTenants();
  };

  const createTenant = async () => {
    if (!newTenant.name || !newTenant.slug) { toast.error("Name and slug required"); return; }
    const { error } = await supabase.from("tenants").insert({
      name: newTenant.name,
      slug: newTenant.slug,
      plan: newTenant.plan,
      industry: newTenant.industry || null,
      size: newTenant.size || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tenant created");
    setCreating(false);
    setNewTenant({ name: "", slug: "", plan: "starter", industry: "", size: "" });
    fetchTenants();
  };

  const fetchModulesForTenant = async (tenantId: string) => {
    setLoadingModules(true);
    const { data } = await supabase
      .from("tenant_modules")
      .select("*")
      .eq("tenant_id", tenantId);
    setTenantModules(data || []);
    setLoadingModules(false);
  };

  const toggleExpand = (tenantId: string) => {
    if (expandedTenant === tenantId) {
      setExpandedTenant(null);
      setTenantModules([]);
    } else {
      setExpandedTenant(tenantId);
      fetchModulesForTenant(tenantId);
    }
  };

  const toggleModule = async (tenantId: string, moduleName: string) => {
    setTogglingModule(moduleName);
    const existing = tenantModules.find((m) => m.module_name === moduleName);

    if (existing) {
      const { error } = await supabase
        .from("tenant_modules")
        .update({ is_enabled: !existing.is_enabled })
        .eq("id", existing.id);
      if (error) { toast.error(error.message); setTogglingModule(null); return; }
    } else {
      const { error } = await supabase
        .from("tenant_modules")
        .insert({ tenant_id: tenantId, module_name: moduleName, is_enabled: true });
      if (error) { toast.error(error.message); setTogglingModule(null); return; }
    }

    toast.success(`${moduleName} ${existing?.is_enabled ? "disabled" : "enabled"}`);
    await fetchModulesForTenant(tenantId);
    setTogglingModule(null);
  };

  const enableAllModules = async (tenantId: string) => {
    setTogglingModule("all");
    for (const mod of platformModules) {
      const existing = tenantModules.find((m) => m.module_name === mod.name);
      if (existing) {
        if (!existing.is_enabled) {
          await supabase.from("tenant_modules").update({ is_enabled: true }).eq("id", existing.id);
        }
      } else {
        await supabase.from("tenant_modules").insert({ tenant_id: tenantId, module_name: mod.name, is_enabled: true });
      }
    }
    toast.success("All modules enabled");
    await fetchModulesForTenant(tenantId);
    setTogglingModule(null);
  };

  const disableAllModules = async (tenantId: string) => {
    setTogglingModule("all");
    for (const existing of tenantModules) {
      if (existing.is_enabled) {
        await supabase.from("tenant_modules").update({ is_enabled: false }).eq("id", existing.id);
      }
    }
    toast.success("All modules disabled");
    await fetchModulesForTenant(tenantId);
    setTogglingModule(null);
  };

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tenant Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{tenants.length} total companies</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Company
        </button>
      </div>

      {creating && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Create New Tenant</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Company name" value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Slug (url-friendly)" value={newTenant.slug} onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <select value={newTenant.plan} onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Industry (optional)" value={newTenant.industry} onChange={(e) => setNewTenant({ ...newTenant, industry: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Company size (optional)" value={newTenant.size} onChange={(e) => setNewTenant({ ...newTenant, size: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-2">
            <button onClick={createTenant} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Save className="h-4 w-4" /> Create</button>
            <button onClick={() => setCreating(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:opacity-90"><X className="h-4 w-4" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.slug} · {t.plan} · {t.industry || "N/A"} · {t.size || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {t.is_active ? "Active" : "Suspended"}
                </span>
                <button
                  onClick={() => toggleActive(t)}
                  className={`p-1.5 rounded-md transition-colors ${t.is_active ? "text-warning hover:bg-warning/10" : "text-success hover:bg-success/10"}`}
                  title={t.is_active ? "Suspend" : "Activate"}
                >
                  {t.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setDeleteTarget(t)}
                  className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete company"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleExpand(t.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
                  title="Manage Modules"
                >
                  {expandedTenant === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedTenant === t.id && (
              <div className="border-t border-border bg-muted/30 px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Module Access</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => enableAllModules(t.id)}
                      disabled={togglingModule === "all"}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                    >
                      Enable All
                    </button>
                    <button
                      onClick={() => disableAllModules(t.id)}
                      disabled={togglingModule === "all"}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {loadingModules ? (
                  <div className="flex justify-center py-4"><div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {platformModules.map((mod) => {
                      const existing = tenantModules.find((m) => m.module_name === mod.name);
                      const enabled = existing?.is_enabled ?? false;
                      const isToggling = togglingModule === mod.name || togglingModule === "all";

                      return (
                        <button
                          key={mod.name}
                          onClick={() => toggleModule(t.id, mod.name)}
                          disabled={isToggling}
                          className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
                            enabled
                              ? "border-primary/30 bg-primary/5 text-foreground"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          <span>{mod.label || getModuleDisplayName(mod.name)}</span>
                          {enabled ? (
                            <ToggleRight className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No companies found</p>}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>?
              This will remove all company data including employees, invoices, projects, and subscriptions. Users will be unlinked but not deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTenant} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Deleting...</> : "Delete Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
