// @ts-nocheck
import { useState, useEffect } from "react";
import { CreditCard, Crown, Check, ArrowUpRight, ArrowDownLeft, Loader2, Receipt, Clock, CheckCircle2, XCircle, AlertCircle, Download, CalendarDays, Users, Zap, ShieldCheck, Ban, Package, Plus, RefreshCw, AlertTriangle, Undo2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/db";
import { downloadReceipt } from "@/lib/receipt-generator";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getModuleDisplayName } from "@/lib/module-labels";
import { PlanChangeDialog } from "@/components/subscription/PlanChangeDialog";
import { GatewaySwitcher } from "@/components/subscription/GatewaySwitcher";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  price_quarterly: number;
  price_lifetime: number;
  features: string[];
  modules: string[];
  max_users: number;
  currency: string;
}

interface Subscription {
  id: string;
  status: string;
  billing_cycle: string;
  amount: number;
  current_period_start: string;
  current_period_end: string | null;
  scheduled_plan_id: string | null;
  cancelled_at: string | null;
  plan: { name: string; slug: string; features: string[]; modules: string[]; max_users: number } | null;
}

interface PaymentRecord {
  id: string;
  status: string;
  billing_cycle: string;
  amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
  current_period_start: string;
  current_period_end: string | null;
  plan: { name: string } | null;
}

interface ModuleAddon {
  id: string;
  module_name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_onetime: number;
  is_active: boolean;
}

interface TenantAddonModule {
  id: string;
  module_name: string;
  payment_type: string;
  billing_cycle: string | null;
  amount: number;
  status: string;
  requested_at: string;
}

export default function MySubscription() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { symbol: cs, convertAndFormat, currency: tenantCurrency, convertFromBase } = useTenantCurrency();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, _setUpgrading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly" | "lifetime">("monthly");
  const [searchParams, setSearchParams] = useSearchParams();
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Addon state
  const [availableAddons, setAvailableAddons] = useState<ModuleAddon[]>([]);
  const [myAddons, setMyAddons] = useState<TenantAddonModule[]>([]);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<ModuleAddon | null>(null);
  const [addonPaymentType, setAddonPaymentType] = useState<"subscription" | "onetime">("subscription");
  const [addonBillingCycle, setAddonBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [requestingAddon, _setRequestingAddon] = useState(false);

  const [verifying, setVerifying] = useState(false);

  // Cancellation state
  const [isCancelled, setIsCancelled] = useState(false);
  const [cancelledAt, setCancelledAt] = useState<string | null>(null);
  const [scheduledDowngradePlan, setScheduledDowngradePlan] = useState<string | null>(null);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (!payment) return;

    if (payment === "success") {
      const addonName = searchParams.get("addon");
      setSearchParams({}, { replace: true });

      const verifyPayment = async () => {
        setVerifying(true);
        try {
          const purpose = addonName ? "addon" : "subscription";
          const { data, error } = await supabase.functions.invoke("payment-verify", {
            body: { purpose, module_name: addonName || undefined },
          });

          if (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment received but activation failed. Please contact support.");
          } else if (data?.status === "activated") {
            toast.success(
              addonName
                ? `${addonName} module activated successfully!`
                : `Plan upgraded to ${data.plan || "new plan"} successfully!`
            );
            window.location.reload();
            return;
          } else if (data?.status === "not_paid") {
            toast.error("Payment not completed. Please try again.");
          } else {
            toast.success(addonName ? `${addonName} module activated!` : "Payment successful!");
          }
        } catch (err) {
          console.error("Verify error:", err);
          toast.success("Payment received! Activation may take a moment.");
        }
        setVerifying(false);
      };

      verifyPayment();
    } else if (payment === "failed") {
      toast.error("Payment failed. Please try again.");
      setSearchParams({}, { replace: true });
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled.");
      setSearchParams({}, { replace: true });
    } else if (payment === "error") {
      toast.error("An error occurred during payment processing.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchData = async () => {
      const [plansRes, subRes, historyRes, tenantRes, addonsRes, myAddonsRes] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
        profile?.tenant_id
          ? supabase
              .from("tenant_subscriptions")
              .select("*, plan:plan_id(name, slug, features, modules, max_users)")
              .eq("tenant_id", profile.tenant_id)
              .in("status", ["active", "cancelled"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        profile?.tenant_id
          ? supabase
              .from("tenant_subscriptions")
              .select("*, plan:plan_id(name)")
              .eq("tenant_id", profile.tenant_id)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
        profile?.tenant_id
          ? supabase.from("tenants").select("plan").eq("id", profile.tenant_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("module_addons").select("*").eq("is_active", true).order("display_name"),
        profile?.tenant_id
          ? supabase.from("tenant_addon_modules").select("*").eq("tenant_id", profile.tenant_id)
          : Promise.resolve({ data: [] }),
      ]);

      if (plansRes.data) setPlans(plansRes.data);
      if (addonsRes.data) setAvailableAddons(addonsRes.data as ModuleAddon[]);
      if (myAddonsRes.data) setMyAddons(myAddonsRes.data as TenantAddonModule[]);

      const tenantPlanSlug = (tenantRes.data as any)?.plan || "free";

      if (subRes.data) {
        const sub = subRes.data as any;
        const subPlanSlug = sub.plan?.slug;

        // If the tenant's actual plan differs from the subscription's plan,
        // the tenant plan is the source of truth (e.g. after instant downgrade)
        if (sub.status === "active" && subPlanSlug === tenantPlanSlug) {
          setSubscription(sub);
        } else if (sub.status === "cancelled" && sub.current_period_end && new Date(sub.current_period_end) > new Date() && subPlanSlug === tenantPlanSlug) {
          setSubscription(sub);
          setIsCancelled(true);
          setCancelledAt(sub.cancelled_at || sub.updated_at);
        } else {
          // Subscription record doesn't match tenant plan — use tenant plan
          const matchedPlan = plansRes.data?.find((p: any) => p.slug === tenantPlanSlug);
          if (matchedPlan) {
            setSubscription({
              id: "derived",
              status: "active",
              billing_cycle: "monthly",
              amount: matchedPlan.price_monthly,
              current_period_start: new Date().toISOString(),
              current_period_end: null,
              scheduled_plan_id: null,
              cancelled_at: null,
              plan: {
                name: matchedPlan.name,
                slug: matchedPlan.slug,
                features: matchedPlan.features,
                modules: matchedPlan.modules,
                max_users: matchedPlan.max_users,
              },
            });
          }
        }
        if (sub.scheduled_plan_id) {
          const scheduledPlan = plansRes.data?.find((p: any) => p.id === sub.scheduled_plan_id);
          setScheduledDowngradePlan(scheduledPlan?.name || "Free");
        }
      } else if (tenantRes.data && plansRes.data) {
        const matchedPlan = plansRes.data.find((p: any) => p.slug === tenantPlanSlug);
        if (matchedPlan) {
          setSubscription({
            id: "derived",
            status: "active",
            billing_cycle: "monthly",
            amount: matchedPlan.price_monthly,
            current_period_start: new Date().toISOString(),
            current_period_end: null,
            scheduled_plan_id: null,
            cancelled_at: null,
            plan: {
              name: matchedPlan.name,
              slug: matchedPlan.slug,
              features: matchedPlan.features,
              modules: matchedPlan.modules,
              max_users: matchedPlan.max_users,
            },
          });
        }
      }

      if (historyRes.data) setPayments(historyRes.data as any);
      setLoading(false);
    };
    fetchData();
  }, [profile?.tenant_id]);

  const currentPlanSlug = subscription?.plan?.slug || "free";
  const hasActiveSubscription = !!subscription && (subscription.status === "active" || (subscription.status === "cancelled" && !!subscription.current_period_end && new Date(subscription.current_period_end) > new Date()));

  const getPlanPrice = (plan: Plan) => {
    switch (billingCycle) {
      case "monthly": return plan.price_monthly;
      case "quarterly": return plan.price_quarterly;
      case "yearly": return plan.price_yearly;
      case "lifetime": return plan.price_lifetime;
    }
  };

  const getPlanLabel = (_plan: Plan) => {
    switch (billingCycle) {
      case "monthly": return "/mo";
      case "quarterly": return "/qtr";
      case "yearly": return "/yr";
      case "lifetime": return "";
    }
  };

  const isCurrentPlan = (slug: string) => currentPlanSlug === slug;

  const planOrder = ["free", "starter", "professional", "enterprise"];

  const isUpgrade = (plan: Plan) =>
    planOrder.indexOf(plan.slug) > planOrder.indexOf(currentPlanSlug);

  const _isDowngrade = (plan: Plan) =>
    planOrder.indexOf(plan.slug) < planOrder.indexOf(currentPlanSlug);

  // Plan change dialog state
  const [planChangeOpen, setPlanChangeOpen] = useState(false);
  const [planChangeTarget, setPlanChangeTarget] = useState<Plan | null>(null);

  // Gateway switcher state
  const [gatewaySwitcherOpen, setGatewaySwitcherOpen] = useState(false);

  const handleUpgrade = (plan: Plan) => {
    setPlanChangeTarget(plan);
    setPlanChangeOpen(true);
  };

  const handleDowngrade = (plan: Plan) => {
    setPlanChangeTarget(plan);
    setPlanChangeOpen(true);
  };

  /** Send subscription change notification */
  const sendNotification = async (action: "upgrade" | "downgrade" | "cancel" | "cancel_scheduled", opts: { previous_plan?: string; new_plan?: string; effective_date?: string; amount?: number; billing_cycle?: string }) => {
    try {
      await supabase.functions.invoke("subscription-notification", {
        body: {
          action,
          tenant_id: profile?.tenant_id,
          user_email: user?.email || "",
          user_name: profile?.full_name || user?.email || "",
          ...opts,
        },
      });
    } catch (e) {
      console.error("Notification send failed:", e);
    }
  };

  const handleCancel = async () => {
    if (!subscription || !profile?.tenant_id) return;
    setCancelling(true);
    try {
      const previousPlan = subscription.plan?.slug || "unknown";

      if (subscription.current_period_end && subscription.id !== "derived") {
        // Schedule cancellation at end of billing period
        await supabase.from("tenant_subscriptions").update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        } as any).eq("id", subscription.id);

        const endDate = new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

        await sendNotification("cancel_scheduled", {
          previous_plan: previousPlan,
          new_plan: "free",
          effective_date: endDate,
        });

        toast.success(`Cancellation scheduled. You'll keep your current plan until ${endDate}.`);
        setIsCancelled(true);
        setCancelledAt(new Date().toISOString());
      } else {
        // Immediate cancellation for derived/free plans
        if (subscription.id !== "derived") {
          await supabase.from("tenant_subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() } as any).eq("id", subscription.id);
        }
        await supabase.from("tenants").update({ plan: "free" }).eq("id", profile.tenant_id);
        const freePlan = plans.find(p => p.slug === "free");
        await supabase.from("tenant_modules").delete().eq("tenant_id", profile.tenant_id);
        if (freePlan && freePlan.modules.length > 0) {
          await supabase.from("tenant_modules").insert(
            freePlan.modules.map((m) => ({ tenant_id: profile.tenant_id!, module_name: m, is_enabled: true }))
          );
        }

        await sendNotification("cancel", {
          previous_plan: previousPlan,
          new_plan: "free",
        });

        toast.success("Subscription cancelled. You are now on the Free plan.");
        window.location.reload();
      }
    } catch { toast.error("Failed to cancel subscription."); }
    finally { setCancelling(false); setCancelDialogOpen(false); }
  };

  const handleReactivate = async () => {
    if (!subscription || subscription.id === "derived" || !profile?.tenant_id) return;
    try {
      await supabase.from("tenant_subscriptions").update({
        status: "active",
        cancelled_at: null,
      } as any).eq("id", subscription.id);

      toast.success("Subscription reactivated successfully!");
      setIsCancelled(false);
      setCancelledAt(null);
      window.location.reload();
    } catch {
      toast.error("Failed to reactivate subscription.");
    }
  };

  const getAddonPrice = (addon: ModuleAddon) => {
    if (addonPaymentType === "onetime") return addon.price_onetime;
    switch (addonBillingCycle) {
      case "quarterly": return addon.price_quarterly;
      case "yearly": return addon.price_yearly;
      default: return addon.price_monthly;
    }
  };

  const requestAddon = () => {
    if (!selectedAddon || !profile?.tenant_id) return;
    const addonAmount = getAddonPrice(selectedAddon);
    const displayAmount = convertFromBase(addonAmount);
    navigate("/checkout", {
      state: {
        paymentDetails: {
          purpose: "addon",
          addon_id: selectedAddon.id,
          payment_type: addonPaymentType,
          billing_cycle: addonPaymentType === "subscription" ? addonBillingCycle : null,
          plan_name: selectedAddon.display_name,
          description: selectedAddon.description || `${selectedAddon.display_name} module`,
          amount: displayAmount,
          currency: tenantCurrency,
          base_amount: addonAmount,
          base_currency: "USD",
        },
      },
    });
  };

  const daysRemaining = subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const includedModules = new Set([
    ...(subscription?.plan?.modules || []),
    ...myAddons.filter((a) => a.status === "active").map((a) => a.module_name),
  ]);

  const purchasableAddons = availableAddons.filter(
    (a) => !includedModules.has(a.module_name) && !myAddons.some((m) => m.module_name === a.module_name && m.status === "pending")
  );

  const fmt = (amount: number) => convertAndFormat(amount);

  if (loading || verifying) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        {verifying && <p className="text-sm text-muted-foreground">Verifying payment and activating your plan...</p>}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your plan, modules, billing, and add-ons</p>
      </div>

      {/* Active Subscription Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Active Subscription</h2>
          </div>
        </div>

        {hasActiveSubscription && subscription ? (
          <div className="p-6">
            {/* Cancellation Notice Banner */}
            {isCancelled && subscription.current_period_end && (
              <div className="mb-5 p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Cancellation Scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your subscription will be cancelled on <strong>{new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>. 
                    You'll continue to have access to all current features until then. After that, your plan will switch to <strong>Free</strong>.
                  </p>
                  {cancelledAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Cancelled on {new Date(cancelledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                  <button
                    onClick={handleReactivate}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Reactivate Subscription
                  </button>
                </div>
              </div>
            )}

            {/* Scheduled Downgrade Notice */}
            {scheduledDowngradePlan && !isCancelled && subscription.current_period_end && (
              <div className="mb-5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                <ArrowDownLeft className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-600">Downgrade Scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your plan will be downgraded to <strong>{scheduledDowngradePlan}</strong> on <strong>{new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>. You'll continue to have access to all current features until then.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">{subscription.plan?.name || "Current Plan"}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isCancelled 
                          ? "bg-destructive/15 text-destructive"
                          : "bg-emerald-500/15 text-emerald-600"
                      }`}>
                        {isCancelled ? "Cancelling" : "Active"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {fmt(Number(subscription.amount))} / {subscription.billing_cycle}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-primary/10 border border-primary/15 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 text-primary mb-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wide">Billing</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground capitalize">{subscription.billing_cycle}</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/15 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 text-primary mb-1">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wide">Users</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Up to {subscription.plan?.max_users === -1 ? "∞" : subscription.plan?.max_users}
                    </p>
                  </div>
                  <div className="bg-primary/10 border border-primary/15 rounded-xl px-4 py-3">
                     <div className="flex items-center gap-1.5 text-primary mb-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wide">{isCancelled ? "Ends" : "Renews"}</span>
                    </div>
                    {subscription.current_period_end && daysRemaining !== null ? (
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {isCancelled ? "Ends" : "Expires"} in {daysRemaining} days
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          on {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">—</p>
                    )}
                  </div>
                  <div className="bg-primary/10 border border-primary/15 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 text-primary mb-1">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wide">Modules</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{includedModules.size} active</p>
                  </div>
                </div>

                {/* Plan Modules */}
                {subscription.plan?.modules && subscription.plan.modules.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Included Modules</p>
                    <div className="flex flex-wrap gap-1.5">
                      {subscription.plan.modules.map((m) => (
                        <span key={m} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">{getModuleDisplayName(m)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Addons */}
                {myAddons.filter((a) => a.status === "active").length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Active Add-on Modules</p>
                    <div className="flex flex-wrap gap-1.5">
                      {myAddons.filter((a) => a.status === "active").map((a) => (
                        <span key={a.id} className="px-2.5 py-1 rounded-lg bg-success/10 text-success text-xs font-medium capitalize">
                          {a.module_name} ({a.payment_type})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Addons */}
                {myAddons.filter((a) => a.status === "pending").length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Pending Add-on Requests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {myAddons.filter((a) => a.status === "pending").map((a) => (
                        <span key={a.id} className="px-2.5 py-1 rounded-lg bg-warning/10 text-warning text-xs font-medium capitalize">
                          {a.module_name} (pending)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-row sm:flex-col gap-2 sm:min-w-[180px] flex-wrap">
                {daysRemaining !== null && (
                  <div className="text-center px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 mb-2">
                    <p className="text-2xl font-bold text-primary">{daysRemaining}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">days remaining</p>
                  </div>
                )}
                {!isCancelled && (
                  <>
                    <button
                      onClick={() => { const s = document.getElementById("plans-section"); s?.scrollIntoView({ behavior: "smooth" }); }}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="h-4 w-4" /> Upgrade Plan
                    </button>
                    <button
                      onClick={() => { const s = document.getElementById("addons-section"); s?.scrollIntoView({ behavior: "smooth" }); }}
                      className="w-full py-2.5 rounded-xl border border-primary/20 text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="h-4 w-4" /> Add Modules
                    </button>
                    <button
                      onClick={() => setGatewaySwitcherOpen(true)}
                      className="w-full py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" /> Switch Gateway
                    </button>
                    <button
                      onClick={() => setCancelDialogOpen(true)}
                      disabled={cancelling}
                      className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                      Cancel Plan
                    </button>
                  </>
                )}
                {isCancelled && (
                  <button
                    onClick={handleReactivate}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Undo2 className="h-4 w-4" /> Reactivate Plan
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="p-3 rounded-xl bg-muted/50 inline-block mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No active subscription</p>
            <p className="text-xs text-muted-foreground mt-1">Choose a plan below to get started</p>
          </div>
        )}
      </div>

      {/* Module Add-ons Section */}
      {hasActiveSubscription && (
        <div id="addons-section" className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-accent/30 via-accent/10 to-transparent px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Module Add-ons</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase additional modules individually. Available as subscription or one-time payment.
            </p>
          </div>

          <div className="p-6">
            {purchasableAddons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All available modules are already included in your plan or pending approval. 🎉
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {purchasableAddons.map((addon) => (
                  <div key={addon.id} className="border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Package className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{addon.display_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{addon.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="text-sm font-bold text-foreground">{fmt(addon.price_monthly)}/mo</p>
                      </div>
                      <button
                        onClick={() => { setSelectedAddon(addon); setAddonDialogOpen(true); }}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Purchase
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing Toggle */}
      <div id="plans-section" className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Available Plans</h2>
          <div className="relative grid grid-cols-4 gap-1 p-1 bg-muted/50 border border-border rounded-lg w-full sm:w-auto">
            {(["monthly", "quarterly", "yearly", "lifetime"] as const).map((c) => {
              const badge = c === "quarterly" ? "-10%" : c === "yearly" ? "-20%" : c === "lifetime" ? "Best" : null;
              return (
                <div key={c} className="relative">
                  {badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-px rounded-full bg-primary text-primary-foreground text-[8px] font-bold whitespace-nowrap leading-tight">
                      {badge}
                    </span>
                  )}
                  <button
                    onClick={() => setBillingCycle(c)}
                    className={`w-full px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all capitalize text-center ${
                      billingCycle === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const current = isCurrentPlan(plan.slug);
          const upgrade = isUpgrade(plan);
          const isProcessing = upgrading === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-5 transition-all flex flex-col ${
                current ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                {current && <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">Current</span>}
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                {fmt(getPlanPrice(plan))}
                <span className="text-sm font-normal text-muted-foreground">{getPlanLabel(plan)}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-4">Up to {plan.max_users === -1 ? "Unlimited" : plan.max_users} users</p>

              <div className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Included Modules:</p>
                <div className="flex flex-wrap gap-1">
                  {plan.modules.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{getModuleDisplayName(m)}</span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-3">
              {current ? (
                subscription?.billing_cycle !== billingCycle ? (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Switch to {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
                  </button>
                ) : (
                  <button disabled className="w-full py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium cursor-default">Current Plan</button>
                )
              ) : upgrade ? (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isProcessing}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</> : <><ArrowUpRight className="h-3.5 w-3.5" /> Upgrade</>}
                </button>
              ) : (
                <button
                  onClick={() => handleDowngrade(plan)}
                  disabled={isProcessing}
                  className="w-full py-2 rounded-lg border border-primary/20 text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</> : <><ArrowDownLeft className="h-3.5 w-3.5" /> Downgrade</>}
                </button>
              )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-[1fr_100px_100px_120px_100px_40px] gap-2 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground">
              <span>Plan</span><span>Amount</span><span>Cycle</span><span>Date</span><span>Status</span><span></span>
            </div>
            {payments.map((p) => {
              const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string }> = {
                active: { icon: CheckCircle2, color: "text-emerald-600" },
                cancelled: { icon: XCircle, color: "text-destructive" },
                pending: { icon: Clock, color: "text-amber-500" },
                failed: { icon: XCircle, color: "text-destructive" },
              };
              const cfg = statusConfig[p.status] || { icon: AlertCircle, color: "text-muted-foreground" };
              const StatusIcon = cfg.icon;

              return (
                <div key={p.id} className="border-b border-border last:border-b-0">
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_100px_100px_120px_100px_40px] gap-2 px-5 py-3 items-center text-sm">
                    <span className="font-medium text-foreground truncate">{p.plan?.name || "Unknown"}</span>
                    <span className="text-foreground">{fmt(Number(p.amount))}</span>
                    <span className="text-muted-foreground capitalize">{p.billing_cycle}</span>
                    <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium capitalize ${cfg.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />{p.status}
                    </span>
                    <button
                    onClick={() => downloadReceipt({
                      planName: p.plan?.name || "Unknown", amount: p.amount, billingCycle: p.billing_cycle,
                      transactionId: p.transaction_id, paymentMethod: p.payment_method, date: p.created_at,
                      status: p.status, periodStart: p.current_period_start, periodEnd: p.current_period_end,
                    }, cs)}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                    title="Download Receipt"
                  >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Mobile card */}
                  <div className="md:hidden px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-sm">{p.plan?.name || "Unknown"}</span>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-xs font-medium capitalize ${cfg.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />{p.status}
                        </span>
                        <button
                          onClick={() => downloadReceipt({
                            planName: p.plan?.name || "Unknown", amount: p.amount, billingCycle: p.billing_cycle,
                            transactionId: p.transaction_id, paymentMethod: p.payment_method, date: p.created_at,
                            status: p.status, periodStart: p.current_period_start, periodEnd: p.current_period_end,
                          }, cs)}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Download Receipt"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{fmt(Number(p.amount))} / {p.billing_cycle}</span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {subscription?.current_period_end && subscription.id !== "derived" ? (
                  <>
                    <p>Your subscription will be cancelled at the end of your current billing period.</p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current plan</span>
                        <span className="font-medium text-foreground">{subscription?.plan?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Access until</span>
                        <span className="font-medium text-foreground">
                          {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">After cancellation</span>
                        <span className="font-medium text-foreground">Free plan</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">You can reactivate your plan anytime before the end date.</p>
                  </>
                ) : (
                  <p>Your plan will be immediately downgraded to the <strong>Free</strong> plan. You'll lose access to premium features right away.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Plan</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Yes, Cancel Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Addon Request Dialog */}
      <AlertDialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Module Add-on</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {selectedAddon && (
                  <div className="space-y-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-foreground text-base">{selectedAddon.display_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedAddon.description}</p>

                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">Payment Type</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAddonPaymentType("subscription")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            addonPaymentType === "subscription"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-foreground border-border"
                          }`}
                        >
                          Subscription
                        </button>
                        <button
                          onClick={() => setAddonPaymentType("onetime")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            addonPaymentType === "onetime"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-foreground border-border"
                          }`}
                        >
                          One-time
                        </button>
                      </div>
                    </div>

                    {addonPaymentType === "subscription" && (
                      <div>
                        <label className="text-xs font-medium text-foreground mb-2 block">Billing Cycle</label>
                        <div className="flex gap-2">
                          {(["monthly", "quarterly", "yearly"] as const).map((c) => (
                            <button
                              key={c}
                              onClick={() => setAddonBillingCycle(c)}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                                addonBillingCycle === c
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary text-foreground border-border"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-primary/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-foreground">{fmt(getAddonPrice(selectedAddon))}</p>
                      <p className="text-xs text-muted-foreground">
                        {addonPaymentType === "onetime" ? "one-time payment" : `per ${addonBillingCycle === "monthly" ? "month" : addonBillingCycle === "quarterly" ? "quarter" : "year"}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={requestAddon} disabled={requestingAddon}>
              {requestingAddon ? "Processing..." : "Pay & Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Plan Change Dialog */}
      {planChangeTarget && (
        <PlanChangeDialog
          open={planChangeOpen}
          onClose={() => { setPlanChangeOpen(false); setPlanChangeTarget(null); }}
          currentPlan={subscription?.plan || null}
          targetPlan={planChangeTarget}
          currentSubscription={subscription ? {
            id: subscription.id,
            billing_cycle: subscription.billing_cycle,
            amount: subscription.amount,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end || null,
          } : null}
          billingCycle={billingCycle}
        />
      )}

      {/* Gateway Switcher */}
      <GatewaySwitcher open={gatewaySwitcherOpen} onClose={() => setGatewaySwitcherOpen(false)} />

    </div>
  );
}
