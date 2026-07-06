import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePayBrand } from "@/hooks/usePayBrand";
import {
  CreditCard, ToggleLeft, ToggleRight, Settings, Loader2, RefreshCw,
  Shield, Sparkles, CheckCircle2, Info,
} from "lucide-react";

interface PlatformMethod {
  id: string;
  method_key: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
}

interface TenantMethod {
  id: string;
  method_key: string;
  display_name: string;
  is_enabled: boolean;
}

export default function WalletSettings() {
  const { user, profile } = useAuth();
  const { payBrand } = usePayBrand();
  const [platformMethods, setPlatformMethods] = useState<PlatformMethod[]>([]);
  const [tenantMethods, setTenantMethods] = useState<TenantMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const { data: pm } = await supabase
      .from("platform_payment_methods")
      .select("id, method_key, display_name, description, is_enabled")
      .eq("is_enabled", true);

    setPlatformMethods((pm as any) || []);

    const { data: tm } = await supabase
      .from("tenant_payment_methods")
      .select("id, method_key, display_name, is_enabled")
      .eq("tenant_id", profile.tenant_id);

    setTenantMethods((tm as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.tenant_id]);

  const toggleMethod = async (method: PlatformMethod) => {
    if (!profile?.tenant_id || !user) return;
    const existing = tenantMethods.find((m) => m.method_key === method.method_key);

    if (existing) {
      await supabase
        .from("tenant_payment_methods")
        .update({ is_enabled: !existing.is_enabled })
        .eq("id", existing.id);
    } else {
      await supabase.from("tenant_payment_methods").insert({
        tenant_id: profile.tenant_id,
        method_key: method.method_key,
        display_name: method.display_name,
        is_enabled: true,
      } as any);
    }
    toast.success(`${method.display_name} updated`);
    fetchData();
  };

  const isEnabledForTenant = (key: string) => {
    const tm = tenantMethods.find((m) => m.method_key === key);
    return tm?.is_enabled ?? false;
  };

  const enabledCount = platformMethods.filter((m) => isEnabledForTenant(m.method_key)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
             <h1 className="text-xl sm:text-2xl font-bold text-foreground">{payBrand} Settings</h1>
            <p className="text-xs text-muted-foreground">Configure payment methods for your customers</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all hover:scale-105">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Status Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-5">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Payment Gateways</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabledCount} of {platformMethods.length} methods active for your customers
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/15">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{enabledCount} Active</span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Available Payment Methods</h2>
              <p className="text-xs text-muted-foreground">Toggle methods your customers can use</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-primary absolute -bottom-1 -right-1" />
            </div>
            <p className="text-sm text-muted-foreground">Loading payment methods...</p>
          </div>
        ) : platformMethods.length === 0 ? (
          <div className="text-center py-14">
            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-7 w-7 text-primary/40" />
            </div>
            <p className="text-sm font-medium text-foreground">No payment methods available</p>
            <p className="text-xs text-muted-foreground mt-1">Contact support to enable payment gateways</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {platformMethods.map((method) => {
              const enabled = isEnabledForTenant(method.method_key);
              return (
                <div
                  key={method.method_key}
                  className={`flex items-center justify-between p-5 transition-all ${
                    enabled ? "bg-primary/5" : "hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl transition-colors ${enabled ? "bg-primary/15" : "bg-muted/10"}`}>
                      <CreditCard className={`h-5 w-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{method.display_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{method.description || "Payment gateway"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMethod(method)}
                    className="transition-transform hover:scale-110"
                  >
                    {enabled ? (
                      <ToggleRight className="h-8 w-8 text-primary" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold text-foreground">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Shield, text: "Only platform-approved methods appear here" },
            { icon: ToggleRight, text: "Toggle methods for your customers" },
            { icon: CreditCard, text: "Disabled methods are hidden from checkout" },
            { icon: Info, text: "New methods auto-appear when admin enables them" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-card/60 border border-border/50">
              <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
