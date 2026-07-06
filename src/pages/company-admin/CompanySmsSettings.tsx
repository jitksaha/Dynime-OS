// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Smartphone, Loader2, Save, TestTube, Globe, ShoppingCart,
  CreditCard, ChevronDown, ChevronUp, MessageSquare, Zap, Shield,
} from "lucide-react";

const GATEWAY_OPTIONS = [
  { key: "alpha_sms", label: "Alpha SMS", fields: [
    { key: "api_key", label: "API Key", type: "password", required: true },
    { key: "sender_id", label: "Sender ID", type: "text", required: false },
  ]},
  { key: "green_web", label: "Green Web", fields: [
    { key: "token", label: "Token", type: "password", required: true },
    { key: "sender_id", label: "Sender ID", type: "text", required: false },
  ]},
  { key: "bdbulk_sms", label: "BDBulk SMS", fields: [
    { key: "api_key", label: "API Key", type: "password", required: true },
    { key: "sender_id", label: "Sender ID", type: "text", required: false },
  ]},
  { key: "dynahost_sms", label: "Dynahost SMS", fields: [
    { key: "api_key", label: "API Key", type: "password", required: true },
    { key: "secret_key", label: "Secret Key", type: "password", required: true },
    { key: "sender_id", label: "Sender ID", type: "text", required: false },
  ]},
  { key: "twilio", label: "Twilio", fields: [
    { key: "account_sid", label: "Account SID", type: "text", required: true },
    { key: "auth_token", label: "Auth Token", type: "password", required: true },
    { key: "from_number", label: "From Number", type: "text", required: true },
  ]},
  { key: "nexmo", label: "Vonage (Nexmo)", fields: [
    { key: "api_key", label: "API Key", type: "text", required: true },
    { key: "api_secret", label: "API Secret", type: "password", required: true },
    { key: "from", label: "From Name", type: "text", required: false },
  ]},
  { key: "msg91", label: "MSG91", fields: [
    { key: "auth_key", label: "Auth Key", type: "password", required: true },
    { key: "sender_id", label: "Sender ID", type: "text", required: false },
    { key: "route", label: "Route", type: "text", required: false },
  ]},
];

interface SmsPricing {
  id: string;
  pricing_type: string;
  name: string;
  description: string | null;
  price: number;
  sms_count: number;
  currency: string;
}

export default function CompanySmsSettings() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [pricing, setPricing] = useState<SmsPricing[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [useOwnGateway, setUseOwnGateway] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const [configRes, balanceRes, pricingRes] = await Promise.all([
      supabase.from("tenant_sms_gateway_configs").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_sms_balances").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("sms_pricing").select("*").eq("is_active", true).order("pricing_type").order("sms_count"),
    ]);

    if (configRes.data) {
      const c = configRes.data as any;
      setConfig(c);
      setUseOwnGateway(c.use_own_gateway);
      setSelectedGateway(c.gateway_key || "");
      setApiUrl(c.api_url || "");
      setCredentials(c.credentials || {});
    }
    setBalance((balanceRes.data as any) || null);
    setPricing((pricingRes.data as any) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveConfig = async () => {
    if (!tenantId) return;
    setSaving(true);
    const gwOption = GATEWAY_OPTIONS.find(g => g.key === selectedGateway);
    const payload = {
      tenant_id: tenantId,
      use_own_gateway: useOwnGateway,
      gateway_key: useOwnGateway ? selectedGateway : null,
      api_url: useOwnGateway ? apiUrl : null,
      credentials: useOwnGateway ? credentials : {},
      is_enabled: useOwnGateway && !!selectedGateway,
      config_fields: gwOption ? gwOption.fields : [],
    };

    if (config?.id) {
      const { error } = await supabase.from("tenant_sms_gateway_configs").update(payload as any).eq("id", config.id);
      if (error) toast.error("Failed to save");
      else toast.success("SMS settings saved");
    } else {
      const { error } = await supabase.from("tenant_sms_gateway_configs").insert(payload as any);
      if (error) toast.error("Failed to save");
      else toast.success("SMS settings saved");
    }
    setSaving(false);
    fetchData();
  };

  const purchaseBundle = async (item: SmsPricing) => {
    if (!tenantId) return;
    setPurchasing(item.id);
    // Use the add_sms_credits function
    const { error } = await supabase.rpc("add_sms_credits", {
      _tenant_id: tenantId,
      _count: item.sms_count,
      _amount: item.price,
      _pricing_id: item.id,
      _description: `Purchased: ${item.name}`,
    });
    if (error) toast.error("Purchase failed: " + error.message);
    else { toast.success(`${item.sms_count} SMS credits added!`); fetchData(); }
    setPurchasing(null);
  };

  const sendTestSms = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (!tenantId) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-send", {
        body: {
          tenant_id: tenantId,
          phone: testPhone,
          message: "✅ Test SMS from your company. Integration working!",
          event_key: "test",
        },
      });
      if (error) throw error;
      if (data?.success) toast.success("Test SMS sent!");
      else toast.error(data?.error || "Test failed");
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentFields = GATEWAY_OPTIONS.find(g => g.key === selectedGateway)?.fields || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">SMS Settings</h1>
          <p className="text-xs text-muted-foreground">Configure SMS for your company — use platform gateway or connect your own</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> SMS Credits Balance
          </h2>
          {useOwnGateway && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              OWN GATEWAY — NO CREDITS NEEDED
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{balance?.sms_credits ?? 0}</span>
          <span className="text-sm text-muted-foreground">credits remaining</span>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>Total purchased: {balance?.total_purchased ?? 0}</span>
          <span>Total used: {balance?.total_used ?? 0}</span>
        </div>
      </div>

      {/* Gateway Mode Selection */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> SMS Gateway Mode
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setUseOwnGateway(false)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              !useOwnGateway ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Platform Gateway</span>
            </div>
            <p className="text-xs text-muted-foreground">Use the platform's shared SMS gateway. Credits will be deducted per SMS sent.</p>
          </button>
          <button
            onClick={() => setUseOwnGateway(true)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              useOwnGateway ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Own Gateway</span>
            </div>
            <p className="text-xs text-muted-foreground">Connect your own SMS provider credentials. No platform charges apply.</p>
          </button>
        </div>
      </div>

      {/* Own Gateway Config */}
      {useOwnGateway && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Your SMS Gateway Configuration</h2>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Gateway Provider</label>
            <select
              value={selectedGateway}
              onChange={(e) => { setSelectedGateway(e.target.value); setCredentials({}); }}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a provider...</option>
              {GATEWAY_OPTIONS.map(g => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
          {selectedGateway && (
            <>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">API URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.provider.com/sms"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentFields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </label>
                    <input
                      type={field.type === "password" ? "password" : "text"}
                      value={credentials[field.key] || ""}
                      onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.label}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Purchase Bundles (only if using platform gateway) */}
      {!useOwnGateway && pricing.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" /> Purchase SMS Credits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pricing.map(item => (
              <div key={item.id} className="border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">{item.currency} {item.price}</span>
                  <span className="text-xs text-muted-foreground">/ {item.sms_count} SMS</span>
                </div>
                <button
                  onClick={() => purchaseBundle(item)}
                  disabled={purchasing === item.id}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {purchasing === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                  Purchase
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test SMS */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-foreground block mb-1">Test Phone Number</label>
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value.replace(/[^0-9+]/g, ""))}
            placeholder="+8801XXXXXXXXX"
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={sendTestSms}
          disabled={testing || !testPhone}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/30 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
          Send Test SMS
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save SMS Settings
        </button>
      </div>
    </div>
  );
}
