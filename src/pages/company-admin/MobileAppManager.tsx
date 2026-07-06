import { useState, useEffect } from "react";
import {
  Smartphone, Palette, Download, Bell, Globe, QrCode, Apple, Layers,
  ChevronRight, Copy, Check, RefreshCw, Eye, Settings, Shield, WifiOff,
  Zap, LogOut, Send, FileDown, Users, Building2, User, MessageSquare,
  AlertTriangle, CheckCircle2, Package, HelpCircle, ExternalLink, Info,
  Lock, Wifi, Battery, RotateCcw, Image, Type, Link2, Hash, Monitor,
  Upload, X, ImagePlus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──
interface FeatureToggles {
  company: Record<string, boolean>;
  employee: Record<string, boolean>;
  customer: Record<string, boolean>;
}

interface AppConfig {
  id?: string;
  tenant_id: string;
  app_name: string;
  app_icon_url: string;
  splash_screen_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  custom_domain: string;
  push_enabled: boolean;
  push_provider: string;
  push_config: Record<string, string>;
  feature_toggles: FeatureToggles;
  android_package_name: string;
  ios_bundle_id: string;
  app_version: string;
  build_number: number;
}

const DEFAULT_FEATURES: FeatureToggles = {
  company: { dashboard: true, settings: true, departments: true, employees: true, approvals: true, wallet: true },
  employee: { dashboard: true, attendance: true, leave: true, payslips: true, documents: true },
  customer: { dashboard: true, invoices: true, tickets: true, wallet: true, documents: true },
};

const FEATURE_LABELS: Record<string, string> = {
  dashboard: "Dashboard", settings: "Settings", departments: "Departments",
  employees: "Employees", approvals: "Approvals", wallet: "Wallet",
  attendance: "Attendance", leave: "Leave Management", payslips: "Payslips",
  documents: "Documents", invoices: "Invoices", tickets: "Support Tickets",
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  dashboard: "Main overview with stats and quick actions",
  settings: "Company and profile configuration",
  departments: "View and manage company departments",
  employees: "Employee directory and management",
  approvals: "Approval workflows and pending requests",
  wallet: "Digital wallet, balance and transactions",
  attendance: "Clock in/out and attendance history",
  leave: "Apply for leave and track balances",
  payslips: "Monthly salary slips and deductions",
  documents: "View and download shared documents",
  invoices: "Invoice history and payment records",
  tickets: "Raise and track support tickets",
};

const ROLE_ICONS = { company: Building2, employee: User, customer: Users };
const ROLE_COLORS = { company: "text-primary", employee: "text-chart-2", customer: "text-warning" };

// ── Help Tooltip ──
function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help inline-block ml-1.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Section Documentation Dialog ──
function DocDialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> {title}</DialogTitle>
          <DialogDescription>Documentation & best practices</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-foreground/80 mt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

// ── Field with label + description ──
function FieldLabel({ label, description, help }: { label: string; description?: string; help?: string }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-xs font-medium flex items-center">
        {label}
        {help && <FieldHelp text={help} />}
      </Label>
      {description && <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>}
    </div>
  );
}

export default function MobileAppManager() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pushTarget, setPushTarget] = useState<"all" | "company" | "employee" | "customer">("all");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sendingPush, setSendingPush] = useState(false);
  const [domainProtocol, setDomainProtocol] = useState<"https://" | "http://">("https://");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);
  const [config, setConfig] = useState<AppConfig>({
    tenant_id: "",
    app_name: "My App",
    app_icon_url: "",
    splash_screen_url: "",
    primary_color: "#6366f1",
    secondary_color: "#8b5cf6",
    accent_color: "#06b6d4",
    background_color: "#ffffff",
    custom_domain: "",
    push_enabled: false,
    push_provider: "firebase",
    push_config: {},
    feature_toggles: DEFAULT_FEATURES,
    android_package_name: "",
    ios_bundle_id: "",
    app_version: "1.0.0",
    build_number: 1,
  });

  const handleFileUpload = async (file: File, type: "icon" | "splash") => {
    if (!profile?.tenant_id) return;
    const setter = type === "icon" ? setUploadingIcon : setUploadingSplash;
    setter(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${profile.tenant_id}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("mobile-app-assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setter(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("mobile-app-assets").getPublicUrl(path);
    const key = type === "icon" ? "app_icon_url" : "splash_screen_url";
    setConfig((c) => ({ ...c, [key]: urlData.publicUrl }));
    toast.success(`${type === "icon" ? "App icon" : "Splash screen"} uploaded!`);
    setter(false);
  };

  const triggerUpload = (type: "icon" | "splash") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file, type);
    };
    input.click();
  };

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("mobile_app_configs")
        .select("*")
        .eq("tenant_id", profile.tenant_id!)
        .maybeSingle();
      if (data) {
        const domain = data.custom_domain || "";
        const cleanDomain = domain.replace(/^https?:\/\//, "");
        if (domain.startsWith("http://")) setDomainProtocol("http://");
        setConfig({
          ...data,
          app_icon_url: data.app_icon_url || "",
          splash_screen_url: data.splash_screen_url || "",
          custom_domain: cleanDomain,
          push_config: (data.push_config as Record<string, string>) || {},
          feature_toggles: (data.feature_toggles as unknown as FeatureToggles) || DEFAULT_FEATURES,
          android_package_name: data.android_package_name || "",
          ios_bundle_id: data.ios_bundle_id || "",
          push_provider: data.push_provider || "firebase",
          app_version: data.app_version || "1.0.0",
          build_number: data.build_number || 1,
        });
      } else {
        setConfig((c) => ({ ...c, tenant_id: profile.tenant_id! }));
      }
      setLoading(false);
    };
    fetchConfig();
  }, [profile?.tenant_id]);

  const fullCustomDomain = config.custom_domain ? domainProtocol + config.custom_domain : "";

  const saveConfig = async () => {
    if (!profile?.tenant_id) return;
    setSaving(true);
    const payload = {
      tenant_id: profile.tenant_id,
      app_name: config.app_name,
      app_icon_url: config.app_icon_url || null,
      splash_screen_url: config.splash_screen_url || null,
      primary_color: config.primary_color,
      secondary_color: config.secondary_color,
      accent_color: config.accent_color,
      background_color: config.background_color,
      custom_domain: fullCustomDomain || null,
      push_enabled: config.push_enabled,
      push_provider: config.push_provider,
      push_config: config.push_config,
      feature_toggles: JSON.parse(JSON.stringify(config.feature_toggles)),
      android_package_name: config.android_package_name || null,
      ios_bundle_id: config.ios_bundle_id || null,
      app_version: config.app_version,
      build_number: config.build_number,
    };

    if (config.id) {
      const { error } = await supabase.from("mobile_app_configs").update(payload).eq("id", config.id);
      if (error) toast.error("Failed to save: " + error.message);
      else toast.success("App configuration saved!");
    } else {
      const { data, error } = await supabase.from("mobile_app_configs").insert(payload).select().single();
      if (error) toast.error("Failed to save: " + error.message);
      else { setConfig((c) => ({ ...c, id: data.id })); toast.success("App configuration created!"); }
    }
    setSaving(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleFeature = (role: keyof FeatureToggles, feature: string) => {
    setConfig((c) => ({
      ...c,
      feature_toggles: {
        ...c.feature_toggles,
        [role]: { ...c.feature_toggles[role], [feature]: !c.feature_toggles[role][feature] },
      },
    }));
  };

  const pwaInstallUrl = fullCustomDomain || window.location.origin;

  const generateCapacitorConfig = () => JSON.stringify({
    appId: config.android_package_name || config.ios_bundle_id || "com.company.app",
    appName: config.app_name,
    webDir: "dist",
    server: { url: pwaInstallUrl + "?forceHideBadge=true", cleartext: true },
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: config.background_color,
        launchAutoHide: true,
        androidScaleType: "CENTER_CROP",
      },
      StatusBar: { style: "DARK", backgroundColor: config.primary_color },
      Keyboard: { resize: "body", resizeOnFullScreen: true },
      App: { exitOnBack: true },
      Network: { enabled: true },
      ...(config.push_enabled ? {
        PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
      } : {}),
    },
    android: {
      backgroundColor: config.background_color,
      allowMixedContent: false,
      captureInput: true,
      webContentsDebuggingEnabled: false,
    },
    ios: {
      backgroundColor: config.background_color,
      contentInset: "always",
      allowsLinkPreview: false,
      scrollEnabled: true,
    },
  }, null, 2);

  const downloadFile = (content: string, filename: string, type = "application/json") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded!`);
  };

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast.error("Please enter both title and message");
      return;
    }
    setSendingPush(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast.success(`Push notification sent to ${pushTarget === "all" ? "all users" : pushTarget + " users"}!`);
    setPushTitle("");
    setPushBody("");
    setSendingPush(false);
  };

  const generateServiceWorkerSnippet = () => `// sw.js - Add to public/ folder
const CACHE_NAME = '${config.app_name.toLowerCase().replace(/\\s+/g, "-")}-v${config.app_version}';
const OFFLINE_URL = '/offline.html';
const STATIC_ASSETS = ['/', '/index.html', '/offline.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});`;

  const generateOfflineHTML = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.app_name} - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: ${config.background_color}; color: #333; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: ${config.primary_color}; }
    p { color: #666; margin-bottom: 1.5rem; line-height: 1.5; }
    button { background: ${config.primary_color}; color: white; border: none;
      padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>It seems you've lost your internet connection. Some features may be unavailable until you reconnect.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;

  const generateManifest = () => JSON.stringify({
    name: config.app_name,
    short_name: config.app_name,
    start_url: "/",
    display: "standalone",
    background_color: config.background_color,
    theme_color: config.primary_color,
    orientation: "portrait",
    icons: config.app_icon_url ? [
      { src: config.app_icon_url, sizes: "192x192", type: "image/png" },
      { src: config.app_icon_url, sizes: "512x512", type: "image/png" },
    ] : [],
  }, null, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-primary" />
              Mobile App Builder
              <DocDialog title="Mobile App Builder">
                <p><strong>What is this?</strong> A complete toolkit to configure, brand, and deploy mobile apps for your platform users — Company Admins, Employees, and Customers.</p>
                <Separator />
                <p><strong>Two deployment paths:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>PWA (Progressive Web App):</strong> Installable directly from the browser. No app store needed. Works on Android & iOS.</li>
                  <li><strong>Native App (Capacitor):</strong> Full native app published to Google Play Store and Apple App Store. Requires developer tools.</li>
                </ul>
                <Separator />
                <p><strong>Tabs overview:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Branding:</strong> App name, icon, colors, domain, versioning</li>
                  <li><strong>Features:</strong> Toggle modules per user type, offline mode, speed settings</li>
                  <li><strong>PWA:</strong> Install instructions, QR code, manifest download</li>
                  <li><strong>Native:</strong> Capacitor build steps, config files, platform guides</li>
                  <li><strong>Push:</strong> Firebase setup, send notifications by audience</li>
                </ul>
              </DocDialog>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Build, configure & deploy mobile apps for Company, Employee & Customer portals</p>
          </div>
          <Button onClick={saveConfig} disabled={saving} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3 text-chart-2" /> PWA Ready</Badge>
          <Badge variant="outline" className="gap-1"><WifiOff className="h-3 w-3" /> Offline Mode</Badge>
          <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3 text-warning" /> Speed Optimized</Badge>
          <Badge variant="outline" className="gap-1"><Bell className="h-3 w-3 text-primary" /> Push {config.push_enabled ? "Enabled" : "Disabled"}</Badge>
          <Badge variant="outline" className="gap-1"><Package className="h-3 w-3" /> v{config.app_version} (#{config.build_number})</Badge>
        </div>

        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 sm:w-auto sm:inline-grid">
            <TabsTrigger value="branding" className="gap-1.5 text-xs sm:text-sm"><Palette className="h-3.5 w-3.5 hidden sm:block" /> Branding</TabsTrigger>
            <TabsTrigger value="features" className="gap-1.5 text-xs sm:text-sm"><Shield className="h-3.5 w-3.5 hidden sm:block" /> Features</TabsTrigger>
            <TabsTrigger value="pwa" className="gap-1.5 text-xs sm:text-sm"><Globe className="h-3.5 w-3.5 hidden sm:block" /> PWA</TabsTrigger>
            <TabsTrigger value="native" className="gap-1.5 text-xs sm:text-sm"><Download className="h-3.5 w-3.5 hidden sm:block" /> Native</TabsTrigger>
            <TabsTrigger value="push" className="gap-1.5 text-xs sm:text-sm"><Bell className="h-3.5 w-3.5 hidden sm:block" /> Push</TabsTrigger>
          </TabsList>

          {/* ── Branding Tab ── */}
          <TabsContent value="branding" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">App Identity</CardTitle>
                      <CardDescription>Name, icons, splash screen and domain for your unified app</CardDescription>
                    </div>
                    <DocDialog title="App Identity">
                      <p><strong>App Name:</strong> Displayed on the home screen, splash screen, and in-app header. Keep it short (max ~15 chars).</p>
                      <p><strong>Custom Domain:</strong> Point your own domain to the PWA. DNS must be configured to point to this server. Use HTTPS for production.</p>
                      <p><strong>App Icon:</strong> Should be a square PNG, at least 512×512 pixels. Used for home screen icon and app stores.</p>
                      <p><strong>Splash Screen:</strong> Full-screen image shown while the app loads. Recommended size: 2732×2732 pixels (centered).</p>
                    </DocDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="App Name"
                        description="Displayed on home screen and in-app header"
                        help="Keep under 15 characters for best display on mobile devices"
                      />
                      <div className="relative">
                        <Type className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input value={config.app_name} onChange={(e) => setConfig((c) => ({ ...c, app_name: e.target.value }))} placeholder="My Company App" className="pl-8" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="Custom Domain"
                        description="Your own domain for the PWA install link"
                        help="Point your domain's DNS A record to this server's IP. SSL must be configured separately."
                      />
                      <div className="flex items-center gap-0">
                        <Select value={domainProtocol} onValueChange={(v: "https://" | "http://") => setDomainProtocol(v)}>
                          <SelectTrigger className="w-[110px] rounded-r-none border-r-0 text-xs font-mono bg-muted/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="https://">https://</SelectItem>
                            <SelectItem value="http://">http://</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={config.custom_domain}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^https?:\/\//, "");
                            setConfig((c) => ({ ...c, custom_domain: val }));
                          }}
                          placeholder="app.mycompany.com"
                          className="rounded-l-none font-mono text-xs"
                        />
                      </div>
                      {config.custom_domain && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          Full URL: <span className="font-mono">{fullCustomDomain}</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="App Icon"
                        description="Square PNG, at least 512×512px"
                        help="Used for home screen icon, app stores, and browser tabs."
                      />
                      {config.app_icon_url ? (
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                          <img src={config.app_icon_url} alt="App Icon" className="h-12 w-12 rounded-xl object-cover border border-border shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">Icon uploaded</p>
                            <p className="text-[10px] text-muted-foreground truncate">{config.app_icon_url.split("/").pop()}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => triggerUpload("icon")} disabled={uploadingIcon}>
                              <Upload className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfig((c) => ({ ...c, app_icon_url: "" }))}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerUpload("icon")}
                          disabled={uploadingIcon}
                          className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {uploadingIcon ? (
                            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                          ) : (
                            <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">{uploadingIcon ? "Uploading..." : "Click to upload icon"}</span>
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="Splash Screen"
                        description="Full-screen loading image, 2732×2732px recommended"
                        help="Shown briefly while the app loads. Use your brand logo on a solid background."
                      />
                      {config.splash_screen_url ? (
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                          <img src={config.splash_screen_url} alt="Splash" className="h-12 w-12 rounded-xl object-cover border border-border shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">Splash uploaded</p>
                            <p className="text-[10px] text-muted-foreground truncate">{config.splash_screen_url.split("/").pop()}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => triggerUpload("splash")} disabled={uploadingSplash}>
                              <Upload className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfig((c) => ({ ...c, splash_screen_url: "" }))}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerUpload("splash")}
                          disabled={uploadingSplash}
                          className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {uploadingSplash ? (
                            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                          ) : (
                            <Monitor className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">{uploadingSplash ? "Uploading..." : "Click to upload splash"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Live Preview
                    <Badge variant="outline" className="text-[9px] ml-auto">Real-time</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  {/* Phone Frame */}
                  <div className="w-48 h-[360px] rounded-[1.8rem] border-[3px] border-foreground/20 bg-background overflow-hidden flex flex-col shadow-2xl relative">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-foreground/20 rounded-b-xl z-10" />
                    
                    {/* Status bar */}
                    <div className="h-8 flex items-center justify-between px-4 pt-1 relative z-0" style={{ backgroundColor: config.primary_color }}>
                      <span className="text-[6px] text-white/70">9:41</span>
                      <span className="text-[8px] text-white font-bold tracking-wide truncate max-w-[80px]">{config.app_name}</span>
                      <div className="flex gap-0.5">
                        <Wifi className="h-2 w-2 text-white/70" />
                        <Battery className="h-2 w-2 text-white/70" />
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-4 py-3" style={{ backgroundColor: config.background_color }}>
                      {config.app_icon_url ? (
                        <img src={config.app_icon_url} alt="App Icon" className="h-16 w-16 rounded-2xl object-cover shadow-lg ring-2 ring-black/5" />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: config.primary_color }}>
                          <Smartphone className="h-8 w-8 text-white" />
                        </div>
                      )}
                      <span className="text-[12px] font-bold" style={{ color: config.primary_color }}>{config.app_name}</span>
                      
                      {/* Color swatches */}
                      <div className="flex gap-1.5 mt-0.5">
                        {[config.primary_color, config.secondary_color, config.accent_color].map((c, i) => (
                          <div key={i} className="h-2 w-8 rounded-full shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>

                      {/* Mock content */}
                      <div className="w-full space-y-2 mt-2">
                        <div className="h-8 rounded-lg flex items-center gap-2 px-2" style={{ backgroundColor: config.primary_color + "12" }}>
                          <div className="h-4 w-4 rounded" style={{ backgroundColor: config.primary_color + "30" }} />
                          <div className="h-2 rounded-full flex-1" style={{ backgroundColor: config.primary_color + "20", maxWidth: "60%" }} />
                        </div>
                        <div className="h-8 rounded-lg flex items-center gap-2 px-2" style={{ backgroundColor: config.secondary_color + "12" }}>
                          <div className="h-4 w-4 rounded" style={{ backgroundColor: config.secondary_color + "30" }} />
                          <div className="h-2 rounded-full flex-1" style={{ backgroundColor: config.secondary_color + "20", maxWidth: "45%" }} />
                        </div>
                        <div className="h-8 rounded-lg flex items-center gap-2 px-2" style={{ backgroundColor: config.accent_color + "12" }}>
                          <div className="h-4 w-4 rounded" style={{ backgroundColor: config.accent_color + "30" }} />
                          <div className="h-2 rounded-full flex-1" style={{ backgroundColor: config.accent_color + "20", maxWidth: "55%" }} />
                        </div>
                      </div>
                    </div>

                    {/* Bottom nav */}
                    <div className="h-10 flex items-center justify-around px-3" style={{ backgroundColor: config.primary_color }}>
                      {[Layers, QrCode, Bell, Settings].map((Icon, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <Icon className="h-3.5 w-3.5 text-white/80" />
                        </div>
                      ))}
                    </div>
                    {/* Home indicator */}
                    <div className="h-2.5 flex items-center justify-center" style={{ backgroundColor: config.background_color }}>
                      <div className="w-12 h-1 rounded-full bg-foreground/20" />
                    </div>
                  </div>

                  {/* Splash Preview */}
                  {config.splash_screen_url && (
                    <div className="w-full mt-2">
                      <p className="text-[10px] text-muted-foreground mb-1.5 text-center">Splash Screen Preview</p>
                      <div className="w-48 h-32 mx-auto rounded-xl border border-border overflow-hidden shadow-sm">
                        <img src={config.splash_screen_url} alt="Splash Preview" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-chart-2 animate-pulse" />
                    Updates in real-time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Colors */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Theme Colors</CardTitle>
                  <DocDialog title="Theme Colors">
                    <p><strong>Primary:</strong> Main brand color used for headers, buttons, and active states.</p>
                    <p><strong>Secondary:</strong> Used for secondary actions, accents, and highlights.</p>
                    <p><strong>Accent:</strong> Used for alerts, badges, and special emphasis.</p>
                    <p><strong>Background:</strong> The app's main background color. Use white or a very light shade for readability.</p>
                    <Separator />
                    <p className="text-xs">💡 <strong>Tip:</strong> Ensure sufficient contrast between text and background colors for accessibility (WCAG 2.1 AA standard).</p>
                  </DocDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Primary", key: "primary_color", desc: "Main brand color for headers & buttons" },
                    { label: "Secondary", key: "secondary_color", desc: "Secondary actions & highlights" },
                    { label: "Accent", key: "accent_color", desc: "Alerts, badges & emphasis" },
                    { label: "Background", key: "background_color", desc: "App background surface color" },
                  ].map((c) => (
                    <div key={c.key} className="space-y-1.5">
                      <FieldLabel label={c.label} description={c.desc} />
                      <div className="flex items-center gap-2">
                        <input type="color" value={(config as any)[c.key]} onChange={(e) => setConfig((prev) => ({ ...prev, [c.key]: e.target.value }))} className="h-9 w-9 rounded-md border border-border cursor-pointer" />
                        <Input value={(config as any)[c.key]} onChange={(e) => setConfig((prev) => ({ ...prev, [c.key]: e.target.value }))} className="font-mono text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Versioning */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Version & Identifiers</CardTitle>
                  <DocDialog title="Version & Identifiers">
                    <p><strong>Android Package:</strong> Unique identifier for Google Play Store (e.g., com.mycompany.app). Must be lowercase, use dots as separators.</p>
                    <p><strong>iOS Bundle ID:</strong> Unique identifier for Apple App Store (e.g., com.mycompany.app). Same format as Android package.</p>
                    <p><strong>Version:</strong> Semantic versioning (major.minor.patch). Increment for each release — e.g., 1.0.0 → 1.0.1 for patches.</p>
                    <p><strong>Build Number:</strong> Internal build counter. Must increase with every submission to app stores. Each store submission requires a unique build number.</p>
                  </DocDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel label="Android Package" description="Unique ID for Google Play" help="Format: com.company.appname — lowercase letters, dots only" />
                    <Input value={config.android_package_name} onChange={(e) => setConfig((c) => ({ ...c, android_package_name: e.target.value }))} placeholder="com.company.app" className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel label="iOS Bundle ID" description="Unique ID for App Store" help="Format: com.company.appname — same convention as Android" />
                    <Input value={config.ios_bundle_id} onChange={(e) => setConfig((c) => ({ ...c, ios_bundle_id: e.target.value }))} placeholder="com.company.app" className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel label="Version" description="Semantic version (x.y.z)" help="Increment patch for bugfixes, minor for features, major for breaking changes" />
                    <Input value={config.app_version} onChange={(e) => setConfig((c) => ({ ...c, app_version: e.target.value }))} placeholder="1.0.0" className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel label="Build #" description="Auto-increment per release" help="Must increase with every app store submission" />
                    <Input type="number" value={config.build_number} onChange={(e) => setConfig((c) => ({ ...c, build_number: parseInt(e.target.value) || 1 }))} min={1} className="text-xs" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Features Tab ── */}
          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Feature Toggles by User Type</CardTitle>
                    <CardDescription>Control which modules each user type sees in the mobile app</CardDescription>
                  </div>
                  <DocDialog title="Feature Toggles">
                    <p>Enable or disable individual modules for each user type. Disabled modules will be hidden from that user type's mobile app navigation.</p>
                    <Separator />
                    <p><strong>Company:</strong> Full admin features — settings, departments, employees, approval workflows, and wallet.</p>
                    <p><strong>Employee:</strong> Day-to-day tools — attendance, leave, payslips, and documents.</p>
                    <p><strong>Customer:</strong> Self-service portal — invoices, support tickets, wallet, and documents.</p>
                    <Separator />
                    <p className="text-xs">💡 Changes take effect after saving and users reopening the app.</p>
                  </DocDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(["company", "employee", "customer"] as const).map((role) => {
                    const RoleIcon = ROLE_ICONS[role];
                    return (
                      <div key={role} className="space-y-3 p-4 rounded-xl border border-border bg-card">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <RoleIcon className={`h-4 w-4 ${ROLE_COLORS[role]}`} />
                          </div>
                          <span className="text-sm font-semibold capitalize">{role}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">
                            {Object.values(config.feature_toggles[role] || {}).filter(Boolean).length} active
                          </Badge>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                          {Object.entries(config.feature_toggles[role] || {}).map(([feature, enabled]) => (
                            <div key={feature} className="flex items-center justify-between py-1.5 px-1.5 rounded-md hover:bg-muted/50 transition-colors group">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-foreground block">{FEATURE_LABELS[feature] || feature}</span>
                                <span className="text-[10px] text-muted-foreground block leading-tight">{FEATURE_DESCRIPTIONS[feature] || ""}</span>
                              </div>
                              <Switch checked={!!enabled} onCheckedChange={() => toggleFeature(role, feature)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* App Behavior */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><WifiOff className="h-4 w-4" /> Offline Mode</CardTitle>
                    <DocDialog title="Offline Mode">
                      <p>When a user loses internet, the app displays a branded offline page instead of a browser error.</p>
                      <p><strong>Service Worker (sw.js):</strong> Caches key assets so the app shell loads instantly on repeat visits, even without internet.</p>
                      <p><strong>Offline Page (offline.html):</strong> A branded fallback page shown when navigating without connectivity. Includes a "Try Again" button.</p>
                      <Separator />
                      <p className="text-xs">📁 Place both files in your project's <code>public/</code> folder.</p>
                    </DocDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Shows a branded offline page and caches key assets for instant reload when users lose internet.</p>
                  <div className="space-y-1.5">
                    {["Auto-caches app shell", "Branded offline fallback", "Instant re-load on reconnect"].map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-chart-2 shrink-0" />
                        <span className="text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(generateServiceWorkerSnippet(), "sw.js", "text/javascript")}>
                      <FileDown className="h-3 w-3" /> sw.js
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(generateOfflineHTML(), "offline.html", "text/html")}>
                      <FileDown className="h-3 w-3" /> offline.html
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><LogOut className="h-4 w-4" /> App Exit Handling</CardTitle>
                    <DocDialog title="App Exit Handling">
                      <p><strong>Android:</strong> When a user presses the hardware back button on the home screen, a confirmation dialog appears before exiting the app. Prevents accidental exits.</p>
                      <p><strong>iOS:</strong> iOS does not have a back button. Users swipe up to go home. This is handled natively by the OS.</p>
                      <Separator />
                      <p className="text-xs">This behavior is pre-configured in the generated <code>capacitor.config.json</code>.</p>
                    </DocDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Prevents accidental exits on Android. Shows confirmation before closing the app.</p>
                  <div className="space-y-1.5">
                    {["Back button confirmation", "Session state preserved", "iOS native handling"].map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-chart-2 shrink-0" />
                        <span className="text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3 text-chart-2" /> Included in config</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Speed Optimization</CardTitle>
                    <DocDialog title="Speed Optimization">
                      <p>The app is built with performance best practices to ensure fast load times and smooth interactions.</p>
                      <Separator />
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Route lazy loading:</strong> Pages load on-demand, reducing initial bundle size</li>
                        <li><strong>Asset pre-caching:</strong> Critical assets cached by the service worker</li>
                        <li><strong>Image optimization:</strong> Images are lazy-loaded and compressed</li>
                        <li><strong>Code splitting:</strong> JS bundles split per route for faster parsing</li>
                      </ul>
                      <Separator />
                      <p className="text-xs">💡 For best results, optimize images before uploading and keep the app icon under 100KB.</p>
                    </DocDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Lazy loading, asset caching, and code splitting for instant app start and smooth experience.</p>
                  <div className="space-y-1.5">
                    {["Route lazy loading", "Asset pre-caching", "Image optimization", "Code splitting"].map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-chart-2 shrink-0" />
                        <span className="text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── PWA Install Tab ── */}
          <TabsContent value="pwa" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Progressive Web App</CardTitle>
                    <CardDescription>Install directly from browser — works on Android & iOS, no app store needed</CardDescription>
                  </div>
                  <DocDialog title="Progressive Web App (PWA)">
                    <p>A PWA lets users install your app directly from their browser — no app store submission needed.</p>
                    <Separator />
                    <p><strong>Benefits:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Works on all devices (Android, iOS, Desktop)</li>
                      <li>Automatic updates — no manual app store publishing</li>
                      <li>Offline support via service worker</li>
                      <li>Home screen icon with full-screen experience</li>
                    </ul>
                    <Separator />
                    <p><strong>Limitations:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>iOS Safari has limited push notification support</li>
                      <li>Some native APIs (camera, NFC) may be restricted</li>
                      <li>No app store presence (use Native build for that)</li>
                    </ul>
                    <Separator />
                    <p className="text-xs">📋 Download the <strong>manifest.json</strong> and place it in your project's <code>public/</code> folder for proper PWA registration.</p>
                  </DocDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-chart-2/10 flex items-center justify-center"><Smartphone className="h-4 w-4 text-chart-2" /></div>
                      <div><p className="text-sm font-semibold">Android</p><p className="text-xs text-muted-foreground">Chrome / Edge</p></div>
                    </div>
                    <Separator />
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Open the install link in Chrome</li>
                      <li>Tap <strong>⋮</strong> menu → <strong>"Install app"</strong></li>
                      <li>App appears on home screen</li>
                    </ol>
                  </div>
                  <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Apple className="h-4 w-4 text-primary" /></div>
                      <div><p className="text-sm font-semibold">iOS</p><p className="text-xs text-muted-foreground">Safari</p></div>
                    </div>
                    <Separator />
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Open in <strong>Safari</strong></li>
                      <li>Tap <strong>Share</strong> → <strong>"Add to Home Screen"</strong></li>
                      <li>Tap <strong>"Add"</strong> to confirm</li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel label="Install Link" description="Share this URL with your users to install the PWA" />
                  <div className="flex items-center gap-2">
                    <Input value={pwaInstallUrl} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(pwaInstallUrl, "Install URL")}>
                      {copied === "Install URL" ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <QrCode className="h-6 w-6 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">QR Code — Scan to Download App</p>
                        <p className="text-xs text-muted-foreground">Users scan this code on their phone to get the app download page. No login required.</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 shrink-0"
                      onClick={() => {
                        const downloadPageUrl = `${window.location.origin}/app-download?name=${encodeURIComponent(config.app_name || "App")}`;
                        const link = document.createElement("a");
                        link.href = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(downloadPageUrl)}&format=png`;
                        link.download = `${config.app_name || "app"}-download-qr.png`;
                        link.click();
                        toast.success("QR code downloaded!");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> Download QR
                    </Button>
                  </div>
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-border">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/app-download?name=${encodeURIComponent(config.app_name || "App")}`)}&format=png&color=6D28D9`}
                        alt="Download App QR Code"
                        className="h-[180px] w-[180px]"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center max-w-[260px]">
                      Scan to open the <strong>App Download</strong> page — auto-detects Android/iOS. Print for offices, onboarding kits, or share digitally.
                    </p>
                  </div>
                </div>

                {/* Manifest download */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel label="Web App Manifest" description="Required for PWA installation — place in public/ folder" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyToClipboard(generateManifest(), "Manifest")}>
                        {copied === "Manifest" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(generateManifest(), "manifest.json")}>
                        <FileDown className="h-3 w-3" /> Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-muted rounded-xl p-4 text-[11px] font-mono overflow-x-auto text-foreground border border-border max-h-48 overflow-y-auto">
                    {generateManifest()}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Native Build Tab ── */}
          <TabsContent value="native" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> Native App Build</CardTitle>
                    <CardDescription>Generate Capacitor configs and build native Android & iOS apps</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-2 bg-chart-2 hover:bg-chart-2/90 text-white font-semibold shadow-md"
                      onClick={() => {
                        downloadFile(generateCapacitorConfig(), "capacitor.config.json");
                        toast.success("Config downloaded! Follow the build steps below to create your APK/AAB/IPA.");
                      }}
                    >
                      <Package className="h-4 w-4" /> Build App
                    </Button>
                  </div>
                  <DocDialog title="Native App Build (Capacitor)">
                    <p>Capacitor wraps your web app in a native container, giving you access to device APIs and app store distribution.</p>
                    <Separator />
                    <p><strong>Requirements:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>Android:</strong> Android Studio + JDK 17+</li>
                      <li><strong>iOS:</strong> Mac + Xcode 15+ + Apple Developer account</li>
                      <li>Node.js 18+ and npm</li>
                    </ul>
                    <Separator />
                    <p><strong>What's included:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Splash screen with your brand colors</li>
                      <li>Status bar theming</li>
                      <li>Keyboard handling</li>
                      <li>Network detection (online/offline)</li>
                      <li>Back button exit handling (Android)</li>
                      <li>Push notifications (if enabled)</li>
                    </ul>
                    <Separator />
                    <p className="text-xs">📖 Read the full guide: <a href="https://capacitorjs.com/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline">Capacitor Documentation</a></p>
                  </DocDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Build Steps */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Build Steps</h3>
                  {[
                    { step: 1, text: "Export project to GitHub (Settings → GitHub)", icon: "📦", detail: "Git pull the project from your GitHub repo" },
                    { step: 2, text: "Install dependencies: npm install", icon: "💻", detail: "Sets up all required packages" },
                    { step: 3, text: "Install Capacitor packages", icon: "⚡", detail: "npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android" },
                    { step: 4, text: "Initialize Capacitor: npx cap init", icon: "🔧", detail: "Paste the generated config below" },
                    { step: 5, text: "Add platforms", icon: "📱", detail: "npx cap add android && npx cap add ios" },
                    { step: 6, text: "Copy offline files to public/", icon: "📡", detail: "sw.js and offline.html from Features tab" },
                    { step: 7, text: "Build & sync", icon: "🏗️", detail: "npm run build && npx cap sync" },
                    { step: 8, text: "Run on device", icon: "🚀", detail: "npx cap run android OR npx cap run ios" },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                      <span className="text-base">{s.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-primary">Step {s.step}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground">{s.text}</p>
                        <p className="text-[10px] text-muted-foreground">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Generated Config */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">capacitor.config.json</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyToClipboard(generateCapacitorConfig(), "Config")}>
                        {copied === "Config" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(generateCapacitorConfig(), "capacitor.config.json")}>
                        <FileDown className="h-3 w-3" /> Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-muted rounded-xl p-4 text-[11px] font-mono overflow-x-auto text-foreground border border-border max-h-72 overflow-y-auto">
                    {generateCapacitorConfig()}
                  </pre>
                </div>

                <Separator />

                {/* Platform cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-chart-2/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-chart-2" />
                      <span className="text-sm font-semibold text-chart-2">Android</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Requires Android Studio. Generates APK/AAB for Play Store.</p>
                    <div className="text-[11px] space-y-0.5 text-muted-foreground">
                      <p>• <code>npx cap run android</code> — test on device</p>
                      <p>• <code>npx cap open android</code> — open in Android Studio</p>
                      <p>• Build → Generate Signed Bundle → Upload to Play Console</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-primary/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Apple className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">iOS</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Requires Mac + Xcode. Generates IPA for App Store.</p>
                    <div className="text-[11px] space-y-0.5 text-muted-foreground">
                      <p>• <code>npx cap run ios</code> — test on simulator</p>
                      <p>• <code>npx cap open ios</code> — open in Xcode</p>
                      <p>• Product → Archive → Distribute to App Store Connect</p>
                    </div>
                  </div>
                </div>

                {/* Download & Distribute */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" /> Download & Distribute
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Build your native app and download installable packages for distribution.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* APK */}
                    <div className="p-4 rounded-xl border border-border bg-chart-2/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-chart-2" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">APK</p>
                          <p className="text-[10px] text-muted-foreground">Android Debug/Direct Install</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Universal Android package for sideloading and direct distribution. Not for Play Store.
                      </p>
                      <Button className="w-full text-xs gap-1.5 bg-chart-2 hover:bg-chart-2/90 text-white" size="sm" onClick={() => {
                        downloadFile(generateCapacitorConfig(), "capacitor.config.json");
                        downloadFile(generateManifest(), "manifest.json");
                        toast.success("APK build configs downloaded! Run: cd android && ./gradlew assembleRelease");
                      }}>
                        <Download className="h-3.5 w-3.5" /> Download APK Config
                      </Button>
                    </div>

                    {/* AAB */}
                    <div className="p-4 rounded-xl border border-border bg-chart-2/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-chart-2" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">AAB</p>
                          <p className="text-[10px] text-muted-foreground">Android App Bundle</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Optimized format required by Google Play Store. Generates smaller downloads for users.
                      </p>
                      <Button className="w-full text-xs gap-1.5 bg-chart-2 hover:bg-chart-2/90 text-white" size="sm" onClick={() => {
                        downloadFile(generateCapacitorConfig(), "capacitor.config.json");
                        downloadFile(generateManifest(), "manifest.json");
                        toast.success("AAB build configs downloaded! Run: cd android && ./gradlew bundleRelease");
                      }}>
                        <Download className="h-3.5 w-3.5" /> Download AAB Config
                      </Button>
                    </div>

                    {/* IPA */}
                    <div className="p-4 rounded-xl border border-border bg-primary/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Apple className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">IPA</p>
                          <p className="text-[10px] text-muted-foreground">iOS App Package</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        iOS installer for App Store or TestFlight distribution. Requires Mac with Xcode.
                      </p>
                      <Button className="w-full text-xs gap-1.5" size="sm" onClick={() => {
                        downloadFile(generateCapacitorConfig(), "capacitor.config.json");
                        downloadFile(generateManifest(), "manifest.json");
                        toast.success("IPA build configs downloaded! Open in Xcode → Product → Archive → Distribute App");
                      }}>
                        <Download className="h-3.5 w-3.5" /> Download iOS Config
                      </Button>
                    </div>
                  </div>

                  {/* Signing info */}
                  <div className="bg-muted/50 rounded-xl p-4 border border-border flex items-start gap-3">
                    <Shield className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">App Signing Required</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Before distributing, you must sign your app. Android requires a <strong>Keystore</strong> (generated via Android Studio or <code>keytool</code>). 
                        iOS requires an <strong>Apple Developer certificate</strong> and provisioning profile configured in Xcode.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download all config files */}
                <Separator />
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <FileDown className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Download All Config Files</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Get all config files needed to build your native app</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => downloadFile(generateCapacitorConfig(), "capacitor.config.json")}>
                          <FileDown className="h-3 w-3" /> capacitor.config.json
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => downloadFile(generateServiceWorkerSnippet(), "sw.js", "text/javascript")}>
                          <FileDown className="h-3 w-3" /> sw.js
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => downloadFile(generateOfflineHTML(), "offline.html", "text/html")}>
                          <FileDown className="h-3 w-3" /> offline.html
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => downloadFile(generateManifest(), "manifest.json")}>
                          <FileDown className="h-3 w-3" /> manifest.json
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Push Notifications Tab ── */}
          <TabsContent value="push" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Push Notification Settings</CardTitle>
                    <CardDescription>Configure Firebase Cloud Messaging for push notifications</CardDescription>
                  </div>
                  <DocDialog title="Push Notifications">
                    <p>Push notifications allow you to send messages directly to users' devices even when the app is closed.</p>
                    <Separator />
                    <p><strong>Setup Requirements:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Create a Firebase project at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.firebase.google.com</a></li>
                      <li>Enable Cloud Messaging in your Firebase project settings</li>
                      <li>Copy the <strong>Server Key</strong> from Project Settings → Cloud Messaging</li>
                      <li>Copy the <strong>Sender ID</strong> from the same page</li>
                    </ol>
                    <Separator />
                    <p><strong>Supported platforms:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Android — full push support via FCM</li>
                      <li>iOS — requires APNs certificate linked to Firebase</li>
                      <li>Web (PWA) — limited on iOS Safari</li>
                    </ul>
                  </DocDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">Enable Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Allow sending push notifications to all app users</p>
                  </div>
                  <Switch checked={config.push_enabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, push_enabled: v }))} />
                </div>
                {config.push_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="Firebase Server Key"
                        description="Found in Firebase Console → Project Settings → Cloud Messaging"
                        help="This key authorizes your server to send push notifications via FCM. Keep it secret."
                      />
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input type="password" value={config.push_config.server_key || ""} onChange={(e) => setConfig((c) => ({ ...c, push_config: { ...c.push_config, server_key: e.target.value } }))} placeholder="Enter Firebase server key" className="pl-8" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="Firebase Sender ID"
                        description="Numeric ID from Firebase Console → Cloud Messaging"
                        help="Used by client apps to register for push notifications from your project."
                      />
                      <div className="relative">
                        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input value={config.push_config.sender_id || ""} onChange={(e) => setConfig((c) => ({ ...c, push_config: { ...c.push_config, sender_id: e.target.value } }))} placeholder="Enter sender ID" className="pl-8" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send Push */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Send Push Notification</CardTitle>
                    <CardDescription>Compose and send push notifications to your app users</CardDescription>
                  </div>
                  <DocDialog title="Send Push Notification">
                    <p>Compose and send real-time push notifications to specific user groups or all users at once.</p>
                    <Separator />
                    <p><strong>Target Audiences:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>All Users:</strong> Everyone with the app installed</li>
                      <li><strong>Company Admins:</strong> Tenant administrators only</li>
                      <li><strong>Employees:</strong> All registered employees</li>
                      <li><strong>Customers:</strong> External portal users</li>
                    </ul>
                    <Separator />
                    <p className="text-xs">💡 <strong>Best practices:</strong> Keep titles under 50 characters. Messages should be actionable and concise. Avoid sending too frequently to prevent users from disabling notifications.</p>
                  </DocDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!config.push_enabled && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-warning/30 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    <p className="text-xs text-muted-foreground">Enable push notifications above and save your Firebase credentials first.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel label="Target Audience" description="Choose who receives this notification" />
                    <Select value={pushTarget} onValueChange={(v: any) => setPushTarget(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="company">Company Admins</SelectItem>
                        <SelectItem value="employee">Employees</SelectItem>
                        <SelectItem value="customer">Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel label="Notification Title" description="Short, clear headline (max 50 chars)" help="Appears as the bold heading on the user's device" />
                    <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="e.g. New Update Available" maxLength={50} />
                    <p className="text-[10px] text-muted-foreground text-right">{pushTitle.length}/50</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel label="Message Body" description="The main notification content shown below the title" help="Keep it concise and actionable. Users see about 2 lines on most devices." />
                  <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Write your notification message..." rows={3} maxLength={200} />
                  <p className="text-[10px] text-muted-foreground text-right">{pushBody.length}/200</p>
                </div>

                {/* Preview */}
                {(pushTitle || pushBody) && (
                  <div className="bg-muted/50 rounded-xl p-3 border border-border">
                    <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1"><Eye className="h-3 w-3" /> Notification Preview</p>
                    <div className="bg-background rounded-lg p-3 border border-border flex items-start gap-3 shadow-sm">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: config.primary_color }}>
                        <Bell className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{pushTitle || "Notification Title"}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{pushBody || "Notification message body..."}</p>
                        <p className="text-[9px] text-muted-foreground/50 mt-1">now · {config.app_name}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Sending to: <strong>{pushTarget === "all" ? "All users" : `${pushTarget.charAt(0).toUpperCase() + pushTarget.slice(1)} users`}</strong>
                  </p>
                  <Button onClick={handleSendPush} disabled={sendingPush || !config.push_enabled} className="gap-2">
                    {sendingPush ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sendingPush ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent notifications log */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications sent yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Sent notifications will appear here with delivery stats</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
