// @ts-nocheck
import { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Loader2, AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  price_quarterly: number;
  price_lifetime: number;
  modules: string[];
  features: string[];
}

interface PlanChangeDialogProps {
  open: boolean;
  onClose: () => void;
  currentPlan: { slug: string; name: string } | null;
  targetPlan: Plan;
  currentSubscription: {
    id: string;
    billing_cycle: string;
    amount: number;
    current_period_start: string;
    current_period_end: string | null;
  } | null;
  billingCycle: "monthly" | "quarterly" | "yearly" | "lifetime";
}

export function PlanChangeDialog({ open, onClose, currentPlan, targetPlan, currentSubscription, billingCycle }: PlanChangeDialogProps) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { convertAndFormat, convertFromBase, currency: tenantCurrency } = useTenantCurrency();
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const planOrder = ["free", "starter", "professional", "enterprise"];
  const currentIdx = planOrder.indexOf(currentPlan?.slug || "free");
  const targetIdx = planOrder.indexOf(targetPlan.slug);
  const isUpgrade = targetIdx > currentIdx;

  const targetPrice = billingCycle === "yearly" ? targetPlan.price_yearly
    : billingCycle === "quarterly" ? targetPlan.price_quarterly
    : billingCycle === "lifetime" ? targetPlan.price_lifetime
    : targetPlan.price_monthly;

  // Calculate proration credit
  let prorationCredit = 0;
  if (isUpgrade && currentSubscription?.current_period_end && currentSubscription.amount > 0) {
    const periodStart = new Date(currentSubscription.current_period_start).getTime();
    const periodEnd = new Date(currentSubscription.current_period_end).getTime();
    const now = Date.now();
    const totalDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
    const remainingDays = Math.max(0, (periodEnd - now) / (1000 * 60 * 60 * 24));
    if (totalDays > 0) {
      prorationCredit = Math.round((remainingDays / totalDays) * currentSubscription.amount * 100) / 100;
    }
  }

  const amountDue = Math.max(0, targetPrice - prorationCredit);

  const sendNotification = async (action: "upgrade" | "downgrade", opts: Record<string, any>) => {
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
      console.error("Notification error:", e);
    }
  };

  const handleUpgrade = () => {
    const displayAmount = convertFromBase(amountDue);
    navigate("/checkout", {
      state: {
        paymentDetails: {
          purpose: "subscription",
          plan_id: targetPlan.id,
          billing_cycle: billingCycle,
          plan_name: `${targetPlan.name} (Upgrade)`,
          description: prorationCredit > 0
            ? `Upgrade to ${targetPlan.name} with ${convertAndFormat(prorationCredit)} proration credit`
            : `Upgrade to ${targetPlan.name}`,
          amount: displayAmount,
          currency: tenantCurrency,
          base_amount: amountDue,
          base_currency: "USD",
        },
      },
    });
    onClose();
  };

  const handleDowngrade = async () => {
    if (!profile?.tenant_id || !currentSubscription) return;
    setProcessing(true);
    try {
      // Immediate downgrade
      await supabase.from("tenants").update({ plan: targetPlan.slug }).eq("id", profile.tenant_id);
      await supabase.from("tenant_modules").delete().eq("tenant_id", profile.tenant_id);
      if (targetPlan.modules.length > 0) {
        await supabase.from("tenant_modules").insert(
          targetPlan.modules.map((m) => ({ tenant_id: profile.tenant_id!, module_name: m, is_enabled: true }))
        );
      }

      // Cancel active subscription if exists
      if (currentSubscription.id !== "derived") {
        await supabase.from("tenant_subscriptions").update({
          status: "cancelled",
          scheduled_plan_id: null,
        } as any).eq("id", currentSubscription.id);
      }

      await sendNotification("downgrade", {
        previous_plan: currentPlan?.slug,
        new_plan: targetPlan.slug,
      });

      toast.success(`Downgraded to ${targetPlan.name} successfully.`);
      window.location.reload();
    } catch {
      toast.error("Failed to process plan change.");
    } finally {
      setProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isUpgrade ? "bg-primary/10" : "bg-amber-500/10"}`}>
              {isUpgrade
                ? <ArrowUpRight className="h-5 w-5 text-primary" />
                : <ArrowDownLeft className="h-5 w-5 text-amber-500" />
              }
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isUpgrade ? "Upgrade" : "Downgrade"} Plan
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentPlan?.name} → {targetPlan.name}
              </p>
            </div>
          </div>

          {/* Proration Details */}
          {isUpgrade && (
            <div className="space-y-3 bg-muted/30 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New plan price</span>
                <span className="font-medium text-foreground">{convertAndFormat(targetPrice)}/{billingCycle}</span>
              </div>
              {prorationCredit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Proration credit</span>
                  <span className="font-medium text-emerald-600">-{convertAndFormat(prorationCredit)}</span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex justify-between text-base">
                <span className="font-semibold text-foreground">Due today</span>
                <span className="font-bold text-foreground">{convertAndFormat(amountDue)}</span>
              </div>
              {prorationCredit > 0 && (
                <p className="text-xs text-muted-foreground">
                  Credit calculated from remaining {Math.ceil(
                    currentSubscription?.current_period_end
                      ? (new Date(currentSubscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      : 0
                  )} days on current plan.
                </p>
              )}
            </div>
          )}

          {!isUpgrade && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p>Your plan will change immediately. Some features may become unavailable.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New plan includes:</p>
                <div className="grid grid-cols-2 gap-1">
                  {targetPlan.features.slice(0, 6).map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={isUpgrade ? handleUpgrade : handleDowngrade}
              disabled={processing}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                isUpgrade
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              } disabled:opacity-50`}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUpgrade ? `Pay ${convertAndFormat(amountDue)}` : "Confirm Downgrade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
