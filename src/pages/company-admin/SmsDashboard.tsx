// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Smartphone, Loader2, Save, TestTube, Globe, ShoppingCart,
  CreditCard, MessageSquare, Zap, Shield, Send, Search,
  CheckCircle, XCircle, Clock, Phone, FileText, Settings,
  TrendingUp, BarChart3, RefreshCw, ChevronDown, Filter,
  Wifi, WifiOff, DollarSign,
} from "lucide-react";

// ─── Gateway Options ───
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

interface SmsLog {
  id: string;
  gateway_key: string;
  recipient_phone: string;
  message: string;
  event_key: string | null;
  status: string;
  created_at: string;
}

interface SmsPricing {
  id: string;
  pricing_type: string;
  name: string;
  description: string | null;
  price: number;
  sms_count: number;
  currency: string;
}

interface BalanceTransaction {
  id: string;
  transaction_type: string;
  sms_count: number;
  amount: number;
  description: string;
  created_at: string;
}

type TabKey = "overview" | "messages" | "credits" | "settings";

export default function SmsDashboard() {
  const { profile } = useAuth();
  const { symbol: cs } = useTenantCurrency();
  const tenantId = profile?.tenant_id;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);

  // Data
  const [config, setConfig] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [pricing, setPricing] = useState<SmsPricing[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);

  // Gateway balance from provider API
  const [gwBalance, setGwBalance] = useState<any>(null);
  const [gwBalanceLoading, setGwBalanceLoading] = useState(false);

  // Settings state
  const [useOwnGateway, setUseOwnGateway] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Compose & Test
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Filters
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState<"all" | "sent" | "failed">("all");

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const [configRes, balanceRes, pricingRes, logsRes, txnRes] = await Promise.all([
      supabase.from("tenant_sms_gateway_configs").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_sms_balances").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("sms_pricing").select("*").eq("is_active", true).order("pricing_type").order("sms_count"),
      supabase.from("sms_logs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100),
      supabase.from("sms_balance_transactions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50),
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
    setLogs((logsRes.data as any) || []);
    setTransactions((txnRes.data as any) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Fetch live gateway balance from provider API ───
  const fetchGatewayBalance = useCallback(async () => {
    if (!tenantId) return;
    setGwBalanceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-balance-check", {
        body: { tenant_id: tenantId },
      });
      if (!error && data) setGwBalance(data);
      else setGwBalance(null);
    } catch {
      setGwBalance(null);
    }
    setGwBalanceLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchGatewayBalance(); }, [fetchGatewayBalance]);

  // ─── Stats ───
  const totalSent = logs.filter(l => l.status === "sent").length;
  const totalFailed = logs.filter(l => l.status === "failed").length;
  const todaySent = logs.filter(l => l.status === "sent" && new Date(l.created_at).toDateString() === new Date().toDateString()).length;
  const isOwnGw = config?.use_own_gateway && config?.is_enabled;

  // ─── Filtered logs ───
  const filteredLogs = logs.filter(l => {
    if (logStatus !== "all" && l.status !== logStatus) return false;
    if (logSearch && !l.recipient_phone.includes(logSearch) && !l.message.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  // ─── Send SMS ───
  const handleSendSms = async () => {
    if (!testPhone || testPhone.length < 10) { toast.error("Enter a valid phone number"); return; }
    if (!testMessage.trim()) { toast.error("Enter a message"); return; }
    if (!tenantId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-send", {
        body: { tenant_id: tenantId, phone: testPhone, message: testMessage, event_key: "manual" },
      });
      if (error) throw error;
      if (data?.success) { toast.success("SMS sent!"); setTestPhone(""); setTestMessage(""); fetchData(); }
      else toast.error(data?.error || "Send failed");
    } catch (err: any) { toast.error(err.message || "Send failed"); }
    setSending(false);
  };

  // ─── Save Settings ───
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
      if (error) toast.error("Failed to save"); else toast.success("SMS settings saved");
    } else {
      const { error } = await supabase.from("tenant_sms_gateway_configs").insert(payload as any);
      if (error) toast.error("Failed to save"); else toast.success("SMS settings saved");
    }
    setSaving(false);
    fetchData();
  };

  // ─── Purchase ───
  const purchaseBundle = async (item: SmsPricing) => {
    if (!tenantId) return;
    setPurchasing(item.id);
    const { error } = await supabase.rpc("add_sms_credits", {
      _tenant_id: tenantId, _count: item.sms_count, _amount: item.price, _pricing_id: item.id, _description: `Purchased: ${item.name}`,
    });
    if (error) toast.error("Purchase failed: " + error.message);
    else { toast.success(`${item.sms_count} SMS credits added!`); fetchData(); }
    setPurchasing(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currentFields = GATEWAY_OPTIONS.find(g => g.key === selectedGateway)?.fields || [];

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "credits", label: "Credits", icon: CreditCard },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">SMS Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {isOwnGw ? "Using your own gateway — no platform charges" : "Using platform gateway — credits apply"}
            </p>
          </div>
        </div>
        <button onClick={() => { fetchData(); fetchGatewayBalance(); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted/30 transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Balance Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-border rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {isOwnGw ? "Gateway Balance" : "SMS Credits"}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-foreground">
                {isOwnGw ? "∞" : (balance?.sms_credits ?? 0)}
              </span>
              <span className="text-sm text-muted-foreground">
                {isOwnGw ? "unlimited (own gateway)" : "credits remaining"}
              </span>
            </div>
            {!isOwnGw && (
              <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                <span>Purchased: {balance?.total_purchased ?? 0}</span>
                <span>Used: {balance?.total_used ?? 0}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOwnGw ? (
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide">
                Own Gateway Active
              </span>
            ) : (
              <button
                onClick={() => setActiveTab("credits")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <ShoppingCart className="h-4 w-4" /> Buy Credits
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connected Gateway Card */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wifi className="h-4 w-4 text-primary" /> Connected Gateway
          </h2>
          <button
            onClick={fetchGatewayBalance}
            disabled={gwBalanceLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            {gwBalanceLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Check Balance
          </button>
        </div>

        {gwBalance ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Gateway Provider */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Provider</p>
                <p className="text-sm font-semibold text-foreground capitalize">
                  {GATEWAY_OPTIONS.find(g => g.key === gwBalance.gateway_key)?.label || gwBalance.gateway_key || "—"}
                </p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold mt-0.5 inline-block ${
                  gwBalance.mode === "own_gateway"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent text-accent-foreground"
                }`}>
                  {gwBalance.mode === "own_gateway" ? "OWN GATEWAY" : "PLATFORM"}
                </span>
              </div>
            </div>

            {/* Provider Balance */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Provider Balance</p>
                {gwBalance.status === "ok" ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      {gwBalance.currency} {gwBalance.balance}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold mt-0.5 inline-block">
                      CONNECTED
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-destructive">Unavailable</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold mt-0.5 inline-block">
                      {gwBalance.error || "ERROR"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-start gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                gwBalance.status === "ok" ? "bg-primary/10" : "bg-destructive/10"
              }`}>
                {gwBalance.status === "ok" ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`text-sm font-semibold ${gwBalance.status === "ok" ? "text-primary" : "text-destructive"}`}>
                  {gwBalance.status === "ok" ? "Active & Connected" : "Connection Issue"}
                </p>
                {gwBalance.status !== "ok" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Check credentials in Settings tab
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : gwBalanceLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-2">Checking gateway connection...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4">
            <WifiOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">No gateway connected</p>
              <p className="text-xs text-muted-foreground">Go to Settings tab to configure your SMS gateway</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Send} label="Total Sent" value={totalSent} color="text-primary" />
            <StatCard icon={XCircle} label="Failed" value={totalFailed} color="text-destructive" />
            <StatCard icon={TrendingUp} label="Today" value={todaySent} color="text-primary" />
            <StatCard icon={CreditCard} label="Credits Left" value={isOwnGw ? "∞" : (balance?.sms_credits ?? 0)} color="text-primary" />
          </div>

          {/* Quick Send */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Quick Send SMS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                  placeholder="+8801XXXXXXXXX"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Message</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter your message..."
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{testMessage.length}/160 characters</span>
              <button
                onClick={handleSendSms}
                disabled={sending || !testPhone || !testMessage}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send SMS
              </button>
            </div>
          </div>

          {/* Recent Messages */}
          <div className="bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Recent Messages
              </h2>
              <button onClick={() => setActiveTab("messages")} className="text-xs text-primary hover:underline">View All</button>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-8"><p className="text-sm text-muted-foreground">No messages sent yet</p></div>
            ) : (
              <div className="divide-y divide-border">
                {logs.slice(0, 5).map(log => (
                  <SmsLogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MESSAGES TAB ─── */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search by phone or message..."
                className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "sent", "failed"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setLogStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    logStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : s === "sent" ? "Sent" : "Failed"}
                </button>
              ))}
            </div>
          </div>

          {/* Messages List */}
          <div className="bg-card border border-border rounded-xl">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12"><p className="text-sm text-muted-foreground">No messages found</p></div>
            ) : (
              <div className="divide-y divide-border">
                {filteredLogs.map(log => (
                  <SmsLogRow key={log.id} log={log} detailed />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CREDITS TAB ─── */}
      {activeTab === "credits" && (
        <div className="space-y-6">
          {/* Purchase Bundles */}
          {!isOwnGw && pricing.length > 0 && (
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
                      <span className="text-lg font-bold text-primary">{cs}{item.price}</span>
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

          {isOwnGw && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-foreground">Own Gateway Active</h3>
              <p className="text-xs text-muted-foreground mt-1">You're using your own SMS gateway. No platform credits are needed.</p>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-card border border-border rounded-xl">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Credit History</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="text-center py-8"><p className="text-sm text-muted-foreground">No transactions yet</p></div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {tx.transaction_type === "topup" ? (
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <Send className="h-4 w-4 text-destructive" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${tx.transaction_type === "topup" ? "text-primary" : "text-destructive"}`}>
                        {tx.transaction_type === "topup" ? "+" : "-"}{tx.sms_count} SMS
                      </span>
                      {tx.amount > 0 && (
                        <p className="text-xs text-muted-foreground">{cs}{tx.amount}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Gateway Mode */}
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
                <p className="text-xs text-muted-foreground">Use the platform's shared SMS gateway. Credits will be deducted per SMS.</p>
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
                  {GATEWAY_OPTIONS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
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
              onClick={() => {
                setTestMessage("✅ Test SMS from your company. Integration working!");
                handleSendSms();
              }}
              disabled={sending || !testPhone}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/30 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              Send Test SMS
            </button>
          </div>

          {/* Save */}
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
      )}
    </div>
  );
}

// ─── Sub Components ───

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function SmsLogRow({ log, detailed }: { log: SmsLog; detailed?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        log.status === "sent" ? "bg-primary/10" : "bg-destructive/10"
      }`}>
        {log.status === "sent" ? (
          <CheckCircle className="h-4 w-4 text-primary" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{log.recipient_phone}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            log.status === "sent" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}>
            {log.status}
          </span>
        </div>
        {detailed && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.message}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          <span>{format(new Date(log.created_at), "MMM d, yyyy · h:mm a")}</span>
          <span className="capitalize">{log.gateway_key?.replace(/_/g, " ")}</span>
          {log.event_key && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{log.event_key}</span>}
        </div>
      </div>
    </div>
  );
}
