// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Receipt,
  ArrowLeft,
  Lock,
  CreditCard,
  Smartphone,
  Globe,
  Wallet,
  ChevronRight,
  ChevronDown,
  X,
  Star,
  Tag,
  Check,
  Loader2,
} from "lucide-react";
import { GatewayList, LayoutSwitcher, type CheckoutLayout } from "@/components/checkout/GatewayListLayouts";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/db";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useAuth } from "@/hooks/useAuth";
import { useCartAbandonment } from "@/hooks/useCartAbandonment";
import { Input } from "@/components/ui/input";

/* ───────── types ───────── */
type PaymentDetails = {
  purpose: "subscription" | "addon" | "wallet_topup";
  plan_id?: string;
  billing_cycle?: string;
  addon_id?: string;
  payment_type?: string;
  amount?: number;
  currency?: string;
  base_amount?: number;
  base_currency?: string;
  wallet_id?: string;
  saved_method_id?: string;
  plan_name?: string;
  description?: string;
  tax_amount?: number;
};

type CheckoutOption = {
  key: string;
  gatewayKey: string;
  label: string;
  description: string;
  icon: typeof CreditCard;
  logoUrl?: string | null;
  convertedAmount?: number;
  convertedCurrency?: string;
};

type SavedMethod = {
  id: string;
  gateway_key: string;
  display_name: string;
  method_label: string;
  card_brand: string | null;
  card_last4: string | null;
  phone_last4: string | null;
  is_default: boolean;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  bdt: "৳", usd: "$", eur: "€", gbp: "£", inr: "₹", jpy: "¥",
  cny: "¥", krw: "₩", thb: "฿", myr: "RM", sgd: "S$", aud: "A$", cad: "C$",
};

const GATEWAY_ICONS: Record<string, typeof CreditCard> = {
  stripe: CreditCard, bkash: Smartphone, sslcommerz: Globe,
  paypal: Wallet, paddle: CreditCard, dodo: CreditCard,
};

const FALLBACK_PROC_CURRENCIES: Record<string, string | null> = {
  bkash: "BDT", sslcommerz: "BDT", stripe: null, paypal: "USD", paddle: "USD", dodo: "USD",
};

function getCurrencySymbol(currency: string) {
  const c = currency.toLowerCase();
  if (CURRENCY_SYMBOLS[c]) return CURRENCY_SYMBOLS[c];
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: c, maximumFractionDigits: 0 })
      .format(0).replace(/[\d.,\s]/g, "");
  } catch { return currency.toUpperCase(); }
}

function prettifyGatewayName(key: string) {
  return key.split("_").join(" ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ── Coupon Section ── */
function CouponSection({ onApply, onRemove, appliedCoupon }: {
  onApply: (code: string) => Promise<{ success: boolean; message: string }>;
  onRemove: () => void;
  appliedCoupon: { code: string; discount: number; type: string } | null;
}) {
  const [expanded, setExpanded] = useState(!!appliedCoupon);
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setMessage(null);
    const result = await onApply(code.trim().toUpperCase());
    setMessage({ text: result.message, success: result.success });
    if (result.success) setCode("");
    setValidating(false);
  };

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Have a coupon code?</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-2">
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{appliedCoupon.code}</p>
                  <p className="text-xs text-primary">
                    {appliedCoupon.type === "percentage"
                      ? `${appliedCoupon.discount}% off`
                      : `${getCurrencySymbol("usd")}${appliedCoupon.discount} off`}
                  </p>
                </div>
              </div>
              <button
                onClick={onRemove}
                className="text-xs text-destructive hover:underline font-medium"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setMessage(null); }}
                placeholder="Enter coupon code"
                className="flex-1 h-10 uppercase tracking-wider text-sm font-medium"
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
              />
              <button
                onClick={handleApply}
                disabled={!code.trim() || validating}
                className="px-4 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
          {message && (
            <p className={`text-xs px-1 ${message.success ? "text-primary" : "text-destructive"}`}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Order Summary ── */
function OrderSummary({ amount, currency, purpose, planName, description, taxAmount, appName, discount }: {
  amount: number; currency: string; purpose: string; planName?: string;
  description?: string; taxAmount: number; appName: string; discount: number;
}) {
  const sym = getCurrencySymbol(currency);
  const subtotal = Math.max(amount + discount - taxAmount, 0);
  const purposeLabel = purpose === "subscription" ? "Subscription" : purpose === "addon" ? "Add-on Module" : "Wallet Top-up";

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/50 mb-8">{appName}</p>
        <p className="text-xs text-primary-foreground/50 mb-1">Amount due</p>
        <p className="text-4xl font-extrabold text-primary-foreground tracking-tight mb-8">
          {sym}{amount.toLocaleString()}
        </p>
        <div className="rounded-2xl bg-primary-foreground/[0.08] backdrop-blur-sm p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-primary-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-foreground truncate">{planName || purposeLabel}</p>
              {description && <p className="text-xs text-primary-foreground/40 mt-1 line-clamp-2">{description}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 text-sm text-primary-foreground/60 mt-8">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium text-primary-foreground/80">{sym}{subtotal.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-300">
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Coupon discount</span>
            <span className="font-medium">-{sym}{discount.toLocaleString()}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax / VAT</span>
            <span className="font-medium text-primary-foreground/80">{sym}{taxAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="h-px bg-primary-foreground/10" />
        <div className="flex justify-between text-base">
          <span className="font-semibold text-primary-foreground">Due today</span>
          <span className="font-bold text-primary-foreground">{sym}{amount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Card Brand SVGs ── */
function CardBrandIcon({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  if (b === "visa") return (
    <svg viewBox="0 0 48 32" className="h-6 w-9" fill="none"><rect width="48" height="32" rx="4" fill="#1A1F71"/><path d="M19.5 21H17L18.8 11H21.3L19.5 21ZM15.4 11L13 18L12.7 16.5L11.8 12C11.8 12 11.7 11 10.3 11H6.1L6 11.2C6 11.2 7.6 11.5 9.4 12.6L11.6 21H14.2L18 11H15.4ZM38 21H40.3L38.3 11H36.3C35.1 11 34.8 11.9 34.8 11.9L31 21H33.6L34.1 19.5H37.3L37.6 21H38ZM34.9 17.5L36.3 13.5L37.1 17.5H34.9ZM30.5 13.5L30.8 11.8C30.8 11.8 29.4 11.2 27.9 11.2C26.3 11.2 23 11.9 23 14.7C23 17.3 26.6 17.3 26.6 18.7C26.6 20.1 23.4 19.8 22.1 18.8L21.8 20.6C21.8 20.6 23.2 21.3 25.1 21.3C27 21.3 29.2 20.2 29.2 17.7C29.2 15.1 25.6 14.9 25.6 13.7C25.6 12.5 28 12.7 29.2 13.3L30.5 13.5Z" fill="white"/></svg>
  );
  if (b === "mastercard") return (
    <svg viewBox="0 0 48 32" className="h-6 w-9" fill="none"><rect width="48" height="32" rx="4" fill="#252525"/><circle cx="19" cy="16" r="9" fill="#EB001B"/><circle cx="29" cy="16" r="9" fill="#F79E1B"/><path d="M24 9.3A9 9 0 0 1 27.5 16 9 9 0 0 1 24 22.7 9 9 0 0 1 20.5 16 9 9 0 0 1 24 9.3Z" fill="#FF5F00"/></svg>
  );
  if (b === "amex" || b === "american express") return (
    <svg viewBox="0 0 48 32" className="h-6 w-9" fill="none"><rect width="48" height="32" rx="4" fill="#006FCF"/><text x="8" y="20" fill="white" fontSize="8" fontFamily="Arial" fontWeight="bold">AMEX</text></svg>
  );
  return null;
}

/* ── Saved Methods Section (Collapsible) ── */
function SavedMethodsSection({ methods, selectedId, onSelect, gatewayLogos }: {
  methods: SavedMethod[]; selectedId: string | null; onSelect: (id: string | null) => void;
  gatewayLogos: Record<string, string | null>;
}) {
  const [expanded, setExpanded] = useState(false);

  if (methods.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Saved methods</span>
          <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{methods.length}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-1.5 animate-fade-in">
          {methods.map((m) => {
            const isSelected = selectedId === m.id;
            const brandIcon = m.card_brand ? <CardBrandIcon brand={m.card_brand} /> : null;
            const gwLogo = gatewayLogos[m.gateway_key];

            const iconContent = brandIcon || (
              gwLogo
                ? <img src={gwLogo} alt={m.display_name} className="h-5 w-5 object-contain" />
                : m.gateway_key === "bkash"
                  ? <Smartphone className="h-4 w-4" />
                  : <CreditCard className="h-4 w-4" />
            );

            return (
              <button
                key={m.id}
                onClick={() => onSelect(isSelected ? null : m.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all text-sm ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {iconContent}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">{m.method_label}</p>
                  <p className="text-xs text-muted-foreground">{m.display_name}</p>
                </div>
                {m.is_default && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                    <Star className="h-2.5 w-2.5" /> Default
                  </span>
                )}
                <div className={`h-4 w-4 rounded-full border-2 shrink-0 transition-colors ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <div className="h-full w-full rounded-full flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </div>}
                </div>
              </button>
            );
          })}
          {selectedId && (
            <p className="text-xs text-muted-foreground pl-1">Using saved method — skip gateway selection below</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Checkout ── */
export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appInfo } = useAppInfo();
  const { user } = useAuth();
  const { trackCartView, clearCart } = useCartAbandonment();
  const appName = appInfo?.app_name || "Dynime";
  const paymentDetails = location.state?.paymentDetails as PaymentDetails | undefined;

  const [paymentOptions, setPaymentOptions] = useState<CheckoutOption[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [checkoutLayout, setCheckoutLayout] = useState<CheckoutLayout>("accordion");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("usd");
  const [baseAmount, setBaseAmount] = useState(0);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Saved methods
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  // Coupon
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: string; id: string } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const taxAmount = paymentDetails?.tax_amount || 0;

  useEffect(() => {
    if (!paymentDetails) { navigate("/subscription", { replace: true }); return; }
    const bAmt = paymentDetails.base_amount ?? paymentDetails.amount ?? 0;
    const bCur = (paymentDetails.base_currency ?? paymentDetails.currency ?? "USD").toUpperCase();
    setBaseAmount(bAmt);
    setBaseCurrency(bCur);
    setAmount(paymentDetails.amount || bAmt);
    setCurrency((paymentDetails.currency || "usd").toLowerCase());

    // Track cart for abandonment
    trackCartView({
      item_name: paymentDetails.plan_name || paymentDetails.description || "Purchase",
      cart_type: paymentDetails.purpose || "subscription",
      amount: bAmt,
      currency: bCur,
      plan_id: paymentDetails.plan_id,
      billing_cycle: paymentDetails.billing_cycle,
      addon_id: paymentDetails.addon_id,
      description: paymentDetails.description,
    });
  }, [paymentDetails, navigate, trackCartView]);

  const [gatewayProcCurrencies, setGatewayProcCurrencies] = useState<Record<string, string | null>>(FALLBACK_PROC_CURRENCIES);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setFetching(true);
      const gwPromise = supabase.from("payment_gateway_configs")
        .select("gateway_key, display_name, description, is_enabled, processing_currency, display_order, logo_url")
        .eq("is_enabled", true).order("display_order", { ascending: true });
      const ratesPromise = supabase.from("platform_settings").select("value").eq("key", "enabled_countries").maybeSingle();
      const layoutPromise = supabase.from("platform_settings").select("value").eq("key", "checkout_layout").maybeSingle();
      const cachePromise = supabase.from("exchange_rate_cache")
        .select("rates")
        .eq("base_currency", "USD")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const savedPromise = user
        ? supabase.from("saved_payment_methods")
            .select("id, gateway_key, display_name, method_label, card_brand, card_last4, phone_last4, is_default")
            .eq("user_id", user.id).eq("is_active", true)
            .order("is_default", { ascending: false })
        : null;

      const [gwRes, ratesRes, layoutRes, cacheRes, savedRes] = await Promise.all([
        gwPromise, ratesPromise, layoutPromise, cachePromise, savedPromise,
      ]);
      if (!active) return;

      const dbLayout = (layoutRes.data?.value as string) || "accordion";
      const userLayout = localStorage.getItem("checkout_layout");
      setCheckoutLayout((userLayout || dbLayout) as CheckoutLayout);

      // Build rates: prefer live cache, fallback to enabled_countries
      const rates: Record<string, number> = { USD: 1 };
      let hasCacheRates = false;
      if (cacheRes.data?.rates) {
        const cached = cacheRes.data.rates as Record<string, number>;
        Object.entries(cached).forEach(([k, v]) => { rates[k.toUpperCase()] = Number(v); });
        hasCacheRates = Object.keys(cached).length > 5;
      }
      if (ratesRes.data?.value) {
        (ratesRes.data.value as any[]).forEach((c: any) => {
          if (c.currency && c.exchange_rate) {
            const key = c.currency.toUpperCase();
            if (!hasCacheRates || !rates[key]) {
              rates[key] = Number(c.exchange_rate);
            }
          }
        });
      }
      setExchangeRates(rates);

      const procCurrencies: Record<string, string | null> = { ...FALLBACK_PROC_CURRENCIES };
      const gwData = (gwRes.data as any[]) || [];
      gwData.forEach((g: any) => { procCurrencies[g.gateway_key] = g.processing_currency || null; });
      setGatewayProcCurrencies(procCurrencies);

      const options: CheckoutOption[] = gwData.map((g: any) => {
        const gwProcCur = (g.processing_currency || FALLBACK_PROC_CURRENCIES[g.gateway_key] || baseCurrency).toUpperCase();
        let convAmount: number | undefined;
        let convCurrency: string | undefined;

        // Compute the converted amount for this gateway
        const bCur = (paymentDetails?.base_currency ?? paymentDetails?.currency ?? "USD").toUpperCase();
        const bAmt = paymentDetails?.base_amount ?? paymentDetails?.amount ?? 0;
        if (bAmt > 0 && gwProcCur !== bCur && rates[bCur] && rates[gwProcCur]) {
          const fromRate = rates[bCur] || 1;
          const toRate = rates[gwProcCur] || 1;
          convAmount = Math.round((bAmt / fromRate) * toRate * 100) / 100;
          convCurrency = gwProcCur;
        } else if (bAmt > 0) {
          convAmount = bAmt;
          convCurrency = gwProcCur;
        }

        return {
          key: g.gateway_key, gatewayKey: g.gateway_key,
          label: g.display_name || prettifyGatewayName(g.gateway_key),
          description: g.description || `Pay securely with ${g.display_name || prettifyGatewayName(g.gateway_key)}`,
          icon: GATEWAY_ICONS[g.gateway_key] || CreditCard,
          logoUrl: g.logo_url || null,
          convertedAmount: convAmount,
          convertedCurrency: convCurrency,
        };
      });

      setPaymentOptions(options);
      if (options[0]) setSelectedMethod(options[0].key);

      if (savedRes?.data) {
        setSavedMethods((savedRes.data as SavedMethod[]) || []);
      }

      setFetching(false);
    };

    if (paymentDetails) fetchData();
    return () => { active = false; };
  }, [paymentDetails, user]);

  const selectedOption = useMemo(
    () => paymentOptions.find((o) => o.key === selectedMethod) || null,
    [paymentOptions, selectedMethod],
  );

  const handleSavedSelect = useCallback((id: string | null) => {
    setSelectedSavedId(id);
    if (id) {
      const method = savedMethods.find((m) => m.id === id);
      if (method) {
        const matchingOption = paymentOptions.find((o) => o.gatewayKey === method.gateway_key);
        if (matchingOption) setSelectedMethod(matchingOption.key);
      }
    }
  }, [savedMethods, paymentOptions]);

  // Coupon validation
  const handleApplyCoupon = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) return { success: false, message: "Invalid coupon code." };

      // Check expiry
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        return { success: false, message: "This coupon has expired." };
      }

      // Check usage limit
      if (data.max_uses > 0 && data.used_count >= data.max_uses) {
        return { success: false, message: "This coupon has reached its usage limit." };
      }

      // Check min order
      const currentAmount = baseAmount;
      if (data.min_order_amount > 0 && currentAmount < data.min_order_amount) {
        return { success: false, message: `Minimum order amount is ${getCurrencySymbol(baseCurrency)}${data.min_order_amount}.` };
      }

      // Check scope
      if (data.scope === "tenant" && data.tenant_id) {
        // tenant-specific coupon — skip for platform-level checkout unless matching
      }

      // Calculate discount
      let disc = 0;
      if (data.coupon_type === "percentage") {
        disc = (currentAmount * data.value) / 100;
        if (data.max_discount_amount && disc > data.max_discount_amount) {
          disc = data.max_discount_amount;
        }
      } else {
        disc = data.value;
      }
      disc = Math.min(disc, currentAmount);
      disc = Math.round(disc * 100) / 100;

      setAppliedCoupon({ code: data.code, discount: data.value, type: data.coupon_type, id: data.id });
      setDiscountAmount(disc);

      return { success: true, message: `Coupon applied! You save ${getCurrencySymbol(baseCurrency)}${disc.toLocaleString()}` };
    } catch {
      return { success: false, message: "Failed to validate coupon." };
    }
  }, [baseAmount, baseCurrency]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  }, []);

  // Rate locking: lock the exchange rate when user selects a gateway
  const [lockedRate, setLockedRate] = useState<{ from: string; to: string; rate: number; lockedAt: Date } | null>(null);

  useEffect(() => {
    if (!selectedOption || baseAmount <= 0 || Object.keys(exchangeRates).length === 0) return;
    const gwCurrency = gatewayProcCurrencies[selectedOption.gatewayKey] ?? null;
    const targetCurrency = (gwCurrency || baseCurrency).toUpperCase();

    const effectiveBase = Math.max(baseAmount - discountAmount, 0);

    if (targetCurrency === baseCurrency.toUpperCase()) {
      setAmount(effectiveBase); setCurrency(baseCurrency.toLowerCase());
      setLockedRate(null);
      return;
    }

    const fromRate = exchangeRates[baseCurrency.toUpperCase()] || 1;
    const toRate = exchangeRates[targetCurrency] || 1;
    const conversionRate = toRate / fromRate;

    // Lock the rate
    setLockedRate({ from: baseCurrency.toUpperCase(), to: targetCurrency, rate: conversionRate, lockedAt: new Date() });

    const converted = effectiveBase * conversionRate;
    setAmount(Math.round(converted * 100) / 100);
    setCurrency(targetCurrency.toLowerCase());
  }, [selectedOption, baseAmount, baseCurrency, exchangeRates, gatewayProcCurrencies, discountAmount]);

  const handleContinue = async (retryCount = 0) => {
    if (!paymentDetails || !selectedOption) return;
    setError(null);
    setLoading(true);

    const MAX_RETRIES = 2;
    const RETRY_DELAYS = [2000, 5000]; // exponential backoff

    try {
      const { data, error: fnError } = await supabase.functions.invoke("payment-initiate", {
        body: {
          gateway: selectedOption.gatewayKey,
          ...paymentDetails,
          checkout_currency: currency,
          checkout_amount: amount,
          ...(selectedSavedId ? { saved_method_id: selectedSavedId } : {}),
          ...(appliedCoupon ? { coupon_id: appliedCoupon.id, coupon_code: appliedCoupon.code, discount_amount: discountAmount } : {}),
        },
      });

      if (fnError) {
        let errorMessage = "Failed to initialize payment.";
        try {
          if (fnError.context && typeof fnError.context.json === "function") {
            const errorBody = await fnError.context.json();
            if (errorBody?.error) errorMessage = errorBody.error;
          } else if (fnError.message) {
            errorMessage = fnError.message;
          }
        } catch {}

        // Gateway failover: retry with backoff
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAYS[retryCount] || 3000;
          toast.info(`Payment gateway issue. Retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          return handleContinue(retryCount + 1);
        }

        setError(errorMessage + " Please try a different payment method.");
        setLoading(false);
        return;
      }

      if (!data) {
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAYS[retryCount] || 3000;
          await new Promise((r) => setTimeout(r, delay));
          return handleContinue(retryCount + 1);
        }
        setError("No response from payment service. Please try again or use a different payment method.");
        setLoading(false);
        return;
      }

      if (data?.success && data?.one_click) {
        clearCart();
        toast.success(data.message || "Payment completed successfully!");
        navigate(paymentDetails.purpose === "wallet_topup" ? "/wallet?topup=success" : "/subscription?payment=success");
        return;
      }
      if (data?.url) {
        clearCart();
        const redirectTimeout = setTimeout(() => {
          setError("Redirect is taking too long. Please try again or use a different payment method.");
          setLoading(false);
        }, 10000);
        window.addEventListener("beforeunload", () => clearTimeout(redirectTimeout), { once: true });
        window.location.href = data.url;
        return;
      }
      setError(data?.error || "Failed to create payment session. Please try again.");
    } catch {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || 3000;
        await new Promise((r) => setTimeout(r, delay));
        return handleContinue(retryCount + 1);
      }
      setError("Something went wrong. Please try a different payment method.");
    } finally {
      setLoading(false);
    }
  };

  if (!paymentDetails) return null;

  const effectiveAmount = amount || paymentDetails.amount || 0;
  const sym = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px] p-3 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center">
        <div className="w-full max-w-5xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden relative">
          <button
            onClick={() => navigate("/subscription")}
            className="absolute right-4 top-4 z-20 h-9 w-9 rounded-full bg-background/80 border border-border hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Close checkout"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>

          <div className="flex flex-col lg:flex-row">
            {/* Left — Order Summary */}
            <div className="lg:w-[42%] bg-primary p-6 lg:p-10 xl:p-12 flex flex-col relative overflow-hidden">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-xs text-primary-foreground/50 hover:text-primary-foreground transition-colors mb-6 self-start z-10"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <div className="flex-1 flex flex-col z-10">
                <OrderSummary
                  amount={effectiveAmount} currency={currency} purpose={paymentDetails.purpose}
                  planName={paymentDetails.plan_name} description={paymentDetails.description}
                  taxAmount={taxAmount} appName={appName} discount={discountAmount}
                />
              </div>
              <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary-foreground/[0.04] rounded-full pointer-events-none" />
              <div className="absolute top-20 -left-10 w-32 h-32 bg-primary-foreground/[0.03] rounded-full pointer-events-none" />
            </div>

            {/* Right — Payment Methods */}
            <div className="flex-1 p-5 sm:p-7 lg:p-9 xl:p-10 flex items-start justify-center">
              <div className="w-full max-w-md space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Choose payment method</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Select your preferred gateway</p>
                  </div>
                  <LayoutSwitcher
                    current={checkoutLayout}
                    onChange={(l) => { setCheckoutLayout(l); localStorage.setItem("checkout_layout", l); }}
                  />
                </div>

                {fetching ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner size="md" variant="primary" />
                  </div>
                ) : (
                  <>
                    {/* Coupon Code */}
                    <CouponSection
                      onApply={handleApplyCoupon}
                      onRemove={handleRemoveCoupon}
                      appliedCoupon={appliedCoupon}
                    />

                    {/* Saved Payment Methods */}
                    <SavedMethodsSection
                      methods={savedMethods}
                      selectedId={selectedSavedId}
                      onSelect={handleSavedSelect}
                      gatewayLogos={Object.fromEntries(paymentOptions.map((o) => [o.gatewayKey, o.logoUrl || null]))}
                    />

                    {savedMethods.length > 0 && paymentOptions.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">or pay with</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}

                    {/* Gateway List */}
                    {paymentOptions.length === 0 ? (
                      <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground text-center">
                        No payment methods available right now.
                      </div>
                    ) : (
                      <GatewayList
                        options={paymentOptions}
                        selected={selectedMethod}
                        onSelect={(key) => { setSelectedMethod(key); setSelectedSavedId(null); }}
                        layout={checkoutLayout}
                      />
                    )}
                  </>
                )}

                {baseCurrency.toUpperCase() !== currency.toUpperCase() && amount > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 space-y-0.5">
                    <p className="flex items-center justify-center gap-1.5 text-center">
                      <Globe className="h-3 w-3 shrink-0" />
                      Converted from {getCurrencySymbol(baseCurrency)}{baseAmount.toLocaleString()} {baseCurrency.toUpperCase()} → {getCurrencySymbol(currency)}{amount.toLocaleString()} {currency.toUpperCase()}
                    </p>
                    {lockedRate && (
                      <p className="flex items-center justify-center gap-1 text-[10px] text-primary">
                        <Lock className="h-2.5 w-2.5" />
                        Rate locked at 1 {lockedRate.from} = {lockedRate.rate.toFixed(4)} {lockedRate.to} • Valid for 30 min
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <button
                  onClick={() => handleContinue()}
                  disabled={!selectedOption || loading || fetching}
                  className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Spinner size="xs" variant="white" /> Redirecting...</>
                  ) : (
                    <>
                      {selectedSavedId ? "Pay" : "Continue"} — {sym}{effectiveAmount.toLocaleString()}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" /> Secure, encrypted payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
