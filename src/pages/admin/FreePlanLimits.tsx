// @ts-nocheck
import { useState, useEffect } from "react";
import { Save, Loader2, Shield, Users, Target, FileText, Headphones, FolderOpen, BarChart3, Zap, HardDrive, TrendingUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { getModuleDisplayName } from "@/lib/module-labels";

interface FreeLimit {
  id: string;
  limit_key: string;
  limit_label: string;
  limit_value: number;
  limit_description: string | null;
  category: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  general: Shield,
  hrms: Users,
  crm: Target,
  accounting: FileText,
  helpdesk: Headphones,
  projects: BarChart3,
  documents: FolderOpen,
  marketing: TrendingUp,
  workflows: Zap,
};

const categoryColors: Record<string, string> = {
  general: "text-primary bg-primary/10",
  hrms: "text-chart-2 bg-chart-2/10",
  crm: "text-success bg-success/10",
  accounting: "text-warning bg-warning/10",
  helpdesk: "text-info bg-info/10",
  projects: "text-chart-4 bg-chart-4/10",
  documents: "text-chart-5 bg-chart-5/10",
  marketing: "text-primary bg-primary/10",
  workflows: "text-warning bg-warning/10",
};

export default function FreePlanLimits() {
  const [limits, setLimits] = useState<FreeLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});
  const [freePlan, setFreePlan] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [planModules, setPlanModules] = useState<string[]>([]);
  const [planFeatures, setPlanFeatures] = useState<string>("");

  const [allModules, setAllModules] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [limitsRes, planRes, modulesRes] = await Promise.all([
        supabase.from("free_plan_limits").select("*").order("category, limit_key"),
        supabase.from("subscription_plans").select("*").eq("slug", "free").maybeSingle(),
        supabase.from("platform_modules").select("name").eq("is_active", true).order("sort_order"),
      ]);
      if (limitsRes.data) setLimits(limitsRes.data as FreeLimit[]);
      if (planRes.data) {
        setFreePlan(planRes.data);
        setPlanModules(planRes.data.modules || []);
        setPlanFeatures((planRes.data.features || []).join("\n"));
      }
      if (modulesRes.data) setAllModules(modulesRes.data.map(m => m.name));
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleValueChange = (key: string, value: number) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (limit: FreeLimit) => {
    return editedValues[limit.limit_key] !== undefined ? editedValues[limit.limit_key] : limit.limit_value;
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(editedValues)) {
        const { error } = await supabase
          .from("free_plan_limits")
          .update({ limit_value: value })
          .eq("limit_key", key);
        if (error) throw error;
      }

      // Also update the free plan's features text to reflect limits
      if (freePlan) {
        const updatedFeatures = limits.map((l) => {
          const val = editedValues[l.limit_key] !== undefined ? editedValues[l.limit_key] : l.limit_value;
          if (val === 0) return null;
          if (l.limit_key === "max_storage_mb") return `${val}MB storage`;
          if (l.limit_key === "max_users") return `Up to ${val} users`;
          return `${val} ${l.limit_label.toLowerCase()}`;
        }).filter(Boolean);

        await supabase
          .from("subscription_plans")
          .update({ features: updatedFeatures, max_users: editedValues["max_users"] ?? freePlan.max_users })
          .eq("slug", "free");
      }

      toast.success("Free plan limits saved successfully");
      setEditedValues({});
      // Refresh
      const { data } = await supabase.from("free_plan_limits").select("*").order("category, limit_key");
      if (data) setLimits(data as FreeLimit[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const savePlanConfig = async () => {
    if (!freePlan) return;
    setSaving(true);
    try {
      const features = planFeatures.split("\n").map(f => f.trim()).filter(Boolean);
      const { error } = await supabase
        .from("subscription_plans")
        .update({ modules: planModules, features, is_active: freePlan.is_active })
        .eq("slug", "free");
      if (error) throw error;
      toast.success("Free plan config updated");
      setEditingPlan(false);
      const { data } = await supabase.from("subscription_plans").select("*").eq("slug", "free").maybeSingle();
      if (data) {
        setFreePlan(data);
        setPlanModules(data.modules || []);
        setPlanFeatures((data.features || []).join("\n"));
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (mod: string) => {
    setPlanModules((prev) => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  // Group by category
  const grouped = limits.reduce<Record<string, FreeLimit[]>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category].push(l);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Free Plan Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure the forever-free plan limits and included modules. Changes affect all free-tier tenants.</p>
      </div>

      {/* Free Plan Overview Card */}
      {freePlan && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/10">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Forever Free Plan</h3>
                <p className="text-xs text-muted-foreground">{freePlan.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${freePlan.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                {freePlan.is_active ? "Active" : "Inactive"}
              </span>
              <button
                onClick={() => setEditingPlan(!editingPlan)}
                className="text-xs text-primary font-medium hover:underline"
              >
                {editingPlan ? "Cancel" : "Edit Plan"}
              </button>
            </div>
          </div>

          {editingPlan ? (
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Plan Active</label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={freePlan.is_active}
                    onChange={(e) => setFreePlan({ ...freePlan, is_active: e.target.checked })}
                    className="rounded border-input"
                  />
                  Show on pricing page
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Included Modules</label>
                <div className="flex flex-wrap gap-2">
                  {allModules.map((mod) => (
                    <button
                      key={mod}
                      onClick={() => toggleModule(mod)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                        planModules.includes(mod)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {getModuleDisplayName(mod)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Feature List (one per line)</label>
                <textarea
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Up to 2 users&#10;5 employee records&#10;Community support"
                />
              </div>
              <button onClick={savePlanConfig} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : <Save className="h-4 w-4 inline mr-1" />}
                Save Plan Config
              </button>
            </div>
          ) : (
            <div className="border-t border-border pt-3">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(freePlan.modules || []).map((m: string) => (
                  <span key={m} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">{getModuleDisplayName(m)}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {(freePlan.features || []).map((f: string) => (
                  <span key={f} className="px-2 py-1 rounded-lg bg-secondary">✓ {f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Limits Configuration */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Usage Limits</h2>
        {hasChanges && (
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Changes
          </button>
        )}
      </div>

      {Object.entries(grouped).map(([category, items]) => {
        const Icon = categoryIcons[category] || Shield;
        const colorClass = categoryColors[category] || "text-primary bg-primary/10";
        return (
          <div key={category} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`p-2 rounded-xl ${colorClass.split(" ")[1]}`}>
                <Icon className={`h-4 w-4 ${colorClass.split(" ")[0]}`} />
              </div>
              <h3 className="text-sm font-semibold text-foreground capitalize">{category}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((limit) => (
                <div key={limit.id} className="space-y-1.5">
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{limit.limit_label}</span>
                    {editedValues[limit.limit_key] !== undefined && editedValues[limit.limit_key] !== limit.limit_value && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Modified</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={getValue(limit)}
                    onChange={(e) => handleValueChange(limit.limit_key, Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {limit.limit_description && (
                    <p className="text-[11px] text-muted-foreground">{limit.limit_description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
