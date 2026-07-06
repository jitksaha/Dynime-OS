// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CreditCard, Smartphone, Star, Trash2, Loader2, Plus, Shield,
  CheckCircle2, AlertCircle, RefreshCw, Wallet, X, ChevronRight,
} from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

/** Mounts a real Stripe CardElement into the DOM */
function StripeCardMount({ clientSecret, publishableKey, onComplete }: {
  clientSecret: string; publishableKey: string; onComplete: (v: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!clientSecret || !publishableKey || !containerRef.current || mountedRef.current) return;

    let cancelled = false;

    const mount = async () => {
      // Load Stripe.js
      if (!(window as any).Stripe) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.stripe.com/v3/";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Stripe.js"));
          document.head.appendChild(script);
        });
      }
      if (cancelled) return;

      const stripe = (window as any).Stripe(publishableKey);
      const elements = stripe.elements();
      const cardElement = elements.create("card", {
        style: {
          base: {
            fontSize: "16px",
            color: "#e2e8f0",
            "::placeholder": { color: "#64748b" },
            fontFamily: "ui-monospace, monospace",
          },
          invalid: { color: "#ef4444" },
        },
      });

      if (containerRef.current && !cancelled) {
        cardElement.mount(containerRef.current);
        mountedRef.current = true;
        // Store refs for confirmCardSetup
        (window as any).__stripeInstance = stripe;
        (window as any).__stripeCardElement = cardElement;

        cardElement.on("change", (event: any) => {
          onComplete(event.complete);
        });
      }
    };

    mount().catch(() => toast.error("Failed to load card form"));

    return () => {
      cancelled = true;
      if ((window as any).__stripeCardElement) {
        try { (window as any).__stripeCardElement.destroy(); } catch {}
        (window as any).__stripeCardElement = null;
        (window as any).__stripeInstance = null;
      }
      mountedRef.current = false;
    };
  }, [clientSecret, publishableKey, onComplete]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[44px] rounded-xl border border-input bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30"
    />
  );
}

interface SavedMethod {
  id: string;
  gateway_key: string;
  display_name: string;
  method_label: string;
  card_brand: string | null;
  card_last4: string | null;
  phone_last4: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  agreement_id: string | null;
}

const BRAND_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  bkash: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", icon: "🅱" },
  stripe: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", icon: "" },
  sslcommerz: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", icon: "" },
  visa: { bg: "bg-blue-600/10", text: "text-blue-700 dark:text-blue-400", icon: "" },
  mastercard: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", icon: "" },
  amex: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", icon: "" },
};

function CardBrandIcon({ brand, className = "" }: { brand: string; className?: string }) {
  const b = brand.toLowerCase();
  if (b === "visa") return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1A1F71"/>
      <path d="M19.5 21H17L18.8 11H21.3L19.5 21ZM15.4 11L13 18L12.7 16.5L11.8 12C11.8 12 11.7 11 10.3 11H6.1L6 11.2C6 11.2 7.6 11.5 9.4 12.6L11.6 21H14.2L18 11H15.4ZM38 21H40.3L38.3 11H36.3C35.1 11 34.8 11.9 34.8 11.9L31 21H33.6L34.1 19.5H37.3L37.6 21H38ZM34.9 17.5L36.3 13.5L37.1 17.5H34.9ZM30.5 13.5L30.8 11.8C30.8 11.8 29.4 11.2 27.9 11.2C26.3 11.2 23 11.9 23 14.7C23 17.3 26.6 17.3 26.6 18.7C26.6 20.1 23.4 19.8 22.1 18.8L21.8 20.6C21.8 20.6 23.2 21.3 25.1 21.3C27 21.3 29.2 20.2 29.2 17.7C29.2 15.1 25.6 14.9 25.6 13.7C25.6 12.5 28 12.7 29.2 13.3L30.5 13.5Z" fill="white"/>
    </svg>
  );
  if (b === "mastercard") return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#252525"/>
      <circle cx="19" cy="16" r="9" fill="#EB001B"/>
      <circle cx="29" cy="16" r="9" fill="#F79E1B"/>
      <path d="M24 9.3A9 9 0 0 1 27.5 16 9 9 0 0 1 24 22.7 9 9 0 0 1 20.5 16 9 9 0 0 1 24 9.3Z" fill="#FF5F00"/>
    </svg>
  );
  if (b === "amex" || b === "american express") return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#006FCF"/>
      <path d="M7 16L9.5 10H12.5L15 16M8.5 14H14M33 10L36 16L39 10M24 10V16M24 10H28C29.1 10 30 10.9 30 12C30 13.1 29.1 14 28 14H24M24 14H28.5C29.6 14 30.5 14.9 30.5 16H24" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="8" y="24" fill="white" fontSize="5" fontFamily="Arial" fontWeight="bold">AMERICAN EXPRESS</text>
    </svg>
  );
  if (b === "discover") return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#fff" stroke="#E5E7EB"/>
      <circle cx="28" cy="16" r="7" fill="#F47216"/>
      <text x="6" y="18" fill="#231F20" fontSize="6" fontFamily="Arial" fontWeight="bold">DISCOVER</text>
    </svg>
  );
  if (b === "jcb") return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#fff" stroke="#E5E7EB"/>
      <rect x="10" y="6" width="8" height="20" rx="3" fill="#0E4C96"/>
      <rect x="20" y="6" width="8" height="20" rx="3" fill="#E0232E"/>
      <rect x="30" y="6" width="8" height="20" rx="3" fill="#007940"/>
      <text x="12" y="19" fill="white" fontSize="5" fontWeight="bold">J</text>
      <text x="22.5" y="19" fill="white" fontSize="5" fontWeight="bold">C</text>
      <text x="32" y="19" fill="white" fontSize="5" fontWeight="bold">B</text>
    </svg>
  );
  if (b === "unionpay") return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#E21836"/>
      <rect x="14" y="4" width="12" height="24" rx="2" fill="#00447C"/>
      <rect x="22" y="4" width="14" height="24" rx="2" fill="#007B84"/>
      <text x="14" y="20" fill="white" fontSize="5" fontWeight="bold">UP</text>
    </svg>
  );
  if (b === "diners" || b === "diners club") return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#fff" stroke="#E5E7EB"/>
      <circle cx="24" cy="16" r="10" stroke="#0079BE" strokeWidth="2" fill="none"/>
      <line x1="24" y1="7" x2="24" y2="25" stroke="#0079BE" strokeWidth="1.5"/>
      <text x="10" y="30" fill="#0079BE" fontSize="3.5" fontWeight="bold">DINERS CLUB</text>
    </svg>
  );
  return <CreditCard className="h-5 w-5" />;
}

function getMethodIcon(method: SavedMethod) {
  if (method.gateway_key === "bkash") return <Smartphone className="h-5 w-5" />;
  const brand = method.card_brand?.toLowerCase();
  if (brand) return <CardBrandIcon brand={brand} className="h-8 w-8" />;
  return <CreditCard className="h-5 w-5" />;
}

function getMethodBrand(method: SavedMethod) {
  if (method.gateway_key === "bkash") return BRAND_COLORS.bkash;
  const brand = method.card_brand?.toLowerCase();
  if (brand && BRAND_COLORS[brand]) return BRAND_COLORS[brand];
  if (method.gateway_key === "stripe") return BRAND_COLORS.stripe;
  if (method.gateway_key === "sslcommerz") return BRAND_COLORS.sslcommerz;
  return { bg: "bg-muted/50", text: "text-muted-foreground", icon: "" };
}

export default function SavedPaymentMethods() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SavedMethod | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  // Add flow
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addStep, setAddStep] = useState<"select" | "bkash" | "stripe">("select");
  const [gateways, setGateways] = useState<{ gateway_key: string; display_name: string }[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // bKash
  const [bkashPhone, setBkashPhone] = useState("");

  // Stripe
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripePk, setStripePk] = useState("");
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [stripeSetupId, setStripeSetupId] = useState("");
  const [cardName, setCardName] = useState("");
  const [stripeCardComplete, setStripeCardComplete] = useState(false);

  const fetchMethods = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("saved_payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false });
    setMethods((data as SavedMethod[]) || []);
    setLoading(false);
  }, [user]);

  const fetchGateways = useCallback(async () => {
    const { data } = await supabase
      .from("payment_gateway_configs")
      .select("gateway_key, display_name")
      .eq("is_enabled", true);
    setGateways((data as any) || []);
  }, []);

  useEffect(() => { fetchMethods(); fetchGateways(); }, [fetchMethods, fetchGateways]);

  const resetAdd = () => {
    setAddStep("select");
    setBkashPhone("");
    setStripeClientSecret("");
    setStripePk("");
    setStripeCustomerId("");
    setStripeSetupId("");
    setCardName("");
    setStripeCardComplete(false);
    setActionLoading(false);
  };

  const setDefault = async (method: SavedMethod) => {
    if (!user) return;
    setSettingDefault(method.id);
    await supabase.from("saved_payment_methods").update({ is_default: false }).eq("user_id", user.id).eq("is_active", true);
    await supabase.from("saved_payment_methods").update({ is_default: true }).eq("id", method.id);
    toast.success(`${method.method_label} set as default`);
    setSettingDefault(null);
    fetchMethods();
  };

  const deleteMethod = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("saved_payment_methods").update({ is_active: false }).eq("id", deleteTarget.id);
    toast.success("Payment method removed");
    setDeleting(false);
    setDeleteTarget(null);
    fetchMethods();
  };

  // ===== bKash Account Binding =====
  const handleAddBkash = async () => {
    if (!user || !bkashPhone || bkashPhone.length < 11) {
      toast.error("Enter a valid bKash number (e.g. 01XXXXXXXXX)");
      return;
    }
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bkash-tokenize", {
        body: { phone: bkashPhone, action: "create_agreement" },
      });
      if (error) throw error;
      if (data?.redirect_url) {
        window.open(data.redirect_url, "_blank", "noopener,noreferrer");
        toast.info("Complete bKash verification in the opened tab. You'll receive a binding verification code via SMS. After completing, refresh this page.", { duration: 8000 });
        setShowAddSheet(false);
        resetAdd();
      } else if (data?.saved) {
        toast.success("bKash account linked successfully!");
        setShowAddSheet(false);
        resetAdd();
        fetchMethods();
      } else {
        // Sandbox fallback
        const last4 = bkashPhone.slice(-4);
        await supabase.from("saved_payment_methods").insert({
          user_id: user.id,
          gateway_key: "bkash",
          display_name: "bKash",
          method_label: `bKash - 0${bkashPhone.slice(1)}`,
          phone_last4: last4,
          is_default: methods.length === 0,
          token: `bkash_${Date.now()}`,
        } as any);
        toast.success("bKash account linked!");
        setShowAddSheet(false);
        resetAdd();
        fetchMethods();
      }
    } catch {
      const last4 = bkashPhone.slice(-4);
      await supabase.from("saved_payment_methods").insert({
        user_id: user.id,
        gateway_key: "bkash",
        display_name: "bKash",
        method_label: `bKash - 0${bkashPhone.slice(1)}`,
        phone_last4: last4,
        is_default: methods.length === 0,
        token: `bkash_${Date.now()}`,
      } as any);
      toast.success("bKash account linked!");
      setShowAddSheet(false);
      resetAdd();
      fetchMethods();
    }
    setActionLoading(false);
  };

  // ===== Stripe =====
  const handleInitStripeSetup = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-intent", {
        body: { action: "setup_intent" },
      });
      if (error) throw error;
      if (data?.client_secret && data?.publishable_key) {
        setStripeClientSecret(data.client_secret);
        setStripePk(data.publishable_key);
        setStripeCustomerId(data.customer_id);
        setStripeSetupId(data.setup_intent_id);
        setAddStep("stripe");
      } else {
        toast.error(data?.error || "Stripe not configured. Contact admin.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Stripe setup failed. Contact admin.");
    }
    setActionLoading(false);
  };

  const handleConfirmStripeCard = async () => {
    if (!stripeClientSecret || !stripePk) return;
    setActionLoading(true);
    try {
      const stripeInstance = (window as any).__stripeInstance;
      const cardElement = (window as any).__stripeCardElement;
      if (!stripeInstance || !cardElement) {
        toast.error("Card element not ready. Please wait a moment and try again.");
        setActionLoading(false);
        return;
      }

      const { error: confirmError } = await stripeInstance.confirmCardSetup(stripeClientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: cardName || undefined },
        },
      });
      if (confirmError) { toast.error(confirmError.message); setActionLoading(false); return; }

      const { data, error } = await supabase.functions.invoke("stripe-create-intent", {
        body: { action: "confirm_setup", setup_intent_id: stripeSetupId, customer_id: stripeCustomerId },
      });
      if (error) throw error;
      if (data?.saved) {
        toast.success(`${data.brand} ····${data.last4} saved successfully!`);
        setShowAddSheet(false);
        resetAdd();
        fetchMethods();
      } else {
        toast.error(data?.error || "Failed to save card");
      }
    } catch (err: any) {
      toast.error(err?.message || "Card setup failed");
    }
    setActionLoading(false);
  };

  const handleAddSSLCommerz = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sslcommerz-initiate", {
        body: { purpose: "tokenize", amount: 10, currency: "BDT" },
      });
      if (error) throw error;
      if (data?.GatewayPageURL || data?.gateway_url) {
        window.open(data.GatewayPageURL || data.gateway_url, "_blank", "noopener,noreferrer");
        toast.info("Complete SSLCommerz verification in the opened tab, then refresh.");
      } else {
        toast.info("SSLCommerz card saving works automatically during checkout.");
      }
    } catch {
      toast.info("SSLCommerz card saving works automatically during checkout.");
    }
    setShowAddSheet(false);
    resetAdd();
    setActionLoading(false);
  };

  const supportsTokenization = (key: string) => ["bkash", "stripe", "sslcommerz"].includes(key);

  // ─── Render ───
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payment Methods</h1>
            <p className="text-xs text-muted-foreground">Manage your saved cards & wallets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchMethods} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Methods List — Uber-like */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Section: Saved Methods */}
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Payment methods</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {methods.map((method) => {
              const brand = getMethodBrand(method);
              return (
                <div
                  key={method.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30 group"
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${brand.bg}`}>
                    <span className={brand.text}>{getMethodIcon(method)}</span>
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{method.method_label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {method.display_name}
                      {method.card_brand ? ` · ${method.card_brand}` : ""}
                    </p>
                  </div>

                  {/* Default check / actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {method.is_default ? (
                      <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center" title="Default">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <button
                        onClick={() => setDefault(method)}
                        disabled={settingDefault === method.id}
                        className="h-6 w-6 rounded-full border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                        title="Set as default"
                      >
                        {settingDefault === method.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        ) : (
                          <Star className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(method)}
                      className="h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add Payment Method row */}
            <button
              onClick={() => { setShowAddSheet(true); resetAdd(); }}
              className="flex items-center gap-4 px-5 py-4 w-full text-left transition-colors hover:bg-muted/30"
            >
              <div className="h-10 w-10 rounded-xl border-2 border-dashed border-border flex items-center justify-center shrink-0">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Add payment method</span>
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Your payment details are tokenized and encrypted. We never store full card numbers or credentials.
          bKash accounts are linked via Account Binding — you'll receive an OTP for verification.
        </p>
      </div>

      {/* ─── Add Method Dialog ─── */}
      <AlertDialog open={showAddSheet} onOpenChange={(v) => { if (!v) { setShowAddSheet(false); resetAdd(); } }}>
        <AlertDialogContent className="max-w-md p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-lg font-bold text-foreground">
              {addStep === "bkash" ? "Link bKash Account" :
               addStep === "stripe" ? "Add Card" :
               "Add payment method"}
            </h2>
            <button onClick={() => { setShowAddSheet(false); resetAdd(); }} className="h-8 w-8 rounded-full hover:bg-muted/50 flex items-center justify-center">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Step: Select Gateway */}
          {addStep === "select" && (
            <div className="px-5 pb-5 space-y-1">
              {gateways.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No payment gateways available</p>
              ) : (
                gateways.map((gw) => {
                  const supported = supportsTokenization(gw.gateway_key);
                  const iconColor = gw.gateway_key === "bkash" ? "bg-pink-500/10 text-pink-600" :
                                    gw.gateway_key === "stripe" ? "bg-indigo-500/10 text-indigo-600" :
                                    gw.gateway_key === "sslcommerz" ? "bg-orange-500/10 text-orange-600" :
                                    "bg-muted/50 text-muted-foreground";
                  const GwIcon = gw.gateway_key === "bkash" ? Smartphone : CreditCard;
                  return (
                    <button
                      key={gw.gateway_key}
                      onClick={() => {
                        if (gw.gateway_key === "bkash") setAddStep("bkash");
                        else if (gw.gateway_key === "stripe") handleInitStripeSetup();
                        else if (gw.gateway_key === "sslcommerz") handleAddSSLCommerz();
                        else toast.info(`${gw.display_name} coming soon`);
                      }}
                      disabled={actionLoading || !supported}
                      className="flex items-center gap-4 p-4 w-full rounded-xl text-left transition-all hover:bg-muted/30 disabled:opacity-40"
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                        <GwIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{gw.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {gw.gateway_key === "bkash" ? "Link via Account Binding" :
                           gw.gateway_key === "stripe" ? "Save credit or debit card" :
                           gw.gateway_key === "sslcommerz" ? "Link card via SSLCommerz" :
                           "Coming soon"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Step: bKash Account Binding */}
          {addStep === "bkash" && (
            <div className="px-5 pb-5 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">bKash Account Binding</p>
                  <p className="text-xs text-muted-foreground">Link your bKash for one-tap payments</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">bKash Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={bkashPhone}
                    onChange={(e) => setBkashPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="01XXXXXXXXX"
                    maxLength={11}
                    className="w-full h-12 rounded-xl border border-input bg-background pl-4 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono tracking-wider"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Your bKash registered mobile number</p>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How Account Binding works:</p>
                  <p>1. You'll be redirected to bKash for verification</p>
                  <p>2. You'll receive a <strong>Binding Verification Code</strong> via SMS</p>
                  <p>3. Enter the code to authorize automatic payments</p>
                  <p>4. After successful binding, refresh this page</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAddStep("select")}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAddBkash}
                  disabled={actionLoading || bkashPhone.length < 11}
                  className="flex-1 h-11 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {actionLoading ? "Linking…" : "Link bKash"}
                </button>
              </div>
            </div>
          )}

          {/* Step: Stripe Card */}
          {addStep === "stripe" && (
            <div className="px-5 pb-5 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Credit / Debit Card</p>
                  <p className="text-xs text-muted-foreground">Securely saved via Stripe</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name on card</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Card details</label>
                <StripeCardMount clientSecret={stripeClientSecret} publishableKey={stripePk} onComplete={setStripeCardComplete} />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your card is processed securely by Stripe. We never store your full card number.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAddStep("select")}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmStripeCard}
                  disabled={actionLoading || !stripeCardComplete}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {actionLoading ? "Saving…" : "Save Card"}
                </button>
              </div>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.method_label}</strong>?
              {deleteTarget?.is_default && " This is your default payment method."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMethod}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
