// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Loader2, Save, TestTube, ChevronDown, ChevronUp, Globe,
  BookOpen, ExternalLink, Copy, CheckCircle2, Send, Clock, AlertTriangle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface WaGateway {
  id: string;
  gateway_key: string;
  display_name: string;
  api_url: string;
  credentials: Record<string, any>;
  is_enabled: boolean;
  is_sandbox: boolean;
  config_fields: { key: string; label: string; type: string; required: boolean }[];
}

const SETUP_DOCS = [
  {
    title: "Meta Cloud API (Official)",
    steps: [
      "Go to developers.facebook.com and create a new app (type: Business).",
      'Add the "WhatsApp" product to your app.',
      "Navigate to WhatsApp → Getting Started. Note your Phone Number ID and WhatsApp Business Account ID.",
      "Generate a permanent access token: Go to Business Settings → System Users → create a system user with admin role → generate token with whatsapp_business_messaging permission.",
      "In the gateway config below, paste your Access Token and Phone Number ID.",
      "Set API URL to: https://graph.facebook.com/v21.0",
      "Register a webhook URL for incoming messages (optional): use your backend Edge Function URL.",
      "Submit your app for App Review to send messages to non-test numbers.",
    ],
    links: [
      { label: "Meta Developer Portal", url: "https://developers.facebook.com/" },
      { label: "WhatsApp Cloud API Docs", url: "https://developers.facebook.com/docs/whatsapp/cloud-api" },
      { label: "Get Permanent Token Guide", url: "https://developers.facebook.com/docs/whatsapp/business-management-api/get-started" },
    ],
  },
  {
    title: "AiSensy",
    steps: [
      "Sign up at aisensy.com and complete your WhatsApp Business verification.",
      "Go to your AiSensy dashboard → API Settings to find your API Key.",
      "Copy the API Key and paste it in the gateway config below.",
      "Set the API URL to: https://backend.aisensy.com/campaign/t1/api/v2",
      "Create message templates in AiSensy dashboard before sending template-based messages.",
      "Map your AiSensy template names to the template keys used in this platform.",
    ],
    links: [
      { label: "AiSensy Dashboard", url: "https://app.aisensy.com/" },
      { label: "AiSensy API Docs", url: "https://docs.aisensy.com/" },
    ],
  },
];

function SetupDocumentation() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Collapsible>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/40 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Gateway Connection Guide</p>
              <p className="text-xs text-muted-foreground">Step-by-step setup for Meta Cloud API &amp; AiSensy</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4 border-t pt-4">
            {SETUP_DOCS.map((doc) => {
              const isOpen = openDoc === doc.title;
              return (
                <div key={doc.title} className="rounded-lg border bg-background overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
                    onClick={() => setOpenDoc(isOpen ? null : doc.title)}
                  >
                    <span className="font-medium text-sm">{doc.title}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t">
                      <ol className="space-y-3 pt-3">
                        {doc.steps.map((step, idx) => {
                          const stepId = `${doc.title}-${idx}`;
                          const hasUrl = step.match(/https?:\/\/[^\s,)]+/);
                          return (
                            <li key={idx} className="flex gap-3">
                              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground leading-relaxed">{step}</p>
                                {hasUrl && (
                                  <button
                                    onClick={() => copyText(hasUrl[0], stepId)}
                                    className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
                                  >
                                    {copiedStep === stepId ? (
                                      <><CheckCircle2 className="h-3 w-3" /> Copied!</>
                                    ) : (
                                      <><Copy className="h-3 w-3" /> Copy URL</>
                                    )}
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>

                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {doc.links.map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function WhatsAppGatewayManagement() {
  const [gateways, setGateways] = useState<WaGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGw, setExpandedGw] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const fetchGateways = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_gateway_configs")
      .select("*")
      .order("display_name");
    setGateways((data as any) || []);
    setLoading(false);
  };

  const fetchRecentLogs = async () => {
    const { data } = await supabase
      .from("whatsapp_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentLogs(data || []);
  };

  useEffect(() => { fetchGateways(); fetchRecentLogs(); }, []);

  const updateField = (gwKey: string, field: string, value: any) => {
    setGateways(prev =>
      prev.map(gw => gw.gateway_key === gwKey ? { ...gw, [field]: value } : gw)
    );
  };

  const updateCredential = (gwKey: string, credKey: string, value: string) => {
    setGateways(prev =>
      prev.map(gw =>
        gw.gateway_key === gwKey
          ? { ...gw, credentials: { ...gw.credentials, [credKey]: value } }
          : gw
      )
    );
  };

  const saveGateway = async (gw: WaGateway) => {
    setSaving(gw.gateway_key);
    const { error } = await supabase
      .from("whatsapp_gateway_configs")
      .update({
        credentials: gw.credentials,
        is_enabled: gw.is_enabled,
        is_sandbox: gw.is_sandbox,
        api_url: gw.api_url,
      })
      .eq("id", gw.id);
    if (error) toast.error("Failed to save");
    else toast.success(`${gw.display_name} configuration saved`);
    setSaving(null);
  };

  const testGateway = async (gw: WaGateway) => {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Enter a valid test phone number");
      return;
    }
    setTesting(gw.gateway_key);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          phone: testPhone,
          message: `✅ Test WhatsApp message from ${gw.display_name} gateway. If you received this, your configuration is working!`,
          event_key: null,
        },
      });
      if (error) throw error;
      if (data?.success) {
        setTestResult({ success: true, message: "Message sent successfully!" });
        toast.success("Test message sent!");
      } else {
        setTestResult({ success: false, message: data?.error || "Test failed" });
        toast.error(data?.error || "Test failed");
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Test failed" });
      toast.error(e.message || "Test failed");
    }
    setTesting(null);
    fetchRecentLogs();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledCount = gateways.filter(g => g.is_enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> WhatsApp Gateways
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure Meta Cloud API and AiSensy for platform-wide WhatsApp messaging.
          </p>
        </div>
        <Badge variant={enabledCount > 0 ? "default" : "secondary"}>
          {enabledCount} Active
        </Badge>
      </div>

      {/* Setup Documentation - Collapsible */}
      <SetupDocumentation />

      {/* Test Section */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Send Test Message</span>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+880XXXXXXXXXX"
            className="max-w-xs"
          />
          <span className="text-xs text-muted-foreground">Include country code</span>
        </div>
        {testResult && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${testResult.success ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
            {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Gateway Cards */}
      <div className="space-y-3">
        {gateways.map((gw) => {
          const expanded = expandedGw === gw.gateway_key;
          const fields = Array.isArray(gw.config_fields) ? gw.config_fields : [];

          return (
            <div key={gw.id} className="rounded-xl border bg-card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedGw(expanded ? null : gw.gateway_key)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm text-foreground">{gw.display_name}</span>
                    <p className="text-[10px] text-muted-foreground">{gw.api_url || "No API URL set"}</p>
                  </div>
                  <Badge variant={gw.is_enabled ? "default" : "secondary"} className="text-[10px]">
                    {gw.is_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {gw.is_sandbox && <Badge variant="outline" className="text-[10px]">Sandbox</Badge>}
                </div>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {expanded && (
                <div className="px-5 pb-5 space-y-4 border-t">
                  <div className="flex items-center gap-6 pt-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={gw.is_enabled}
                        onCheckedChange={(v) => updateField(gw.gateway_key, "is_enabled", v)}
                      />
                      <span className="text-sm font-medium">Enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={gw.is_sandbox}
                        onCheckedChange={(v) => updateField(gw.gateway_key, "is_sandbox", v)}
                      />
                      <span className="text-sm font-medium">Sandbox Mode</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">API URL</label>
                    <Input
                      value={gw.api_url}
                      onChange={(e) => updateField(gw.gateway_key, "api_url", e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map((f) => (
                      <div key={f.key}>
                        <label className="text-xs font-medium text-muted-foreground">
                          {f.label} {f.required && <span className="text-destructive">*</span>}
                        </label>
                        <Input
                          type={f.type === "password" ? "password" : "text"}
                          value={gw.credentials[f.key] || ""}
                          onChange={(e) => updateCredential(gw.gateway_key, f.key, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => saveGateway(gw)}
                      disabled={saving === gw.gateway_key}
                    >
                      {saving === gw.gateway_key ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Save Configuration
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testGateway(gw)}
                      disabled={testing === gw.gateway_key || !gw.is_enabled}
                    >
                      {testing === gw.gateway_key ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <TestTube className="h-3.5 w-3.5 mr-1" />}
                      Send Test
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Delivery Logs */}
      {recentLogs.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Recent Delivery Logs</span>
          </div>
          <div className="divide-y">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                    {log.status}
                  </Badge>
                  <span className="text-xs text-foreground font-mono">{log.recipient_phone}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{log.message?.slice(0, 50)}...</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
