// @ts-nocheck
import { useState, useEffect } from "react";
import { Edit2, Save, X, Package, Shield, RotateCcw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { getModuleDisplayName } from "@/lib/module-labels";
import CountryPricingEditor from "@/components/admin/CountryPricingEditor";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_lifetime: number;
  currency: string;
  max_users: number;
  max_employees: number;
  max_invoices: number;
  max_deals: number;
  max_documents: number;
  max_projects: number;
  max_companies: number;
  limit_reset_cycle: string;
  modules: string[];
  features: string[];
  is_active: boolean;
  sort_order: number;
}

const RESET_CYCLE_OPTIONS = [
  { value: "billing_cycle", label: "Reset per Billing Cycle", desc: "Counters reset based on each tenant's subscription cycle (Monthly/Quarterly/Yearly)" },
  { value: "monthly", label: "Reset Monthly", desc: "Counters always reset every month regardless of billing cycle" },
  { value: "quarterly", label: "Reset Quarterly", desc: "Counters reset every 3 months" },
  { value: "yearly", label: "Reset Yearly", desc: "Counters reset every year" },
  { value: "lifetime", label: "Never Reset (Lifetime)", desc: "Counters never reset — absolute limits" },
];

// ALL_MODULES is fetched dynamically from platform_modules table

const LIMIT_FIELDS = [
  { key: "max_users", label: "Max Users", icon: "👥" },
  { key: "max_employees", label: "Max Employees", icon: "🧑‍💼" },
  { key: "max_invoices", label: "Max Invoices/mo", icon: "🧾" },
  { key: "max_deals", label: "Max Deals", icon: "🤝" },
  { key: "max_documents", label: "Max Documents", icon: "📄" },
  { key: "max_projects", label: "Max Projects", icon: "📁" },
  { key: "max_companies", label: "Max Companies", icon: "🏢" },
] as const;

export default function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allModules, setAllModules] = useState<{ name: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Plan>>({});
  const [pricePolicy, setPricePolicy] = useState<"grandfather" | "update_all">("grandfather");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [planPricingMode, setPlanPricingMode] = useState<"uniform" | "country_wise">("uniform");
  const [trialDays, setTrialDays] = useState<number>(14);
  const [savingTrial, setSavingTrial] = useState(false);

  const fetchPlans = async () => {
    const [plansRes, policyRes, pricingModeRes, modulesRes, trialRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("platform_settings").select("value").eq("key", "price_update_policy").maybeSingle(),
      supabase.from("platform_settings").select("value").eq("key", "plan_pricing_mode").maybeSingle(),
      supabase.from("platform_modules").select("name, label").eq("is_active", true).order("sort_order"),
      supabase.from("platform_settings").select("value").eq("key", "trial_days").maybeSingle(),
    ]);
    if (modulesRes.data) setAllModules(modulesRes.data);
    if (plansRes.data) setPlans(plansRes.data as Plan[]);
    if (policyRes.data) {
      const val = typeof policyRes.data.value === "string" ? policyRes.data.value : JSON.stringify(policyRes.data.value);
      setPricePolicy(val.replace(/"/g, "") as any);
    }
    if (pricingModeRes.data) {
      const val = typeof pricingModeRes.data.value === "string" ? pricingModeRes.data.value : JSON.stringify(pricingModeRes.data.value);
      setPlanPricingMode(val.replace(/"/g, "") as any);
    }
    if (trialRes.data) {
      const v = trialRes.data.value;
      const n = typeof v === "number" ? v : parseInt(String(v ?? "14"), 10);
      setTrialDays(Number.isFinite(n) && n > 0 ? n : 14);
    }
    setLoading(false);
  };

  const updateTrialDays = async (days: number) => {
    setSavingTrial(true);
    const safe = Math.max(0, Math.min(365, Math.floor(days || 0)));
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "trial_days", value: safe } as any, { onConflict: "key" });
    if (error) toast.error(error.message);
    else { setTrialDays(safe); toast.success(`Free trial set to ${safe} days for new signups`); }
    setSavingTrial(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const updatePricePolicy = async (newPolicy: "grandfather" | "update_all") => {
    setSavingPolicy(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: JSON.stringify(newPolicy) })
      .eq("key", "price_update_policy");
    if (error) {
      toast.error(error.message);
    } else {
      setPricePolicy(newPolicy);
      toast.success(newPolicy === "grandfather" 
        ? "Existing subscribers will keep their current price" 
        : "All subscribers will get the new price on next billing"
      );
    }
    setSavingPolicy(false);
  };

  const handlePlanPricingModeChange = async (mode: "uniform" | "country_wise") => {
    setPlanPricingMode(mode);
    await supabase.from("platform_settings").update({ value: JSON.stringify(mode) }).eq("key", "plan_pricing_mode");
    toast.success(mode === "uniform" ? "All countries use the same base price" : "Country-wise pricing enabled");
  };

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditData({
      price_monthly: plan.price_monthly,
      price_quarterly: plan.price_quarterly,
      price_yearly: plan.price_yearly,
      price_lifetime: plan.price_lifetime,
      max_users: plan.max_users,
      max_employees: plan.max_employees,
      max_invoices: plan.max_invoices,
      max_deals: plan.max_deals,
      max_documents: plan.max_documents,
      max_projects: plan.max_projects,
      max_companies: plan.max_companies,
      limit_reset_cycle: plan.limit_reset_cycle || "billing_cycle",
      is_active: plan.is_active,
      modules: [...plan.modules],
    });
  };

  const toggleModule = (mod: string) => {
    const current = editData.modules || [];
    setEditData({
      ...editData,
      modules: current.includes(mod) ? current.filter((m) => m !== mod) : [...current, mod],
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("subscription_plans")
      .update(editData)
      .eq("id", editingId);
    if (error) { toast.error(error.message); return; }

    // Sync modules for all tenants that have this plan
    const plan = plans.find((p) => p.id === editingId);
    if (plan) {
      const { data: subs } = await supabase
        .from("tenant_subscriptions")
        .select("tenant_id")
        .eq("plan_id", editingId)
        .eq("status", "active");

      if (subs && subs.length > 0) {
        const newModules = editData.modules || [];
        for (const sub of subs) {
          const { data: existing } = await supabase
            .from("tenant_modules")
            .select("module_name")
            .eq("tenant_id", sub.tenant_id);
          const existingNames = (existing || []).map((m: any) => m.module_name);
          const toAdd = newModules.filter((m) => !existingNames.includes(m));
          if (toAdd.length > 0) {
            await supabase.from("tenant_modules").insert(
              toAdd.map((m) => ({ tenant_id: sub.tenant_id, module_name: m, is_enabled: true }))
            );
          }
        }
      }
    }

    toast.success("Plan updated & modules synced");
    setEditingId(null);
    fetchPlans();
  };

  const { formatPrice: fmt } = usePlatformCurrency();

  const formatLimit = (val: number) => val === -1 ? "Unlimited" : val.toString();

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Manage subscription plans, pricing, limits, and included modules. Changes auto-sync to active subscribers.</p>
      
      {/* Price Update Policy Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Price Update Policy
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              When you change plan or module prices, how should it affect existing subscribers on their next billing date?
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            disabled={savingPolicy}
            onClick={() => updatePricePolicy("grandfather")}
            className={`p-4 rounded-lg border text-left transition-all ${
              pricePolicy === "grandfather"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-background hover:border-primary/30"
            }`}
          >
            <p className="text-sm font-semibold text-foreground">🔒 Grandfather Pricing</p>
            <p className="text-xs text-muted-foreground mt-1">
              Existing subscribers keep their current price. Only new subscribers get the updated price.
            </p>
          </button>
          <button
            disabled={savingPolicy}
            onClick={() => updatePricePolicy("update_all")}
            className={`p-4 rounded-lg border text-left transition-all ${
              pricePolicy === "update_all"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-background hover:border-primary/30"
            }`}
          >
            <p className="text-sm font-semibold text-foreground">🔄 Update All</p>
            <p className="text-xs text-muted-foreground mt-1">
              All subscribers (existing + new) will be billed at the new price on their next billing date.
            </p>
          </button>
        </div>
      </div>

      {/* Free Trial Days Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Free Trial Duration
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Number of days new tenants get as a free trial after onboarding. After the trial ends they need an active subscription to continue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(Math.max(0, Math.min(365, parseInt(e.target.value || "0", 10))))}
              className="w-24 h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">days</span>
            <button
              onClick={() => updateTrialDays(trialDays)}
              disabled={savingTrial}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {savingTrial ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
                {editingId === plan.id ? (
                  <div className="flex gap-1">
                    <button onClick={saveEdit} className="p-1.5 rounded-md text-success hover:bg-success/10 transition-colors"><Save className="h-4 w-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(plan)} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"><Edit2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>

            {editingId === plan.id ? (
              <div className="space-y-4">
                {/* Pricing */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">💰 Pricing</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(["price_monthly", "price_quarterly", "price_yearly", "price_lifetime"] as const).map((field) => (
                      <div key={field}>
                        <label className="block text-xs text-muted-foreground mb-1">{field.replace("price_", "").charAt(0).toUpperCase() + field.replace("price_", "").slice(1)}</label>
                        <input
                          type="number"
                          value={editData[field] || 0}
                          onChange={(e) => setEditData({ ...editData, [field]: Number(e.target.value) })}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limits / Restrictions */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    <Shield className="h-3.5 w-3.5 inline mr-1" />
                    Function Limits & Restrictions (-1 = Unlimited)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {LIMIT_FIELDS.map((lf) => (
                      <div key={lf.key}>
                        <label className="block text-xs text-muted-foreground mb-1">{lf.icon} {lf.label}</label>
                        <input
                          type="number"
                          value={(editData as any)[lf.key] ?? -1}
                          onChange={(e) => setEditData({ ...editData, [lf.key]: Number(e.target.value) })}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limit Reset Cycle */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    <RotateCcw className="h-3.5 w-3.5 inline mr-1" />
                    Limit Reset Cycle (when do usage counters reset?)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {RESET_CYCLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditData({ ...editData, limit_reset_cycle: opt.value })}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          (editData.limit_reset_cycle || "billing_cycle") === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-background hover:border-primary/30"
                        }`}
                      >
                        <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editData.is_active ?? true}
                      onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                      className="rounded border-input"
                    />
                    Active
                  </label>
                </div>

                {/* Module Selection */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    <Package className="h-3.5 w-3.5 inline mr-1" />
                    Included Modules (select which modules this plan grants access to)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allModules.map((mod) => {
                      const selected = (editData.modules || []).includes(mod.name);
                      return (
                        <button
                          key={mod.name}
                          type="button"
                          onClick={() => toggleModule(mod.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
                          }`}
                        >
                          {mod.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Country-Wise Pricing */}
                <CountryPricingEditor
                  entityType="plan"
                  entityId={plan.id}
                  entityName={plan.name}
                  priceFields={[
                    { key: "price_monthly", label: "Monthly" },
                    { key: "price_quarterly", label: "Quarterly" },
                    { key: "price_yearly", label: "Yearly" },
                    { key: "price_lifetime", label: "Lifetime" },
                  ]}
                  basePrices={{
                    price_monthly: editData.price_monthly ?? plan.price_monthly,
                    price_quarterly: editData.price_quarterly ?? plan.price_quarterly,
                    price_yearly: editData.price_yearly ?? plan.price_yearly,
                    price_lifetime: editData.price_lifetime ?? plan.price_lifetime,
                  }}
                  pricingMode={planPricingMode}
                  onPricingModeChange={handlePlanPricingModeChange}
                />
              </div>
            ) : (
              <>
                {/* View mode: Pricing */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="text-sm font-semibold text-foreground">{fmt(plan.price_monthly)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quarterly</p>
                    <p className="text-sm font-semibold text-foreground">{fmt(plan.price_quarterly)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Yearly</p>
                    <p className="text-sm font-semibold text-foreground">{fmt(plan.price_yearly)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lifetime</p>
                    <p className="text-sm font-semibold text-foreground">{fmt(plan.price_lifetime)}</p>
                  </div>
                </div>

                {/* View mode: Limits */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Function Limits:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LIMIT_FIELDS.map((lf) => (
                      <span key={lf.key} className="px-2 py-0.5 rounded-lg bg-muted text-xs font-medium text-foreground">
                        {lf.icon} {lf.label}: {formatLimit((plan as any)[lf.key] ?? -1)}
                      </span>
                    ))}
                  </div>
                </div>
                {/* View mode: Reset Cycle */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Limit Reset:
                  </p>
                  <span className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent-foreground text-xs font-medium">
                    {RESET_CYCLE_OPTIONS.find(o => o.value === (plan.limit_reset_cycle || "billing_cycle"))?.label || "Per Billing Cycle"}
                  </span>
                </div>
              </>
            )}

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1.5">Included Modules:</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.modules.length > 0 ? plan.modules.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">{getModuleDisplayName(m)}</span>
                )) : (
                  <span className="text-xs text-muted-foreground">No modules assigned</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
