// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Eye, EyeOff, Save, Shield, ExternalLink, CheckCircle2, XCircle,
  Loader2, RefreshCw, Smartphone, Globe, Wallet, Zap, Layers, GripVertical,
  BookOpen, ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { LAYOUT_OPTIONS, type CheckoutLayout } from "@/components/checkout/GatewayListLayouts";

// ===== Gateway Setup Guides =====
interface GuideStep {
  title: string;
  description: string;
  link?: { label: string; url: string };
  code?: string;
}

interface GatewayGuide {
  title: string;
  description: string;
  steps: GuideStep[];
  webhookUrl?: string;
  fields: { key: string; label: string; description: string }[];
}

const SUPABASE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const GATEWAY_GUIDES: Record<string, GatewayGuide> = {
  stripe: {
    title: "Stripe Setup Guide",
    description: "Accept credit/debit cards worldwide with Stripe. Supports one-time payments and recurring subscriptions.",
    steps: [
      { title: "1. Create Stripe Account", description: "Sign up at stripe.com and complete business verification.", link: { label: "Stripe Dashboard", url: "https://dashboard.stripe.com" } },
      { title: "2. Get API Keys", description: "Go to Developers → API keys. Copy the Secret Key (starts with sk_test_ or sk_live_)." },
      { title: "3. Set Up Webhook", description: "Go to Developers → Webhooks. Add endpoint for checkout.session.completed and payment_intent.succeeded events.", code: `${SUPABASE_FN_URL}/payment-verify` },
    ],
    fields: [
      { key: "secret_key", label: "Secret Key", description: "Starts with sk_test_ (sandbox) or sk_live_ (production)" },
      { key: "publishable_key", label: "Publishable Key", description: "Starts with pk_test_ or pk_live_" },
      { key: "webhook_secret", label: "Webhook Secret", description: "Starts with whsec_" },
    ],
  },
  sslcommerz: {
    title: "SSLCommerz Setup Guide",
    description: "Bangladesh's leading payment gateway supporting cards, mobile banking, and internet banking.",
    steps: [
      { title: "1. Register at SSLCommerz", description: "Create a merchant account at sslcommerz.com.", link: { label: "SSLCommerz", url: "https://www.sslcommerz.com" } },
      { title: "2. Get Store Credentials", description: "From your merchant panel, get your Store ID and Store Password." },
      { title: "3. Configure IPN", description: "Set IPN (Instant Payment Notification) URL in SSLCommerz panel.", code: `${SUPABASE_FN_URL}/sslcommerz-callback` },
    ],
    fields: [
      { key: "store_id", label: "Store ID", description: "Your SSLCommerz merchant Store ID" },
      { key: "store_password", label: "Store Password", description: "Your SSLCommerz merchant Store Password" },
    ],
  },
  bkash: {
    title: "bKash Tokenized Setup Guide",
    description: "bKash mobile financial service — the most popular MFS in Bangladesh.",
    steps: [
      { title: "1. Register as Merchant", description: "Apply for bKash Tokenized Checkout at bka.sh.", link: { label: "bKash Merchant", url: "https://www.bkash.com/merchant" } },
      { title: "2. Get API Credentials", description: "Get App Key, App Secret, Username, and Password from bKash developer portal." },
    ],
    fields: [
      { key: "app_key", label: "App Key", description: "bKash tokenized checkout app key" },
      { key: "app_secret", label: "App Secret", description: "bKash tokenized checkout app secret" },
      { key: "username", label: "Username", description: "bKash merchant API username" },
      { key: "password", label: "Password", description: "bKash merchant API password" },
    ],
  },
  dodo: {
    title: "Dodo Payments Setup Guide",
    description: "Global payment processing for SaaS and digital products.",
    steps: [
      { title: "1. Create Dodo Account", description: "Sign up at dodopayments.com.", link: { label: "Dodo Payments", url: "https://dodopayments.com" } },
      { title: "2. Get API Key", description: "Go to Developer → API Keys in your Dodo dashboard." },
    ],
    fields: [
      { key: "api_key", label: "API Key", description: "From Developer → API Keys in Dodo dashboard" },
    ],
  },
  razorpay: {
    title: "Razorpay Setup Guide (India)",
    description: "India's leading payment gateway supporting UPI, cards, wallets, and net banking.",
    steps: [
      { title: "1. Create Razorpay Account", description: "Sign up at razorpay.com and complete KYC verification.", link: { label: "Razorpay Dashboard", url: "https://dashboard.razorpay.com" } },
      { title: "2. Get API Keys", description: "Go to Settings → API Keys → Generate Key. Copy the Key ID (starts with rzp_test_ or rzp_live_) and Key Secret." },
      { title: "3. Set Up Webhook", description: "Go to Settings → Webhooks → Add New Webhook. Enter the URL below and select events: payment.captured, payment.failed, order.paid.", code: `${SUPABASE_FN_URL}/razorpay-payment-callback` },
      { title: "4. Copy Webhook Secret", description: "After creating the webhook, Razorpay shows a secret. Copy and paste it in the 'Webhook Secret' field above for signature verification." },
    ],
    webhookUrl: `${SUPABASE_FN_URL}/razorpay-payment-callback`,
    fields: [
      { key: "key_id", label: "Key ID", description: "Starts with rzp_test_ (sandbox) or rzp_live_ (production)" },
      { key: "key_secret", label: "Key Secret", description: "Secret key from Razorpay API Keys section" },
      { key: "webhook_secret", label: "Webhook Secret", description: "From Settings → Webhooks in Razorpay dashboard" },
    ],
  },
  twocheckout: {
    title: "2Checkout (Verifone) Setup Guide",
    description: "Global payment platform supporting 45+ payment methods in 200+ countries.",
    steps: [
      { title: "1. Create 2Checkout Account", description: "Sign up at 2checkout.com (now Verifone) and complete merchant verification.", link: { label: "2Checkout Dashboard", url: "https://secure.2checkout.com/cpanel" } },
      { title: "2. Get Merchant Code", description: "Go to Integrations → Webhooks & API → Your Merchant Code is displayed at the top of the page." },
      { title: "3. Get Secret Key", description: "In the same page, find the Secret Key (also called Buy Link Secret Word). Generate one if needed." },
      { title: "4. Set Up IPN (Instant Payment Notification)", description: "Go to Integrations → Webhooks & API → IPN Settings. Set the IPN URL below and enable all order-related notifications.", code: `${SUPABASE_FN_URL}/twocheckout-payment-callback` },
      { title: "5. Enable ConvertPlus", description: "Ensure ConvertPlus checkout is enabled in your 2Checkout account under Account Settings → Checkout Options for the best redirect checkout experience." },
    ],
    webhookUrl: `${SUPABASE_FN_URL}/twocheckout-payment-callback`,
    fields: [
      { key: "merchant_code", label: "Merchant Code", description: "Your 2Checkout Merchant/Vendor Code" },
      { key: "secret_key", label: "Secret Key / Buy Link Secret Word", description: "From Integrations → Webhooks & API" },
      { key: "ipn_secret", label: "IPN Secret", description: "Optional — for IPN webhook signature verification" },
    ],
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function GatewaySetupGuides({ activeGateway }: { activeGateway: string }) {
  const [expanded, setExpanded] = useState(false);
  const guide = GATEWAY_GUIDES[activeGateway];

  if (!guide) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">{guide.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{guide.description}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* Step-by-step guide */}
          <div className="space-y-3">
            {guide.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  {step.link && (
                    <a href={step.link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      {step.link.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {step.code && (
                    <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                      <code className="text-xs text-foreground font-mono flex-1 truncate">{step.code}</code>
                      <CopyButton text={step.code} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Webhook URL (if applicable) */}
          {guide.webhookUrl && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-primary">Webhook Callback URL</p>
              <p className="text-xs text-muted-foreground">Use this URL when configuring webhooks in the payment provider's dashboard:</p>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                <code className="text-xs text-foreground font-mono flex-1 truncate">{guide.webhookUrl}</code>
                <CopyButton text={guide.webhookUrl} />
              </div>
            </div>
          )}

          {/* Required Fields Reference */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Required Credential Fields</p>
            <div className="grid gap-2">
              {guide.fields.map((f) => (
                <div key={f.key} className="flex items-start gap-2 text-xs">
                  <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono shrink-0">{f.key}</code>
                  <span className="text-muted-foreground">{f.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CredentialFieldMeta {
  label: string;
  placeholder: string;
  sensitive: boolean;
}

interface GatewayConfig {
  id: string;
  gateway_key: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  is_enabled: boolean;
  is_sandbox: boolean;
  processing_currency: string | null;
  display_order: number;
  credentials: Record<string, any>;
  settings: {
    credential_fields?: Record<string, CredentialFieldMeta>;
    docs_url?: string;
    icon?: string;
  };
  last_tested_at: string | null;
  test_result: string | null;
}

const ICON_MAP: Record<string, typeof CreditCard> = {
  "credit-card": CreditCard,
  smartphone: Smartphone,
  globe: Globe,
  wallet: Wallet,
  zap: Zap,
  layers: Layers,
};

function prettifyFieldName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PaymentGateway() {
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [editCreds, setEditCreds] = useState<Record<string, Record<string, string>>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { result: string; message: string }>>({});
  const [editMeta, setEditMeta] = useState<Record<string, { display_name: string; description: string }>>({});
  const [savingOrder, setSavingOrder] = useState(false);
  const [defaultLayout, setDefaultLayout] = useState<CheckoutLayout>("accordion");
  const [savingLayout, setSavingLayout] = useState(false);

  const fetchGateways = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gateway-config?action=list`,
        { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const data = await res.json();
      if (data.gateways) {
        setGateways(data.gateways);
        // Initialize edit credentials from the current mode
        const creds: Record<string, Record<string, string>> = {};
        const meta: Record<string, { display_name: string; description: string }> = {};
        data.gateways.forEach((gw: GatewayConfig) => {
          const mode = gw.is_sandbox ? "sandbox" : "live";
          const modeCreds = gw.credentials?.[mode] || gw.credentials || {};
          creds[gw.gateway_key] = { ...modeCreds };
          meta[gw.gateway_key] = {
            display_name: gw.display_name || prettifyFieldName(gw.gateway_key),
            description: gw.description || "",
          };
        });
        setEditCreds(creds);
        setEditMeta(meta);
      }
    } catch {
      toast.error("Failed to load gateway configs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGateways(); }, [fetchGateways]);

  // Fetch default checkout layout
  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "checkout_layout")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setDefaultLayout(data.value as CheckoutLayout);
      });
  }, []);

  useEffect(() => {
    if (!activeTab && gateways.length > 0) setActiveTab(gateways[0].gateway_key);
  }, [gateways, activeTab]);

  const callGatewayApi = async (action: string, body: any, method = "POST") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gateway-config?action=${action}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: method !== "GET" ? JSON.stringify(body) : undefined,
      }
    );
    return res.json();
  };

  const handleSave = async (gatewayKey: string) => {
    const gw = gateways.find((g) => g.gateway_key === gatewayKey);
    if (!gw) return;
    setSaving((p) => ({ ...p, [gatewayKey]: true }));
    try {
      const result = await callGatewayApi("save", {
        gateway_key: gatewayKey,
        credentials: editCreds[gatewayKey] || {},
        is_sandbox: gw.is_sandbox,
        is_enabled: gw.is_enabled,
        display_name: editMeta[gatewayKey]?.display_name || gw.display_name,
        description: editMeta[gatewayKey]?.description || "",
        processing_currency: gw.processing_currency || null,
        logo_url: gw.logo_url || null,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${gw.display_name} configuration saved securely`);
        await fetchGateways();
      }
    } catch { toast.error("Failed to save configuration"); }
    finally { setSaving((p) => ({ ...p, [gatewayKey]: false })); }
  };

  const handleToggle = async (gw: GatewayConfig, field: "is_enabled" | "is_sandbox") => {
    const newVal = !gw[field];
    setGateways((prev) =>
      prev.map((g) => (g.gateway_key === gw.gateway_key ? { ...g, [field]: newVal } : g))
    );

    if (field === "is_enabled") {
      await callGatewayApi("toggle", { gateway_key: gw.gateway_key, is_enabled: newVal });
      toast.success(`${gw.display_name} ${newVal ? "enabled" : "disabled"}`);
    }

    if (field === "is_sandbox") {
      // Switch displayed credentials to the new mode
      const mode = newVal ? "sandbox" : "live";
      const modeCreds = gw.credentials?.[mode] || {};
      setEditCreds((p) => ({ ...p, [gw.gateway_key]: { ...modeCreds } }));
    }
  };

  const handleTest = async (gatewayKey: string) => {
    setTesting((p) => ({ ...p, [gatewayKey]: true }));
    setTestResults((p) => { const n = { ...p }; delete n[gatewayKey]; return n; });
    try {
      const result = await callGatewayApi("test", { gateway_key: gatewayKey });
      setTestResults((p) => ({ ...p, [gatewayKey]: result }));
      if (result.result === "success") toast.success(result.message);
      else toast.error(result.message);
      await fetchGateways();
    } catch { toast.error("Connection test failed"); }
    finally { setTesting((p) => ({ ...p, [gatewayKey]: false })); }
  };

  const updateCred = (gatewayKey: string, field: string, value: string) => {
    setEditCreds((p) => ({ ...p, [gatewayKey]: { ...(p[gatewayKey] || {}), [field]: value } }));
  };

  const toggleShow = (fieldKey: string) => {
    setShowFields((p) => ({ ...p, [fieldKey]: !p[fieldKey] }));
  };

  const handleReorder = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(gateways);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setGateways(reordered);

    setSavingOrder(true);
    try {
      await callGatewayApi("reorder", { order: reordered.map((g) => g.gateway_key) });
      toast.success("Gateway display order saved");
    } catch {
      toast.error("Failed to save order");
    } finally {
      setSavingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure payment gateways, credentials, and platform payment methods</p>
      </div>

      {/* Gateway Priority Order */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Gateway Display Order</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag to reorder — the first gateway appears as "Recommended" at checkout
            </p>
          </div>
          {savingOrder && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
        </div>

        <DragDropContext onDragEnd={handleReorder}>
          <Droppable droppableId="gateway-order">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                {gateways.map((gw, idx) => {
                  const iconName = gw.settings?.icon || "credit-card";
                  const Icon = ICON_MAP[iconName] || CreditCard;
                  return (
                    <Draggable key={gw.gateway_key} draggableId={gw.gateway_key} index={idx}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                            snapshot.isDragging
                              ? "border-primary bg-primary/5 shadow-lg"
                              : "border-border bg-background hover:bg-muted/50"
                          }`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                          <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground flex-1 truncate">
                            {gw.display_name}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            gw.is_enabled
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {gw.is_enabled ? "Active" : "Disabled"}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                              Recommended
                            </span>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg overflow-x-auto">
        {gateways.map((gw) => (
          <button
            key={gw.gateway_key}
            onClick={() => setActiveTab(gw.gateway_key)}
            className={`flex-1 min-w-fit px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === gw.gateway_key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {gw.display_name}
          </button>
        ))}
      </div>

      {/* Gateway Config */}
      {gateways.map((gw) => {
        if (activeTab !== gw.gateway_key) return null;

        const iconName = gw.settings?.icon || "credit-card";
        const Icon = ICON_MAP[iconName] || CreditCard;
        const credFields = gw.settings?.credential_fields || {};
        const docsUrl = gw.settings?.docs_url;
        const gwCreds = editCreds[gw.gateway_key] || {};
        const testRes = testResults[gw.gateway_key];

        // Determine which fields to show — from metadata, or fallback to credential keys
        const fieldEntries = Object.keys(credFields).length > 0
          ? Object.entries(credFields)
          : Object.keys(gwCreds).map((k) => [k, { label: prettifyFieldName(k), placeholder: `Enter ${prettifyFieldName(k)}`, sensitive: true }] as [string, CredentialFieldMeta]);

        return (
          <div key={gw.gateway_key} className="space-y-4">
            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              gw.is_enabled ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"
            }`}>
              {gw.is_enabled ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-warning shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {gw.is_enabled ? `${gw.display_name} gateway is active` : `${gw.display_name} gateway is disabled`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {gw.is_enabled
                    ? `Using ${gw.is_sandbox ? "Sandbox/Test" : "Live/Production"} mode`
                    : "Enable the gateway to start accepting payments"}
                </p>
              </div>
              {gw.last_tested_at && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  gw.test_result === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {gw.test_result === "success" ? "Verified" : "Failed"}
                </span>
              )}
            </div>

            {/* Config Card */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{gw.display_name} Configuration</h2>
                    <p className="text-xs text-muted-foreground">{gw.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {docsUrl && (
                    <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button onClick={fetchGateways} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Method label and description shown to users */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method Name</label>
                  <input
                    type="text"
                    value={editMeta[gw.gateway_key]?.display_name || gw.display_name || ""}
                    onChange={(e) => setEditMeta((p) => ({
                      ...p,
                      [gw.gateway_key]: {
                        display_name: e.target.value,
                        description: p[gw.gateway_key]?.description ?? gw.description ?? "",
                      },
                    }))}
                    placeholder="Public method name"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method Description</label>
                  <input
                    type="text"
                    value={editMeta[gw.gateway_key]?.description || gw.description || ""}
                    onChange={(e) => setEditMeta((p) => ({
                      ...p,
                      [gw.gateway_key]: {
                        display_name: p[gw.gateway_key]?.display_name ?? gw.display_name,
                        description: e.target.value,
                      },
                    }))}
                    placeholder="Short public description"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Gateway Logo URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Gateway Logo URL</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter a URL for the gateway logo displayed at checkout. Use a square PNG with transparent background for best results.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={gw.logo_url || ""}
                    onChange={(e) => {
                      const val = e.target.value.trim() || null;
                      setGateways((prev) =>
                        prev.map((g) => g.gateway_key === gw.gateway_key ? { ...g, logo_url: val } : g)
                      );
                    }}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {gw.logo_url && (
                    <img src={gw.logo_url} alt={gw.display_name} className="h-10 w-10 rounded-lg object-contain border border-border bg-background p-1" />
                  )}
                </div>
              </div>

              {/* Processing Currency */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Processing Currency</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Leave empty for multi-currency gateways (e.g. Stripe). Set a code like BDT or USD to force conversion.
                </p>
                <input
                  type="text"
                  value={gw.processing_currency || ""}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().trim() || null;
                    setGateways((prev) =>
                      prev.map((g) => g.gateway_key === gw.gateway_key ? { ...g, processing_currency: val } : g)
                    );
                  }}
                  placeholder="e.g. BDT, USD, or leave empty"
                  className="w-full max-w-[200px] h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                />
              </div>

              {/* Mode Indicator */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                gw.is_sandbox
                  ? "bg-warning/10 border border-warning/20 text-warning"
                  : "bg-success/10 border border-success/20 text-success"
              }`}>
                <span className={`h-2 w-2 rounded-full ${gw.is_sandbox ? "bg-warning" : "bg-success"}`} />
                Editing {gw.is_sandbox ? "Sandbox / Test" : "Live / Production"} credentials
              </div>

              {/* Credential Fields - Dynamic */}
              <div className="space-y-4">
                {fieldEntries.map(([field, meta]) => {
                  const isSensitive = (meta as CredentialFieldMeta).sensitive ?? true;
                  const showKey = `${gw.gateway_key}_${field}`;
                  const isShown = showFields[showKey] || false;
                  const fieldMeta = meta as CredentialFieldMeta;

                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{fieldMeta.label}</label>
                      <div className="relative">
                        <input
                          type={isSensitive && !isShown ? "password" : "text"}
                          value={gwCreds[field] || ""}
                          onChange={(e) => updateCred(gw.gateway_key, field, e.target.value)}
                          placeholder={fieldMeta.placeholder}
                          className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {isSensitive && (
                          <button
                            onClick={() => toggleShow(showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {isShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sandbox Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {gw.is_sandbox ? "🧪 Sandbox/Test Mode" : "🔴 Live/Production Mode"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gw.is_sandbox ? "No real charges will be made" : "Real transactions will be processed"}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(gw, "is_sandbox")}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${gw.is_sandbox ? "bg-warning" : "bg-success"}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${gw.is_sandbox ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable {gw.display_name}</p>
                  <p className="text-xs text-muted-foreground">Accept payments through {gw.display_name}</p>
                </div>
                <button
                  onClick={() => handleToggle(gw, "is_enabled")}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${gw.is_enabled ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${gw.is_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => handleTest(gw.gateway_key)}
                  disabled={testing[gw.gateway_key]}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {testing[gw.gateway_key] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  {testing[gw.gateway_key] ? "Testing..." : "Test Connection"}
                </button>

                {testRes && (
                  <span className={`flex items-center gap-1 text-sm font-medium ${
                    testRes.result === "success" ? "text-success" : "text-destructive"
                  }`}>
                    {testRes.result === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {testRes.message}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleSave(gw.gateway_key)}
                disabled={saving[gw.gateway_key]}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving[gw.gateway_key] ? "Saving..." : `Save ${gw.display_name} Config`}
              </button>
            </div>
          </div>
        );
      })}

      {/* Checkout Layout Default */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Default Checkout Layout</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how payment methods appear to users at checkout. Users can still switch layouts on the checkout page.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LAYOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = defaultLayout === opt.key;
            return (
              <button
                key={opt.key}
                disabled={savingLayout}
                onClick={async () => {
                  setDefaultLayout(opt.key);
                  setSavingLayout(true);
                  const { error } = await supabase
                    .from("platform_settings")
                    .upsert({ key: "checkout_layout", value: opt.key }, { onConflict: "key" });
                  if (error) toast.error("Failed to save layout");
                  else toast.success(`Default layout set to "${opt.label}"`);
                  setSavingLayout(false);
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/20 hover:bg-muted/50"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {opt.label}
                </span>
                {isActive && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                    Default
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gateway Setup Guides */}
      <GatewaySetupGuides activeGateway={activeTab} />

      {/* Security Notice */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-warning/10"><Shield className="h-4 w-4 text-warning" /></div>
          <h2 className="text-sm font-semibold text-foreground">Security Notice</h2>
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>• All credentials are stored encrypted in the database — never in local storage or frontend code</li>
          <li>• Sensitive fields are masked — only first and last 4 characters shown</li>
          <li>• Sandbox and Live credentials are stored separately — switching modes loads the correct set</li>
          <li>• Only Super Admins can access and modify gateway configurations</li>
          <li>• Always test with sandbox mode before switching to live/production</li>
          <li>• Connection tests verify credentials directly with the payment provider</li>
          <li>• New gateways added to the database automatically appear here — no code changes needed</li>
        </ul>
      </div>
    </div>
  );
}
