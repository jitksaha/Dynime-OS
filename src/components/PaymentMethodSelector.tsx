// @ts-nocheck
import { useState, useEffect } from "react";
import { CreditCard, Smartphone, Globe, Loader2, Star, CheckCircle2, ShieldCheck, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface Gateway {
  gateway_key: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
}

interface SavedMethod {
  id: string;
  gateway_key: string;
  display_name: string;
  method_label: string;
  is_default: boolean;
  agreement_id: string | null;
  token: string | null;
}

const GATEWAY_ICONS: Record<string, typeof CreditCard> = {
  sslcommerz: CreditCard,
  bkash: Smartphone,
  stripe: Globe,
  paypal: CreditCard,
  paypal_card: CreditCard,
  dodo: CreditCard,
  paddle: CreditCard,
  
  razorpay: Smartphone,
  twocheckout: Globe,
};

// Module-level cache for payment gateways
let cachedGateways: Gateway[] | null = null;
let gatewayFetchPromise: Promise<Gateway[]> | null = null;

async function fetchGatewaysData(countryCode?: string): Promise<Gateway[]> {
  const cacheKey = countryCode || "__all__";
  if (cachedGateways && (globalThis as any).__gw_cache_key === cacheKey) return cachedGateways;
  if (gatewayFetchPromise && (globalThis as any).__gw_cache_key === cacheKey) return gatewayFetchPromise;

  (globalThis as any).__gw_cache_key = cacheKey;
  gatewayFetchPromise = (async () => {
    try {
      const { data: allGateways } = await supabase
        .from("payment_gateway_configs")
        .select("gateway_key, display_name, description, is_enabled")
        .eq("is_enabled", true);

      let gateways = (allGateways as Gateway[]) || [];

      if (countryCode && gateways.length > 0) {
        const { data: countryMethods } = await supabase
          .from("country_payment_methods")
          .select("gateway_key, is_enabled, priority")
          .eq("country_code", countryCode)
          .order("priority", { ascending: true });

        if (countryMethods && countryMethods.length > 0) {
          const enabledEntries = (countryMethods as any[]).filter(m => m.is_enabled);
          if (enabledEntries.length > 0) {
            // Build priority map for sorting
            const priorityMap = new Map(enabledEntries.map(m => [m.gateway_key, m.priority ?? 99]));
            const enabledKeys = new Set(enabledEntries.map(m => m.gateway_key));
            gateways = gateways
              .filter(g => enabledKeys.has(g.gateway_key))
              .sort((a, b) => (priorityMap.get(a.gateway_key) ?? 99) - (priorityMap.get(b.gateway_key) ?? 99));
          }
          // If all country methods are disabled, check for fallback
          else {
            const fallbackGateways = await fetchFallbackGateways(gateways);
            if (fallbackGateways) gateways = fallbackGateways;
          }
        }
        // No country config exists — check fallback, then show all
        else {
          const fallbackGateways = await fetchFallbackGateways(gateways);
          if (fallbackGateways) gateways = fallbackGateways;
        }
      }

      cachedGateways = gateways;
    } catch {
      cachedGateways = [];
    }
    return cachedGateways;
  })();
  return gatewayFetchPromise;
}

/** Try __FALLBACK__ country config for unconfigured countries */
async function fetchFallbackGateways(allGateways: Gateway[]): Promise<Gateway[] | null> {
  try {
    const { data: fallback } = await supabase
      .from("country_payment_methods")
      .select("gateway_key, is_enabled, priority")
      .eq("country_code", "__FALLBACK__")
      .order("priority", { ascending: true });

    if (fallback && fallback.length > 0) {
      const enabledFallback = (fallback as any[]).filter(m => m.is_enabled);
      if (enabledFallback.length > 0) {
        const priorityMap = new Map(enabledFallback.map(m => [m.gateway_key, m.priority ?? 99]));
        const enabledKeys = new Set(enabledFallback.map(m => m.gateway_key));
        return allGateways
          .filter(g => enabledKeys.has(g.gateway_key))
          .sort((a, b) => (priorityMap.get(a.gateway_key) ?? 99) - (priorityMap.get(b.gateway_key) ?? 99));
      }
    }
  } catch {}
  return null;
}

interface PaymentMethodSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gatewayKey: string, savedMethodId?: string) => void;
  loading?: boolean;
  title?: string;
  description?: string;
  countryCode?: string;
}

export default function PaymentMethodSelector({
  open, onClose, onSelect, loading = false,
  title = "Choose Payment Method",
  description = "Select how you'd like to pay",
  countryCode,
}: PaymentMethodSelectorProps) {
  const [gateways, setGateways] = useState<Gateway[]>(cachedGateways || []);
  const [fetching, setFetching] = useState(!cachedGateways);
  const [selected, setSelected] = useState<string | null>(null);
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<string | null>(null);
  const [tab, setTab] = useState<"saved" | "new">("saved");

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setSelectedSaved(null);
      return;
    }
    setSelected(null);
    setSelectedSaved(null);

    // Invalidate cache when country changes
    const cacheKey = countryCode || "__all__";
    if ((globalThis as any).__gw_cache_key !== cacheKey) {
      cachedGateways = null;
      gatewayFetchPromise = null;
    }

    const fetchSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("saved_payment_methods")
          .select("id, gateway_key, display_name, method_label, is_default, agreement_id, token")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("is_default", { ascending: false });
        const methods = (data as SavedMethod[]) || [];
        setSavedMethods(methods);
        const defaultMethod = methods.find(m => m.is_default);
        if (defaultMethod) {
          setSelectedSaved(defaultMethod.id);
          setTab("saved");
        } else if (methods.length === 0) {
          setTab("new");
        }
      }
    };

    fetchSaved();

    if (cachedGateways && (globalThis as any).__gw_cache_key === cacheKey) {
      setGateways(cachedGateways);
      setFetching(false);
      return;
    }
    setFetching(true);
    fetchGatewaysData(countryCode).then((data) => {
      setGateways(data);
      setFetching(false);
    });
  }, [open, countryCode]);

  const handleConfirm = () => {
    if (tab === "saved" && selectedSaved) {
      const method = savedMethods.find(m => m.id === selectedSaved);
      if (method) onSelect(method.gateway_key, method.id);
    } else if (selected) {
      onSelect(selected);
    }
  };

  const hasSelection = (tab === "saved" && selectedSaved) || (tab === "new" && selected);

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Tabs for saved vs new */}
        {savedMethods.length > 0 && (
          <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border">
            <button
              onClick={() => setTab("saved")}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                tab === "saved" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="h-3 w-3 inline mr-1" /> Saved Methods
            </button>
            <button
              onClick={() => setTab("new")}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                tab === "new" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CreditCard className="h-3 w-3 inline mr-1" /> Other Methods
            </button>
          </div>
        )}

        {tab === "saved" && savedMethods.length > 0 ? (
          <div className="grid gap-3 py-2">
            {savedMethods.map((method) => {
              const Icon = GATEWAY_ICONS[method.gateway_key] || CreditCard;
              const isSelected = selectedSaved === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => { setSelectedSaved(method.id); setSelected(null); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                    isSelected
                      ? "bg-primary/10 border-primary/40 shadow-sm ring-2 ring-primary/20"
                      : "border-border hover:border-primary/20 hover:bg-primary/5"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${isSelected ? "bg-primary/15" : "bg-muted/50"}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {method.method_label}
                    </span>
                    {method.is_default && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">DEFAULT</span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : gateways.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No payment methods available. Contact support.</p>
        ) : (
          <div className="grid gap-3 py-2">
            {gateways.map((gw, idx) => {
              const Icon = GATEWAY_ICONS[gw.gateway_key] || CreditCard;
              const isSelected = selected === gw.gateway_key;
              return (
                <button
                  key={gw.gateway_key}
                  onClick={() => { setSelected(gw.gateway_key); setSelectedSaved(null); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                    isSelected
                      ? "bg-primary/10 border-primary/40 shadow-sm ring-2 ring-primary/20"
                      : "border-border hover:border-primary/20 hover:bg-primary/5"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${isSelected ? "bg-primary/15" : "bg-muted/50"}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {gw.display_name}
                      </span>
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-bold">
                          RECOMMENDED
                        </span>
                      )}
                      {gw.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gw.description}</p>
                      )}
                    </div>
                  {isSelected && (
                    <div className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          <span>Secured & encrypted payment processing</span>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <button
            onClick={handleConfirm}
            disabled={!hasSelection || loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing..." : "Continue to Payment"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
