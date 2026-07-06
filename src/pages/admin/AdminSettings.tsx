import { useState, useEffect } from "react";
import { Mail, Clock, Key, Save, Loader2, Send, Bell, Shield, TestTube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatabaseConnectionSettings from "@/components/admin/DatabaseConnectionSettings";

interface SmtpConfig {
  host: string;
  port: number;
  encryption: string;
  user: string;
  password: string;
  from_email: string;
  from_name: string;
}

interface TemplateConfig {
  [key: string]: { subject: string; enabled: boolean };
}

interface NotifConfig {
  [key: string]: { subject: string; enabled: boolean; from_name?: string };
}

const defaultSmtp: SmtpConfig = {
  host: "",
  port: 465,
  encryption: "ssl",
  user: "",
  password: "",
  from_email: "",
  from_name: "",
};

const defaultTemplates: TemplateConfig = {
  auth_signup: { subject: "Verify your email", enabled: true },
  auth_reset: { subject: "Reset your password", enabled: true },
  auth_welcome: { subject: "Welcome to our platform", enabled: true },
};

const defaultNotif: NotifConfig = {
  notification_invoice: { subject: "Invoice #{number}", enabled: true },
  notification_overdue: { subject: "Overdue Invoice Reminder", enabled: true },
  notification_contact: { subject: "New Contact Form Submission", enabled: true },
  notification_job: { subject: "New Job Application", enabled: true },
  notification_payment: { subject: "Payment Confirmation", enabled: true },
};

export default function AdminSettings() {
  const [trialDays, setTrialDays] = useState<number>(14);
  const [loadingTrial, setLoadingTrial] = useState(true);
  const [savingTrial, setSavingTrial] = useState(false);
  const [preloaderEnabled, setPreloaderEnabled] = useState(false);
  const [loadingPreloader, setLoadingPreloader] = useState(true);
  const [savingPreloader, setSavingPreloader] = useState(false);

  // Email states
  const [smtp, setSmtp] = useState<SmtpConfig>(defaultSmtp);
  const [templates, setTemplates] = useState<TemplateConfig>(defaultTemplates);
  const [notifConfig, setNotifConfig] = useState<NotifConfig>(defaultNotif);
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const [trialRes, preloaderRes, smtpRes, templatesRes, notifRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "trial_duration_days").maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "preloader_enabled").maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "email_smtp_config").maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "email_templates_config").maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "email_notification_config").maybeSingle(),
      ]);

      if (trialRes.data?.value) {
        const val = typeof trialRes.data.value === "string" ? parseInt(trialRes.data.value, 10) : typeof trialRes.data.value === "number" ? trialRes.data.value : 14;
        setTrialDays(isNaN(val) ? 14 : val);
      }
      if (preloaderRes.data?.value) {
        const val = preloaderRes.data.value as { enabled?: boolean };
        setPreloaderEnabled(val?.enabled ?? false);
      }
      if (smtpRes.data?.value) {
        setSmtp({ ...defaultSmtp, ...(smtpRes.data.value as any) });
      }
      if (templatesRes.data?.value) {
        setTemplates({ ...defaultTemplates, ...(templatesRes.data.value as any) });
      }
      if (notifRes.data?.value) {
        setNotifConfig({ ...defaultNotif, ...(notifRes.data.value as any) });
      }

      setLoadingTrial(false);
      setLoadingPreloader(false);
      setLoadingEmail(false);
    };
    fetchSettings();
  }, []);

  const saveTrialDays = async () => {
    setSavingTrial(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: trialDays as any, updated_at: new Date().toISOString() })
      .eq("key", "trial_duration_days");
    if (error) toast.error("Failed to save trial duration.");
    else toast.success("Trial duration updated successfully.");
    setSavingTrial(false);
  };

  const saveSmtp = async () => {
    setSavingSmtp(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "email_smtp_config", value: smtp as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSavingSmtp(false);
    if (error) toast.error("Failed to save SMTP config");
    else toast.success("SMTP configuration saved!");
  };

  const saveTemplates = async () => {
    setSavingTemplates(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "email_templates_config", value: templates as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSavingTemplates(false);
    if (error) toast.error("Failed to save template config");
    else toast.success("Auth email templates saved!");
  };

  const saveNotifConfig = async () => {
    setSavingNotif(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "email_notification_config", value: notifConfig as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSavingNotif(false);
    if (error) toast.error("Failed to save notification config");
    else toast.success("Notification email settings saved!");
  };

  const sendTestEmail = async () => {
    if (!testEmail) { toast.error("Enter a test email address"); return; }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-custom-email", {
        body: {
          to: testEmail,
          subject: "Test Email from Dynime",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#333;">✅ SMTP Configuration Working!</h2>
            <p style="color:#666;">This is a test email sent from your Dynime admin panel.</p>
            <p style="color:#666;">Your SMTP settings are correctly configured.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="color:#999;font-size:12px;">Sent via ${smtp.host}:${smtp.port} (${smtp.encryption.toUpperCase()})</p>
          </div>`,
          email_type: "test",
        },
      });
      if (error) throw error;
      const result = data as any;
      if (result?.error) throw new Error(result.error);
      toast.success("Test email sent successfully! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    }
    setSendingTest(false);
  };

  const updateSmtp = (field: keyof SmtpConfig, value: any) => {
    setSmtp((prev) => ({ ...prev, [field]: value }));
  };

  const updateTemplate = (key: string, field: string, value: any) => {
    setTemplates((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const updateNotif = (key: string, field: string, value: any) => {
    setNotifConfig((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const templateLabels: Record<string, string> = {
    auth_signup: "Signup Verification",
    auth_reset: "Password Reset",
    auth_welcome: "Welcome Email",
  };

  const notifLabels: Record<string, string> = {
    notification_invoice: "Invoice Email",
    notification_overdue: "Overdue Invoice Reminder",
    notification_contact: "Contact Form Notification",
    notification_job: "Job Application Notification",
    notification_payment: "Payment Confirmation",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide configuration</p>
      </div>

      {/* Preloader Toggle */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Loader2 className="h-4 w-4 text-primary" /></div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Page Preloader</h2>
            <p className="text-xs text-muted-foreground">Show a loading spinner while pages load.</p>
          </div>
          {loadingPreloader ? (
            <div className="h-6 w-11 rounded-full bg-secondary animate-pulse" />
          ) : (
            <Switch
              checked={preloaderEnabled}
              onCheckedChange={async (checked) => {
                setPreloaderEnabled(checked);
                setSavingPreloader(true);
                const { error } = await supabase
                  .from("platform_settings")
                  .upsert({ key: "preloader_enabled", value: { enabled: checked } as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
                setSavingPreloader(false);
                if (error) toast.error("Failed to save preloader setting");
                else toast.success(`Preloader ${checked ? "enabled" : "disabled"}`);
              }}
            />
          )}
        </div>
        {savingPreloader && <p className="text-xs text-muted-foreground">Saving...</p>}
      </div>

      {/* Trial Duration */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-4 w-4 text-warning" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Free Trial Duration</h2>
            <p className="text-xs text-muted-foreground">Set trial days for new company signups.</p>
          </div>
        </div>
        {loadingTrial ? (
          <div className="h-9 w-24 rounded-lg bg-secondary animate-pulse" />
        ) : (
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">days</span>
            <button onClick={saveTrialDays} disabled={savingTrial} className="ml-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {savingTrial ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* EMAIL SETTINGS - Tabbed */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-4 w-4 text-primary" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Email Settings</h2>
            <p className="text-xs text-muted-foreground">Configure SMTP, auth emails, notifications &amp; test delivery</p>
          </div>
        </div>

        {loadingEmail ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-9 rounded-lg bg-secondary animate-pulse" />)}
          </div>
        ) : (
          <Tabs defaultValue="smtp" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="smtp" className="text-xs"><Shield className="h-3 w-3 mr-1" />SMTP</TabsTrigger>
              <TabsTrigger value="auth" className="text-xs"><Key className="h-3 w-3 mr-1" />Auth</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs"><Bell className="h-3 w-3 mr-1" />Notifications</TabsTrigger>
              <TabsTrigger value="test" className="text-xs"><TestTube className="h-3 w-3 mr-1" />Test</TabsTrigger>
            </TabsList>

            {/* SMTP Tab */}
            <TabsContent value="smtp" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">SMTP Host</Label>
                  <Input value={smtp.host} onChange={(e) => updateSmtp("host", e.target.value)} placeholder="smtp.hostinger.com" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SMTP Port</Label>
                  <Input type="number" value={smtp.port} onChange={(e) => updateSmtp("port", parseInt(e.target.value) || 465)} placeholder="465" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Encryption</Label>
                  <select
                    value={smtp.encryption}
                    onChange={(e) => updateSmtp("encryption", e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="ssl">SSL (Port 465)</option>
                    <option value="tls">TLS/STARTTLS (Port 587)</option>
                    <option value="none">None (Port 25)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SMTP Username</Label>
                  <Input value={smtp.user} onChange={(e) => updateSmtp("user", e.target.value)} placeholder="you@domain.com" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">From Email</Label>
                  <Input value={smtp.from_email} onChange={(e) => updateSmtp("from_email", e.target.value)} placeholder="noreply@domain.com" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">From Name</Label>
                  <Input value={smtp.from_name} onChange={(e) => updateSmtp("from_name", e.target.value)} placeholder="Dynime" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">SMTP Password</Label>
                  <Input type="password" value={smtp.password} onChange={(e) => updateSmtp("password", e.target.value)} placeholder="••••••••" />
                  <p className="text-xs text-muted-foreground mt-1">Enter your SMTP password. It will be stored securely in the database.</p>
                </div>
              </div>
              <button onClick={saveSmtp} disabled={savingSmtp} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {savingSmtp ? "Saving..." : "Save SMTP Config"}
              </button>
            </TabsContent>

            {/* Auth Emails Tab */}
            <TabsContent value="auth" className="space-y-4">
              <p className="text-xs text-muted-foreground">Configure subjects and toggles for authentication emails.</p>
              {Object.entries(templates).map(([key, config]) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <Switch checked={config.enabled} onCheckedChange={(v) => updateTemplate(key, "enabled", v)} />
                  <div className="flex-1 space-y-1">
                    <span className="text-xs font-medium text-foreground">{templateLabels[key] || key}</span>
                    <Input
                      value={config.subject}
                      onChange={(e) => updateTemplate(key, "subject", e.target.value)}
                      placeholder="Email subject"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
              <button onClick={saveTemplates} disabled={savingTemplates} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {savingTemplates ? "Saving..." : "Save Auth Templates"}
              </button>
            </TabsContent>

            {/* Notification Emails Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <p className="text-xs text-muted-foreground">Toggle and customize notification email types.</p>
              {Object.entries(notifConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <Switch checked={config.enabled} onCheckedChange={(v) => updateNotif(key, "enabled", v)} />
                  <div className="flex-1 space-y-1">
                    <span className="text-xs font-medium text-foreground">{notifLabels[key] || key}</span>
                    <Input
                      value={config.subject}
                      onChange={(e) => updateNotif(key, "subject", e.target.value)}
                      placeholder="Email subject"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
              <button onClick={saveNotifConfig} disabled={savingNotif} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {savingNotif ? "Saving..." : "Save Notification Settings"}
              </button>
            </TabsContent>

            {/* Test Email Tab */}
            <TabsContent value="test" className="space-y-4">
              <p className="text-xs text-muted-foreground">Send a test email to verify your SMTP configuration is working.</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Recipient Email</Label>
                  <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" type="email" />
                </div>
                <button onClick={sendTestEmail} disabled={sendingTest} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" /> {sendingTest ? "Sending..." : "Send Test Email"}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground space-y-1">
                <p><strong>Current SMTP:</strong> {smtp.host || "Not configured"} : {smtp.port}</p>
                <p><strong>Encryption:</strong> {smtp.encryption?.toUpperCase() || "Not set"}</p>
                <p><strong>From:</strong> {smtp.from_name} &lt;{smtp.from_email || smtp.user || "N/A"}&gt;</p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dynamic Database Connection */}
      <DatabaseConnectionSettings />

      {/* API & Webhooks */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Key className="h-4 w-4 text-warning" /></div>
          <h2 className="text-sm font-semibold text-foreground">API Keys & Webhooks</h2>
        </div>
        <p className="text-xs text-muted-foreground">API key management and webhook endpoints will be available once external integrations are configured.</p>
        <div className="p-6 rounded-lg bg-secondary/50 text-center">
          <Key className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
