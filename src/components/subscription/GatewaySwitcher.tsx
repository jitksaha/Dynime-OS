// @ts-nocheck
import { useState, useEffect, forwardRef } from "react";
import { CreditCard, Smartphone, Globe, Wallet, RefreshCw, Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SavedMethod {
  id: string;
  gateway_key: string;
  display_name: string;
  method_label: string;
  card_brand: string | null;
  card_last4: string | null;
  phone_last4: string | null;
  is_default: boolean;
}

interface GatewaySwitcherProps {
  open: boolean;
  onClose: () => void;
}

const GW_ICONS: Record<string, typeof CreditCard> = {
  stripe: CreditCard,
  bkash: Smartphone,
  sslcommerz: Globe,
  paypal: Wallet,
  dodo: CreditCard,
  
  razorpay: Smartphone,
  twocheckout: Globe,
};

export const GatewaySwitcher = forwardRef<HTMLDivElement, GatewaySwitcherProps>(function GatewaySwitcher({ open, onClose }, ref) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("saved_payment_methods")
        .select("id, gateway_key, display_name, method_label, card_brand, card_last4, phone_last4, is_default")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false });
      setMethods(data || []);
      const defaultM = data?.find((m: any) => m.is_default);
      setSelectedId(defaultM?.id || null);
      setLoading(false);
    };
    fetch();
  }, [open, user]);

  if (!open) return null;

  const handleSwitch = async () => {
    if (!selectedId || !user) return;
    setSwitching(true);
    try {
      // Set all methods to non-default first
      await supabase.from("saved_payment_methods").update({ is_default: false } as any)
        .eq("user_id", user.id);

      // Set selected as default
      await supabase.from("saved_payment_methods").update({ is_default: true } as any)
        .eq("id", selectedId);

      // Update recurring schedules to use new method
      const { data: schedules } = await supabase
        .from("recurring_payment_schedules")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (schedules && schedules.length > 0) {
        await supabase.from("recurring_payment_schedules")
          .update({ saved_method_id: selectedId } as any)
          .eq("user_id", user.id)
          .eq("status", "active");
      }

      toast.success("Payment method updated for all active subscriptions.");
      onClose();
    } catch {
      toast.error("Failed to switch payment method.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Switch Payment Method</h3>
              <p className="text-sm text-muted-foreground">Choose a different payment method for subscriptions</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : methods.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No saved payment methods found.</p>
              <p className="text-xs text-muted-foreground mt-1">Complete a payment first to save a method.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((m) => {
                const Icon = GW_ICONS[m.gateway_key] || CreditCard;
                const isSelected = selectedId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{m.method_label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.gateway_key}</p>
                    </div>
                    {m.is_default && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">Current</span>
                    )}
                    <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {isSelected && <Check className="h-full w-full text-primary-foreground p-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSwitch}
              disabled={switching || !selectedId || methods.length === 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {switching && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Method
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
