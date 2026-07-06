// @ts-nocheck
import { useState, useEffect } from "react";
import { Mail, MessageSquare, Smartphone, Globe, Webhook, Loader2, CheckCircle2, XCircle, Save, Eye, EyeOff, Plus, Trash2, TestTube, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import IntegrationSetupWizard, { WIZARD_CONFIGS } from "./IntegrationSetupWizard";

interface FieldDef {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  hint?: string;
  default?: string;
}

interface IntegrationDef {
  key: string;
  name: string;
  desc: string;
  icon: any;
  category: string;
  docs?: string;
  useCases?: string[];
  fields: FieldDef[];
  supportsMultiple?: boolean;
}

interface IntegrationConfig {
  id?: string;
  integration_key: string;
  is_enabled: boolean;
  config: Record<string, any>;
  last_tested_at?: string;
  test_result?: string;
}


const INTEGRATION_DEFS: IntegrationDef[] = [
  {
    key: "gmail",
    name: "Gmail",
    desc: "Send and receive emails from Gmail",
    icon: Mail,
    category: "Email",
    docs: "Use Gmail SMTP to send transactional emails, notifications, and marketing messages. Ideal for invoice delivery, leave approvals, and HR communications.",
    useCases: ["Send invoice emails to clients", "Employee onboarding welcome emails", "Leave approval notifications", "Automated expense report summaries"],
    fields: [
      { key: "email", label: "Gmail Address", type: "text", placeholder: "your@gmail.com" },
      { key: "app_password", label: "App Password", type: "password", placeholder: "16-char app password", hint: "Generate at myaccount.google.com → Security → App Passwords" },
      { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com", default: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", type: "text", placeholder: "587", default: "587" },
    ],
  },
  {
    key: "slack",
    name: "Slack",
    desc: "Send notifications and alerts to Slack channels",
    icon: MessageSquare,
    category: "Communication",
    docs: "Connect Slack to receive real-time notifications about deals, invoices, attendance, and more directly in your workspace channels.",
    useCases: ["New deal alerts in #sales channel", "Invoice payment notifications", "Daily attendance summary", "Helpdesk ticket escalations"],
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "password", placeholder: "https://hooks.slack.com/services/...", hint: "Create an Incoming Webhook in your Slack workspace at api.slack.com/apps" },
      { key: "default_channel", label: "Default Channel", type: "text", placeholder: "#general" },
      { key: "bot_name", label: "Bot Display Name", type: "text", placeholder: "Dynime Bot", default: "Dynime Bot" },
    ],
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    desc: "Send messages via WhatsApp Business API",
    icon: Smartphone,
    category: "Communication",
    docs: "Integrate WhatsApp Business API to send order confirmations, appointment reminders, and customer support messages at scale.",
    useCases: ["Order confirmation messages", "Appointment & meeting reminders", "Customer support auto-replies", "Payment receipt notifications"],
    fields: [
      { key: "phone_number_id", label: "Phone Number ID", type: "text", placeholder: "Your WhatsApp Business phone number ID" },
      { key: "access_token", label: "Access Token", type: "password", placeholder: "Permanent access token", hint: "Get from Meta Business Suite → WhatsApp → API Setup" },
      { key: "business_account_id", label: "Business Account ID", type: "text", placeholder: "WhatsApp Business Account ID" },
      { key: "api_version", label: "API Version", type: "text", placeholder: "v18.0", default: "v18.0" },
    ],
  },
  {
    key: "google_calendar",
    name: "Google Calendar",
    desc: "Sync events, meetings, and schedules",
    icon: Globe,
    category: "Productivity",
    docs: "Sync your team's meetings, leave schedules, and project deadlines with Google Calendar for unified visibility.",
    useCases: ["Auto-create events for deal follow-ups", "Sync employee leave to team calendar", "Project milestone reminders", "Interview scheduling"],
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Google Cloud API key", hint: "Enable Calendar API in Google Cloud Console and create an API key" },
      { key: "calendar_id", label: "Calendar ID", type: "text", placeholder: "primary or email@gmail.com", default: "primary" },
    ],
  },
  {
    key: "google_drive",
    name: "Google Drive",
    desc: "Store and share files via Google Drive",
    icon: Globe,
    category: "Productivity",
    docs: "Connect Google Drive to automatically store documents, invoices, and reports in shared team folders.",
    useCases: ["Auto-save invoices as PDFs to Drive", "Shared document library for HR policies", "Backup expense receipts", "Collaborative project files"],
    fields: [
      { key: "client_id", label: "OAuth Client ID", type: "text", placeholder: "Google Cloud OAuth client ID" },
      { key: "client_secret", label: "OAuth Client Secret", type: "password", placeholder: "Client secret", hint: "Create OAuth credentials at console.cloud.google.com → APIs → Credentials" },
      { key: "folder_id", label: "Default Folder ID", type: "text", placeholder: "Google Drive folder ID (optional)" },
    ],
  },
  {
    key: "google_sheets",
    name: "Google Sheets",
    desc: "Export data to Google Sheets automatically",
    icon: Globe,
    category: "Productivity",
    docs: "Push report data, employee records, and financial summaries directly into Google Sheets for custom analysis.",
    useCases: ["Auto-export monthly payroll to Sheets", "Real-time CRM pipeline dashboard", "Attendance summary reports", "Budget tracking spreadsheets"],
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Google Cloud API key" },
      { key: "spreadsheet_id", label: "Spreadsheet ID", type: "text", placeholder: "From the Google Sheets URL" },
    ],
  },
  {
    key: "microsoft_outlook",
    name: "Microsoft Outlook",
    desc: "Send emails via Microsoft 365 Outlook",
    icon: Mail,
    category: "Email",
    docs: "Use Microsoft 365 / Outlook SMTP or Graph API to send business emails through your corporate Microsoft account.",
    useCases: ["Corporate email sending with company domain", "Calendar invites for meetings", "Automated HR notifications", "Invoice delivery via Outlook"],
    fields: [
      { key: "client_id", label: "Azure App Client ID", type: "text", placeholder: "Application (client) ID from Azure AD" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Azure AD client secret", hint: "Register app at portal.azure.com → App Registrations" },
      { key: "tenant_id", label: "Azure Tenant ID", type: "text", placeholder: "Directory (tenant) ID" },
      { key: "sender_email", label: "Sender Email", type: "text", placeholder: "noreply@yourcompany.com" },
    ],
  },
  {
    key: "microsoft_teams",
    name: "Microsoft Teams",
    desc: "Post notifications to Teams channels",
    icon: MessageSquare,
    category: "Communication",
    docs: "Send automated alerts and updates to Microsoft Teams channels for deal closures, approvals, and system events.",
    useCases: ["Deal won/lost notifications", "Expense approval requests", "System health alerts", "New employee announcements"],
    fields: [
      { key: "webhook_url", label: "Incoming Webhook URL", type: "password", placeholder: "https://outlook.office.com/webhook/...", hint: "Add an Incoming Webhook connector to your Teams channel" },
      { key: "default_channel", label: "Channel Name", type: "text", placeholder: "#general" },
    ],
  },
  {
    key: "zapier",
    name: "Zapier",
    desc: "Connect 5,000+ apps with no-code automation",
    icon: Webhook,
    category: "Automation",
    docs: "Use Zapier webhooks to trigger Zaps from any platform event — connect your business tools without writing code.",
    useCases: ["New deal → Create Trello card", "Invoice paid → Update Google Sheet", "Employee hired → Send Slack welcome", "Expense approved → Log to QuickBooks"],
    fields: [
      { key: "webhook_url", label: "Zapier Webhook URL", type: "password", placeholder: "https://hooks.zapier.com/hooks/catch/...", hint: "Create a Zap → Choose 'Webhooks by Zapier' trigger → Copy the webhook URL" },
      { key: "events", label: "Trigger Events", type: "text", placeholder: "deal.created, invoice.paid (comma-separated)", hint: "Events that trigger this Zap" },
    ],
  },
  {
    key: "make",
    name: "Make (Integromat)",
    desc: "Visual workflow automation platform",
    icon: Webhook,
    category: "Automation",
    docs: "Connect Make scenarios to platform events for complex multi-step automations across your entire tech stack.",
    useCases: ["Multi-step approval workflows", "Cross-platform data sync", "Automated report generation", "Complex conditional routing"],
    fields: [
      { key: "webhook_url", label: "Make Webhook URL", type: "password", placeholder: "https://hook.make.com/...", hint: "Create a scenario → Add Webhook module → Copy the URL" },
      { key: "events", label: "Trigger Events", type: "text", placeholder: "deal.created, invoice.paid (comma-separated)" },
    ],
  },
  {
    key: "quickbooks",
    name: "QuickBooks Online",
    desc: "Sync invoices and expenses with QuickBooks",
    icon: Globe,
    category: "Accounting",
    docs: "Two-way sync invoices, expenses, and payments between your platform and QuickBooks Online for seamless bookkeeping.",
    useCases: ["Auto-sync invoices to QuickBooks", "Push expenses for tax preparation", "Payment reconciliation", "Customer/vendor sync"],
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "QuickBooks OAuth Client ID" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "OAuth client secret", hint: "Register at developer.intuit.com → Create an app" },
      { key: "realm_id", label: "Company ID (Realm ID)", type: "text", placeholder: "Your QuickBooks company ID" },
      { key: "environment", label: "Environment", type: "text", placeholder: "sandbox or production", default: "sandbox" },
    ],
  },
  {
    key: "xero",
    name: "Xero",
    desc: "Connect accounting data with Xero",
    icon: Globe,
    category: "Accounting",
    docs: "Sync financial data including invoices, bills, contacts, and bank transactions between Xero and your platform.",
    useCases: ["Invoice sync to Xero", "Expense categorization", "Bank feed reconciliation", "Payroll data export"],
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "Xero OAuth2 Client ID" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "OAuth2 client secret", hint: "Register at developer.xero.com → Create your app" },
      { key: "tenant_id", label: "Xero Tenant ID", type: "text", placeholder: "Organisation tenant ID" },
    ],
  },
  {
    key: "freshbooks",
    name: "FreshBooks",
    desc: "Invoice and expense management with FreshBooks",
    icon: Globe,
    category: "Accounting",
    docs: "Sync invoicing and expense data between FreshBooks and your platform for unified financial management.",
    useCases: ["Push invoices to FreshBooks", "Sync client contacts", "Expense tracking sync", "Time tracking integration"],
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "FreshBooks API client ID" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "API client secret", hint: "Register at my.freshbooks.com → Developer Portal" },
      { key: "account_id", label: "Account ID", type: "text", placeholder: "Your FreshBooks account ID" },
    ],
  },
  {
    key: "webhooks",
    name: "Webhooks",
    desc: "Send real-time data to external services",
    icon: Webhook,
    category: "Developer",
    docs: "Configure outgoing webhooks to push real-time event data to any HTTP endpoint. Supports HMAC signature verification for security.",
    useCases: ["Notify external CRM on deal changes", "Trigger CI/CD on deployment events", "Sync data to data warehouse", "Custom alerting systems"],
    fields: [
      { key: "url", label: "Webhook URL", type: "text", placeholder: "https://your-service.com/webhook" },
      { key: "secret", label: "Signing Secret (optional)", type: "password", placeholder: "HMAC secret for payload verification" },
      { key: "events", label: "Events", type: "text", placeholder: "invoice.created, payment.received, employee.hired", hint: "Comma-separated list of events to send" },
    ],
    supportsMultiple: true,
  },
];

export default function IntegrationSettings() {
  const { profile } = useAuth();
  const [integrations, setIntegrations] = useState<Record<string, IntegrationConfig>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [webhookList, setWebhookList] = useState<Array<{ url: string; secret: string; events: string }>>([{ url: "", secret: "", events: "" }]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const load = async () => {
      const { data } = await supabase
        .from("tenant_integrations")
        .select("*")
        .eq("tenant_id", profile.tenant_id!);
      
      const map: Record<string, IntegrationConfig> = {};
      (data || []).forEach((row: any) => {
        map[row.integration_key] = {
          id: row.id,
          integration_key: row.integration_key,
          is_enabled: row.is_enabled,
          config: row.config || {},
          last_tested_at: row.last_tested_at,
          test_result: row.test_result,
        };
      });
      setIntegrations(map);

      // Load webhook list
      if (map.webhooks?.config?.endpoints) {
        setWebhookList(map.webhooks.config.endpoints);
      }

      setLoading(false);
    };
    load();
  }, [profile?.tenant_id]);

  const getFieldValue = (intKey: string, fieldKey: string, defaultVal?: string): string => {
    return integrations[intKey]?.config?.[fieldKey] || defaultVal || "";
  };

  const setFieldValue = (intKey: string, fieldKey: string, value: string) => {
    setIntegrations((prev) => ({
      ...prev,
      [intKey]: {
        ...prev[intKey],
        integration_key: intKey,
        is_enabled: prev[intKey]?.is_enabled || false,
        config: { ...(prev[intKey]?.config || {}), [fieldKey]: value },
      },
    }));
  };

  const handleSave = async (intKey: string) => {
    if (!profile?.tenant_id) return;
    setSaving(intKey);

    const existing = integrations[intKey];
    let config = existing?.config || {};

    // For webhooks, store the list
    if (intKey === "webhooks") {
      config = { ...config, endpoints: webhookList.filter((w) => w.url.trim()) };
    }

    // Set defaults
    const def = INTEGRATION_DEFS.find((d) => d.key === intKey);
    if (def) {
      def.fields.forEach((f) => {
        if (f.default && !config[f.key]) {
          config[f.key] = f.default;
        }
      });
    }

    try {
      if (existing?.id) {
        await supabase
          .from("tenant_integrations")
          .update({ config, is_enabled: true, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
      } else {
        const { data } = await supabase
          .from("tenant_integrations")
          .insert({
            tenant_id: profile.tenant_id,
            integration_key: intKey,
            is_enabled: true,
            config,
          } as any)
          .select()
          .single();
        
        if (data) {
          setIntegrations((prev) => ({
            ...prev,
            [intKey]: { ...prev[intKey], id: (data as any).id, is_enabled: true, config },
          }));
        }
      }
      toast.success(`${def?.name || intKey} configuration saved!`);
    } catch {
      toast.error("Failed to save configuration");
    }
    setSaving(null);
  };

  const handleDisconnect = async (intKey: string) => {
    const existing = integrations[intKey];
    if (!existing?.id) return;

    await supabase.from("tenant_integrations").delete().eq("id", existing.id);
    setIntegrations((prev) => {
      const next = { ...prev };
      delete next[intKey];
      return next;
    });
    toast.success("Integration disconnected");
    setExpanded(null);
  };

  const handleTest = async (intKey: string) => {
    setTesting(intKey);
    try {
      const { data, error } = await supabase.functions.invoke("integration-test", {
        body: { integration_key: intKey },
      });

      if (error) {
        toast.error("Test failed: " + (error.message || "Unknown error"));
        if (integrations[intKey]?.id) {
          await supabase.from("tenant_integrations").update({
            last_tested_at: new Date().toISOString(),
            test_result: "failed",
          } as any).eq("id", integrations[intKey].id!);
        }
      } else if (data?.success) {
        toast.success(data.message || "Connection test successful!");
        if (integrations[intKey]?.id) {
          await supabase.from("tenant_integrations").update({
            last_tested_at: new Date().toISOString(),
            test_result: "success",
          } as any).eq("id", integrations[intKey].id!);
        }
        setIntegrations((prev) => ({
          ...prev,
          [intKey]: { ...prev[intKey], last_tested_at: new Date().toISOString(), test_result: "success" },
        }));
      } else {
        toast.error(data?.error || "Test failed");
      }
    } catch {
      toast.error("Failed to test connection");
    }
    setTesting(null);
  };

  const togglePassword = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Connect third-party services to enhance your workflow.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {INTEGRATION_DEFS.map((def) => {
        const config = integrations[def.key];
        const isConnected = config?.is_enabled;
        const isExpanded = expanded === def.key;
        const Icon = def.icon;

        return (
          <div key={def.key} className={`border border-border rounded-xl bg-card overflow-hidden ${isExpanded ? "md:col-span-2 lg:col-span-3" : ""}`}>
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : def.key)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{def.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{def.category}</span>
                    {isConnected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{def.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isConnected && !isExpanded && WIZARD_CONFIGS[def.key] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setWizardOpen(def.key); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Easy Setup
                  </button>
                )}
                {!isConnected && !isExpanded && !WIZARD_CONFIGS[def.key] && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary">Connect</span>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {/* Expanded Config */}
            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4">
                {/* Documentation & Use Cases */}
                {(def.docs || def.useCases) && (
                  <div className="bg-muted/20 rounded-lg p-3 space-y-2">
                    {def.docs && <p className="text-xs text-muted-foreground">{def.docs}</p>}
                    {def.useCases && def.useCases.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-foreground mb-1 uppercase tracking-wider">Use Cases</p>
                        <ul className="space-y-0.5">
                          {def.useCases.map((uc, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span> {uc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {/* Webhooks have a special multi-endpoint UI */}
                {def.key === "webhooks" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">Webhook Endpoints</label>
                      <button
                        onClick={() => setWebhookList([...webhookList, { url: "", secret: "", events: "" }])}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Endpoint
                      </button>
                    </div>
                    {webhookList.map((wh, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-muted-foreground">Endpoint #{idx + 1}</span>
                          {webhookList.length > 1 && (
                            <button onClick={() => setWebhookList(webhookList.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <input
                          value={wh.url}
                          onChange={(e) => { const n = [...webhookList]; n[idx].url = e.target.value; setWebhookList(n); }}
                          placeholder="https://your-service.com/webhook"
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          value={wh.secret}
                          onChange={(e) => { const n = [...webhookList]; n[idx].secret = e.target.value; setWebhookList(n); }}
                          placeholder="Signing secret (optional)"
                          type="password"
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          value={wh.events}
                          onChange={(e) => { const n = [...webhookList]; n[idx].events = e.target.value; setWebhookList(n); }}
                          placeholder="invoice.created, payment.received (comma-separated)"
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Standard fields */
                  def.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-foreground mb-1.5">{field.label}</label>
                      <div className="relative">
                        <input
                          type={field.type === "password" && !showPasswords[`${def.key}_${field.key}`] ? "password" : "text"}
                          value={getFieldValue(def.key, field.key, field.default)}
                          onChange={(e) => setFieldValue(def.key, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {field.type === "password" && (
                          <button
                            onClick={() => togglePassword(`${def.key}_${field.key}`)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPasswords[`${def.key}_${field.key}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                      {field.hint && <p className="text-[10px] text-muted-foreground mt-1">{field.hint}</p>}
                    </div>
                  ))
                )}

                {/* Last test result */}
                {config?.last_tested_at && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${config.test_result === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                    {config.test_result === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    Last tested: {new Date(config.last_tested_at).toLocaleString()} — {config.test_result === "success" ? "Passed" : "Failed"}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleSave(def.key)}
                    disabled={saving === def.key}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving === def.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isConnected ? "Update" : "Connect & Save"}
                  </button>

                  {isConnected && (
                    <>
                      <button
                        onClick={() => handleTest(def.key)}
                        disabled={testing === def.key}
                        className="px-4 py-2 rounded-lg border border-primary/20 text-primary text-xs font-medium hover:bg-primary/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {testing === def.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
                        Test
                      </button>
                      <button
                        onClick={() => handleDisconnect(def.key)}
                        className="px-4 py-2 rounded-lg border border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>

      {/* Setup Wizard Modal */}
      {wizardOpen && WIZARD_CONFIGS[wizardOpen] && (() => {
        const def = INTEGRATION_DEFS.find(d => d.key === wizardOpen);
        if (!def) return null;
        return (
          <IntegrationSetupWizard
            integrationKey={wizardOpen}
            integrationName={def.name}
            icon={def.icon}
            currentConfig={integrations[wizardOpen]?.config || {}}
            saving={saving === wizardOpen}
            onClose={() => setWizardOpen(null)}
            onSave={async (config) => {
              if (!profile?.tenant_id) return;
              setSaving(wizardOpen);
              const existing = integrations[wizardOpen];
              try {
                if (existing?.id) {
                  await supabase
                    .from("tenant_integrations")
                    .update({ config, is_enabled: true, updated_at: new Date().toISOString() } as any)
                    .eq("id", existing.id);
                } else {
                  const { data } = await supabase
                    .from("tenant_integrations")
                    .insert({
                      tenant_id: profile.tenant_id,
                      integration_key: wizardOpen,
                      is_enabled: true,
                      config,
                    } as any)
                    .select()
                    .single();
                  if (data) {
                    setIntegrations(prev => ({
                      ...prev,
                      [wizardOpen]: { ...prev[wizardOpen], id: (data as any).id, is_enabled: true, config },
                    }));
                  }
                }
                toast.success(`${def.name} connected successfully!`);
                setIntegrations(prev => ({
                  ...prev,
                  [wizardOpen]: { ...prev[wizardOpen], is_enabled: true, config, integration_key: wizardOpen },
                }));
                setWizardOpen(null);
              } catch {
                toast.error("Failed to save configuration");
              }
              setSaving(null);
            }}
          />
        );
      })()}
    </div>
  );
}
