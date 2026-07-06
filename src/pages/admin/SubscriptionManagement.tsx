// @ts-nocheck
import { useState, useEffect } from "react";
import { CreditCard, UserPlus, X, Save, MoreVertical, Ban, Pencil, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { getModuleDisplayName } from "@/lib/module-labels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Subscription {
  id: string;
  tenant_id: string;
  billing_cycle: string;
  status: string;
  amount: number;
  payment_method: string | null;
  current_period_start: string;
  current_period_end: string | null;
  plan: { name: string; slug: string; modules: string[] } | null;
  tenant?: { name: string } | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_lifetime: number;
  modules: string[];
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface TenantAddon {
  id: string;
  tenant_id: string;
  module_name: string;
  payment_type: string;
  status: string;
  amount: number;
}

// ALL_MODULES fetched dynamically from platform_modules

export default function SubscriptionManagement() {
  const { formatPrice: fmt } = usePlatformCurrency();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allModules, setAllModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({
    tenant_id: "",
    plan_id: "",
    billing_cycle: "monthly",
    status: "active",
    extra_modules: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState({
    plan_id: "",
    billing_cycle: "monthly",
    status: "active",
    extra_modules: [] as string[],
  });
  const [pendingAddons, setPendingAddons] = useState<TenantAddon[]>([]);

  const fetchAll = async () => {
    const [subRes, planRes, tenantRes, addonsRes, modulesRes] = await Promise.all([
      supabase
        .from("tenant_subscriptions")
        .select("*, plan:subscription_plans(name, slug, modules), tenant:tenants(name)")
        .order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("tenants").select("id, name, slug").order("name"),
      supabase.from("tenant_addon_modules").select("*").eq("status", "pending"),
      supabase.from("platform_modules").select("name").eq("is_active", true).order("sort_order"),
    ]);
    if (subRes.data) setSubscriptions(subRes.data as any[]);
    if (planRes.data) setPlans(planRes.data as any[]);
    if (tenantRes.data) setTenants(tenantRes.data);
    if (addonsRes.data) setPendingAddons(addonsRes.data as any[]);
    if (modulesRes.data) setAllModules(modulesRes.data.map(m => m.name));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const getSelectedPlanModules = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    return plan?.modules || [];
  };

  const getAmount = () => {
    const plan = plans.find((p) => p.id === form.plan_id);
    if (!plan) return 0;
    const key = `price_${form.billing_cycle}` as keyof Plan;
    return Number(plan[key]) || 0;
  };

  const toggleFormModule = (mod: string) => {
    setForm((prev) => ({
      ...prev,
      extra_modules: prev.extra_modules.includes(mod)
        ? prev.extra_modules.filter((m) => m !== mod)
        : [...prev.extra_modules, mod],
    }));
  };

  const toggleEditModule = (mod: string) => {
    setEditForm((prev) => ({
      ...prev,
      extra_modules: prev.extra_modules.includes(mod)
        ? prev.extra_modules.filter((m) => m !== mod)
        : [...prev.extra_modules, mod],
    }));
  };

  const syncModules = async (tenantId: string, modules: string[]) => {
    const { data: existing } = await supabase
      .from("tenant_modules")
      .select("module_name")
      .eq("tenant_id", tenantId);
    const existingNames = (existing || []).map((m) => m.module_name);
    const toAdd = modules.filter((m) => !existingNames.includes(m));
    if (toAdd.length > 0) {
      await supabase.from("tenant_modules").insert(
        toAdd.map((m) => ({ tenant_id: tenantId, module_name: m, is_enabled: true }))
      );
    }
  };

  const assignPlan = async () => {
    if (!form.tenant_id || !form.plan_id) {
      toast.error("Select both a company and a plan");
      return;
    }
    setSaving(true);
    const amount = getAmount();
    const now = new Date();
    let periodEnd: string | null = null;
    if (form.billing_cycle === "monthly")
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
    else if (form.billing_cycle === "quarterly")
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString();
    else if (form.billing_cycle === "yearly")
      periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();

    await supabase
      .from("tenant_subscriptions")
      .update({ status: "cancelled" })
      .eq("tenant_id", form.tenant_id)
      .eq("status", "active");

    const { error } = await supabase.from("tenant_subscriptions").insert({
      tenant_id: form.tenant_id,
      plan_id: form.plan_id,
      billing_cycle: form.billing_cycle,
      status: form.status,
      amount,
      payment_method: "manual",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd,
    });

    if (error) { toast.error(error.message); setSaving(false); return; }

    const selectedPlan = plans.find((p) => p.id === form.plan_id);
    if (selectedPlan) {
      await supabase.from("tenants").update({ plan: selectedPlan.slug }).eq("id", form.tenant_id);
      const allModules = [...new Set([...selectedPlan.modules, ...form.extra_modules])];
      await syncModules(form.tenant_id, allModules);
    }

    toast.success("Plan assigned successfully");
    setAssigning(false);
    setForm({ tenant_id: "", plan_id: "", billing_cycle: "monthly", status: "active", extra_modules: [] });
    setSaving(false);
    fetchAll();
  };

  const cancelSubscription = async () => {
    if (!cancelId) return;
    const { error } = await supabase
      .from("tenant_subscriptions")
      .update({ status: "cancelled" })
      .eq("id", cancelId);
    if (error) toast.error(error.message);
    else toast.success("Subscription cancelled");
    setCancelId(null);
    fetchAll();
  };

  const openEdit = (sub: Subscription) => {
    setEditSub(sub);
    setEditForm({
      plan_id: plans.find((p) => p.name === sub.plan?.name)?.id || "",
      billing_cycle: sub.billing_cycle,
      status: sub.status,
      extra_modules: [],
    });
  };

  const getEditAmount = () => {
    const plan = plans.find((p) => p.id === editForm.plan_id);
    if (!plan) return 0;
    const key = `price_${editForm.billing_cycle}` as keyof Plan;
    return Number(plan[key]) || 0;
  };

  const saveEdit = async () => {
    if (!editSub) return;
    setSaving(true);
    const amount = getEditAmount();
    const now = new Date();
    let periodEnd: string | null = null;
    if (editForm.billing_cycle === "monthly")
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
    else if (editForm.billing_cycle === "quarterly")
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString();
    else if (editForm.billing_cycle === "yearly")
      periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();

    const { error } = await supabase
      .from("tenant_subscriptions")
      .update({
        plan_id: editForm.plan_id,
        billing_cycle: editForm.billing_cycle,
        status: editForm.status,
        amount,
        current_period_end: periodEnd,
      })
      .eq("id", editSub.id);

    if (error) { toast.error(error.message); setSaving(false); return; }

    const selectedPlan = plans.find((p) => p.id === editForm.plan_id);
    if (selectedPlan) {
      await supabase.from("tenants").update({ plan: selectedPlan.slug }).eq("id", editSub.tenant_id);
      const allModules = [...new Set([...selectedPlan.modules, ...editForm.extra_modules])];
      await syncModules(editSub.tenant_id, allModules);
    }

    toast.success("Subscription updated");
    setEditSub(null);
    setSaving(false);
    fetchAll();
  };

  const approveAddon = async (addon: TenantAddon) => {
    await supabase.from("tenant_addon_modules").update({ status: "active", approved_at: new Date().toISOString() }).eq("id", addon.id);
    await syncModules(addon.tenant_id, [addon.module_name]);
    toast.success(`${addon.module_name.toUpperCase()} addon approved`);
    fetchAll();
  };

  const rejectAddon = async (addon: TenantAddon) => {
    await supabase.from("tenant_addon_modules").update({ status: "cancelled" }).eq("id", addon.id);
    toast.success("Addon request rejected");
    fetchAll();
  };

  const statusColor: Record<string, string> = {
    active: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
    trial: "bg-info/10 text-info",
    past_due: "bg-warning/10 text-warning",
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const renderModuleSelector = (
    selectedPlanId: string,
    extraModules: string[],
    toggleFn: (mod: string) => void
  ) => {
    const planModules = getSelectedPlanModules(selectedPlanId);
    return (
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">
          <Package className="h-3.5 w-3.5 inline mr-1" />
          Modules (plan modules auto-included, select extra)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {allModules.map((mod) => {
            const inPlan = planModules.includes(mod);
            const extra = extraModules.includes(mod);
            return (
              <button
                key={mod}
                type="button"
                disabled={inPlan}
                onClick={() => !inPlan && toggleFn(mod)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  inPlan
                    ? "bg-primary/15 text-primary border-primary/20 cursor-default"
                    : extra
                    ? "bg-success/15 text-success border-success/20"
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {getModuleDisplayName(mod)} {inPlan ? "✓" : extra ? "+" : ""}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">View and manage tenant subscriptions with module access.</p>
        <button
          onClick={() => setAssigning(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus className="h-4 w-4" /> Assign Plan
        </button>
      </div>

      {/* Pending Addon Requests */}
      {pendingAddons.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-warning" />
            Pending Addon Requests ({pendingAddons.length})
          </h3>
          {pendingAddons.map((addon) => {
            const tenant = tenants.find((t) => t.id === addon.tenant_id);
            return (
              <div key={addon.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{addon.module_name} Module</p>
                  <p className="text-xs text-muted-foreground">
                    {tenant?.name || addon.tenant_id} · {addon.payment_type} · {fmt(addon.amount)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveAddon(addon)} className="px-3 py-1.5 rounded-lg bg-success text-white text-xs font-medium hover:opacity-90">Approve</button>
                  <button onClick={() => rejectAddon(addon)} className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-medium hover:opacity-90">Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assigning && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Manually Assign Subscription Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Company</label>
              <select
                value={form.tenant_id}
                onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select company...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plan</label>
              <select
                value={form.plan_id}
                onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.modules.length} modules)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Billing Cycle</label>
              <select
                value={form.billing_cycle}
                onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
              </select>
            </div>
          </div>

          {form.plan_id && renderModuleSelector(form.plan_id, form.extra_modules, toggleFormModule)}

          {form.plan_id && (
            <p className="text-sm text-muted-foreground">
              Amount: <span className="font-semibold text-foreground">{fmt(getAmount())}</span>
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={assignPlan} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Assign"}
            </button>
            <button onClick={() => setAssigning(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:opacity-90">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No subscriptions yet</p>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{sub.plan?.name || "Unknown Plan"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {sub.billing_cycle} billing · {(sub as any).tenant?.name || sub.tenant_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[sub.status] || "bg-secondary text-muted-foreground"}`}>
                    {sub.status}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(sub)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Modify
                      </DropdownMenuItem>
                      {sub.status !== "cancelled" && (
                        <DropdownMenuItem onClick={() => setCancelId(sub.id)} className="text-destructive focus:text-destructive">
                          <Ban className="h-3.5 w-3.5 mr-2" /> Cancel
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold text-foreground">{fmt(sub.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-foreground">{sub.payment_method || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period End</p>
                  <p className="text-foreground">
                    {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
              {sub.plan?.modules && sub.plan.modules.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">Included Modules:</p>
                  <div className="flex flex-wrap gap-1">
                    {sub.plan.modules.map((m) => (
                      <span key={m} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">{getModuleDisplayName(m)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? The tenant will lose access to plan features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={cancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      {editSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-foreground">
              Modify Subscription — {(editSub as any).tenant?.name || editSub.tenant_id}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Plan</label>
                <select
                  value={editForm.plan_id}
                  onChange={(e) => setEditForm({ ...editForm, plan_id: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.modules.length} modules)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Billing Cycle</label>
                <select
                  value={editForm.billing_cycle}
                  onChange={(e) => setEditForm({ ...editForm, billing_cycle: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>

              {editForm.plan_id && renderModuleSelector(editForm.plan_id, editForm.extra_modules, toggleEditModule)}

              {editForm.plan_id && (
                <p className="text-sm text-muted-foreground">
                  New Amount: <span className="font-semibold text-foreground">{fmt(getEditAmount())}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={saveEdit}
                disabled={saving || !editForm.plan_id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditSub(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:opacity-90"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
