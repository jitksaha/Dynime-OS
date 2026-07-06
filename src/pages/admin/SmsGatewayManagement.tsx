// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  MessageSquare, Loader2, Save, TestTube, ChevronDown, ChevronUp,
  Globe, Smartphone,
} from "lucide-react";

interface SmsGateway {
  id: string;
  gateway_key: string;
  display_name: string;
  api_url: string;
  credentials: Record<string, any>;
  is_enabled: boolean;
  is_sandbox: boolean;
  supported_countries: string[];
  config_fields: { key: string; label: string; type: string; required: boolean }[];
}

export default function SmsGatewayManagement() {
  const [gateways, setGateways] = useState<SmsGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGw, setExpandedGw] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");

  const fetchGateways = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sms_gateway_configs")
      .select("*")
      .order("display_name");
    setGateways((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchGateways(); }, []);

  const updateField = (gwKey: string, field: string, value: any) => {
    setGateways(prev =>
      prev.map(gw =>
        gw.gateway_key === gwKey ? { ...gw, [field]: value } : gw
      )
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

  const saveGateway = async (gw: SmsGateway) => {
    setSaving(gw.gateway_key);
    const { error } = await supabase
      .from("sms_gateway_configs")
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

  const testGateway = async (gw: SmsGateway) => {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Enter a valid test phone number");
      return;
    }
    setTesting(gw.gateway_key);
    try {
      const { data, error } = await supabase.functions.invoke("sms-send", {
        body: {
          gateway_key: gw.gateway_key,
          phone: testPhone,
          message: `✅ Test SMS from Boostio via ${gw.display_name}. Integration working!`,
          event_key: "test",
        },
      });
      if (error) throw error;
      if (data?.success) toast.success("Test SMS sent!");
      else toast.error(data?.error || "Test failed");
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    }
    setTesting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">SMS Gateway Management</h1>
          <p className="text-xs text-muted-foreground">Configure SMS providers for platform-wide notifications</p>
        </div>
      </div>

      {/* Test phone input */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <label className="text-xs font-medium text-foreground">Test Phone Number</label>
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value.replace(/[^0-9+]/g, ""))}
            placeholder="+8801XXXXXXXXX"
            className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Gateway cards */}
      <div className="space-y-3">
        {gateways.map((gw) => {
          const isExpanded = expandedGw === gw.gateway_key;
          const fields = gw.config_fields || [];

          return (
            <div key={gw.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedGw(isExpanded ? null : gw.gateway_key)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${gw.is_enabled ? "bg-primary/10" : "bg-muted/30"}`}>
                    <Globe className={`h-4 w-4 ${gw.is_enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{gw.display_name}</span>
                      {gw.is_enabled ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">ACTIVE</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">DISABLED</span>
                      )}
                      {gw.is_sandbox && gw.is_enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-bold">SANDBOX</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{gw.supported_countries?.join(", ")} · {gw.gateway_key}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {/* Expanded config */}
              {isExpanded && (
                <div className="border-t border-border p-5 space-y-4 animate-in slide-in-from-top-1">
                  {/* Toggle row */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gw.is_enabled}
                        onChange={(e) => updateField(gw.gateway_key, "is_enabled", e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-sm font-medium text-foreground">Enabled</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gw.is_sandbox}
                        onChange={(e) => updateField(gw.gateway_key, "is_sandbox", e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-sm font-medium text-foreground">Sandbox Mode</span>
                    </label>
                  </div>

                  {/* API URL */}
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">API URL</label>
                    <input
                      type="text"
                      value={gw.api_url}
                      onChange={(e) => updateField(gw.gateway_key, "api_url", e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Dynamic credential fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map((field: any) => (
                      <div key={field.key}>
                        <label className="text-xs font-medium text-foreground block mb-1">
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </label>
                        <input
                          type={field.type === "password" ? "password" : "text"}
                          value={gw.credentials[field.key] || ""}
                          onChange={(e) => updateCredential(gw.gateway_key, field.key, e.target.value)}
                          placeholder={field.label}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => saveGateway(gw)}
                      disabled={saving === gw.gateway_key}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {saving === gw.gateway_key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                    <button
                      onClick={() => testGateway(gw)}
                      disabled={!gw.is_enabled || testing === gw.gateway_key || !testPhone}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/30 disabled:opacity-50"
                    >
                      {testing === gw.gateway_key ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                      Send Test SMS
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
