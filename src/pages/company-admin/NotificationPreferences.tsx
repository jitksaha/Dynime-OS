// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Bell, Mail, Smartphone, Loader2, Save, ChevronDown, ChevronUp,
  Settings,
} from "lucide-react";

interface EventType {
  id: string;
  event_key: string;
  event_label: string;
  category: string;
  description: string | null;
  default_sms_template: string | null;
  default_email_subject: string | null;
  available_variables: string[];
}

interface Preference {
  id?: string;
  event_key: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  sms_gateway_key: string | null;
  custom_sms_template: string | null;
}

interface SmsGateway {
  gateway_key: string;
  display_name: string;
}

export default function NotificationPreferences() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [events, setEvents] = useState<EventType[]>([]);
  const [prefs, setPrefs] = useState<Record<string, Preference>>({});
  const [gateways, setGateways] = useState<SmsGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      setLoading(true);
      const [eventsRes, prefsRes, gwRes, tenantGwRes] = await Promise.all([
        supabase.from("notification_event_types").select("*").order("category"),
        supabase.from("tenant_notification_preferences").select("*").eq("tenant_id", tenantId),
        supabase.from("sms_gateway_configs").select("gateway_key, display_name").eq("is_enabled", true),
        supabase.from("tenant_sms_gateway_configs").select("gateway_key, use_own_gateway, is_enabled").eq("tenant_id", tenantId).eq("is_enabled", true).maybeSingle(),
      ]);
      setEvents((eventsRes.data as any) || []);

      const allGateways: SmsGateway[] = [];
      const tenantGw = tenantGwRes.data as any;
      if (tenantGw?.use_own_gateway && tenantGw?.gateway_key) {
        allGateways.push({ gateway_key: tenantGw.gateway_key, display_name: `${tenantGw.gateway_key} (Own)` });
      }
      for (const gw of (gwRes.data as any) || []) {
        if (!allGateways.find(g => g.gateway_key === gw.gateway_key)) {
          allGateways.push(gw);
        }
      }
      setGateways(allGateways);

      const prefMap: Record<string, Preference> = {};
      for (const p of (prefsRes.data as any) || []) {
        prefMap[p.event_key] = p;
      }
      setPrefs(prefMap);
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const togglePref = (eventKey: string, field: "sms_enabled" | "email_enabled") => {
    setPrefs(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || { event_key: eventKey, sms_enabled: false, email_enabled: true, sms_gateway_key: null, custom_sms_template: null }),
        [field]: !(prev[eventKey]?.[field] ?? (field === "email_enabled")),
      },
    }));
  };

  const updatePrefField = (eventKey: string, field: string, value: any) => {
    setPrefs(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || { event_key: eventKey, sms_enabled: false, email_enabled: true, sms_gateway_key: null, custom_sms_template: null }),
        [field]: value,
      },
    }));
  };

  const saveAll = async () => {
    if (!tenantId) return;
    setSaving(true);
    const upserts = Object.entries(prefs).map(([eventKey, pref]) => ({
      tenant_id: tenantId,
      event_key: eventKey,
      sms_enabled: pref.sms_enabled,
      email_enabled: pref.email_enabled,
      sms_gateway_key: pref.sms_gateway_key,
      custom_sms_template: pref.custom_sms_template,
    }));

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("tenant_notification_preferences")
        .upsert(upserts as any, { onConflict: "tenant_id,event_key" });
      if (error) toast.error("Failed to save preferences");
      else toast.success("Notification preferences saved!");
    }
    setSaving(false);
  };

  const categories = [...new Set(events.map(e => e.category))];

  const categoryLabels: Record<string, string> = {
    billing: "💳 Billing & Payments",
    hr: "👥 HR & Employee",
    crm: "🤝 CRM & Sales",
    general: "📋 General",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notification Preferences</h1>
            <p className="text-xs text-muted-foreground">Configure Email & SMS notifications for each event</p>
          </div>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Settings className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">How it works</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable Email and/or SMS for each event type. When an event occurs, the system will automatically
            send notifications via the enabled channels. For SMS, select which gateway to use.
          </p>
        </div>
      </div>

      {/* Categories */}
      {categories.map(cat => {
        const catEvents = events.filter(e => e.category === cat);
        const isExpanded = expandedCat === cat || expandedCat === null;

        return (
          <div key={cat} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-bold text-foreground">{categoryLabels[cat] || cat}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{catEvents.length} events</span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/20 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-5">Event</div>
                  <div className="col-span-2 text-center">Email</div>
                  <div className="col-span-2 text-center">SMS</div>
                  <div className="col-span-3">SMS Gateway</div>
                </div>

                {catEvents.map(ev => {
                  const pref = prefs[ev.event_key];
                  const emailOn = pref?.email_enabled ?? true;
                  const smsOn = pref?.sms_enabled ?? false;

                  return (
                    <div key={ev.event_key} className="grid grid-cols-12 gap-2 items-center px-4 py-3 border-t border-border/50 hover:bg-muted/10">
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-foreground">{ev.event_label}</p>
                        <p className="text-[11px] text-muted-foreground">{ev.description}</p>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => togglePref(ev.event_key, "email_enabled")}
                          className={`p-2 rounded-lg transition-all ${emailOn ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"}`}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => togglePref(ev.event_key, "sms_enabled")}
                          className={`p-2 rounded-lg transition-all ${smsOn ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"}`}
                        >
                          <Smartphone className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="col-span-3">
                        {smsOn && (
                          <select
                            value={pref?.sms_gateway_key || ""}
                            onChange={(e) => updatePrefField(ev.event_key, "sms_gateway_key", e.target.value || null)}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Select gateway</option>
                            {gateways.map(gw => (
                              <option key={gw.gateway_key} value={gw.gateway_key}>{gw.display_name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
