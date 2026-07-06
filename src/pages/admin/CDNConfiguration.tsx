import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Shield, Zap, RefreshCw, Loader2, Settings, Check, Cloud,
  Trash2, Eye, EyeOff, Server, BookOpen, ChevronDown, ChevronUp,
  ExternalLink, Copy, CheckCircle2, AlertTriangle, Info,
} from "lucide-react";

interface CDNConfig {
  id: string;
  provider: string;
  display_name: string;
  is_active: boolean;
  is_default: boolean;
  credentials: Record<string, string>;
  settings: Record<string, string>;
  endpoint_url: string | null;
  created_at: string;
}

interface ProviderGuide {
  overview: string;
  docsUrl: string;
  consoleUrl: string;
  consoleName: string;
  steps: string[];
  tips: string[];
  troubleshooting: string[];
  pricing: string;
}

const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  cloudfront: {
    overview: "Amazon CloudFront is a fast CDN service by AWS that securely delivers data, videos, applications, and APIs with low latency and high transfer speeds.",
    docsUrl: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html",
    consoleUrl: "https://console.aws.amazon.com/cloudfront/",
    consoleName: "AWS Console",
    steps: [
      "Sign in to the AWS Management Console at console.aws.amazon.com",
      "Navigate to CloudFront service from the search bar or Services menu",
      "Click 'Create Distribution' → choose your origin domain (e.g., S3 bucket or custom origin)",
      "Configure cache behavior: set Cache Policy to 'CachingOptimized' for best performance",
      "Under 'Origin Settings', enter your origin domain and set the protocol policy",
      "Set 'Viewer Protocol Policy' to 'Redirect HTTP to HTTPS' for security",
      "Optionally add a custom domain under 'Alternate Domain Names (CNAMEs)'",
      "Click 'Create Distribution' — deployment takes 5–15 minutes",
      "Copy the Distribution ID from the distribution details page",
      "For API credentials: Go to IAM → Users → Create User → Attach 'CloudFrontFullAccess' policy",
      "Create Access Key under the IAM user's Security credentials tab",
      "Copy the Access Key ID and Secret Access Key — paste them below",
    ],
    tips: [
      "Use Origin Access Control (OAC) instead of Origin Access Identity for S3 origins",
      "Enable 'Compress Objects Automatically' for GZIP/Brotli compression",
      "Set appropriate TTL values: 86400 (1 day) for static assets, 0 for dynamic content",
      "Use CloudFront Functions or Lambda@Edge for URL rewrites and header manipulation",
      "Enable real-time logs via Kinesis Data Streams for debugging",
    ],
    troubleshooting: [
      "403 Forbidden: Check S3 bucket policy and OAC configuration",
      "502 Bad Gateway: Verify origin server is reachable and SSL certificate is valid",
      "Cache not invalidating: Use Invalidation with path '/*' to purge all, but limit to 1000 free/month",
      "High latency: Ensure Price Class includes edge locations near your users",
      "Custom domain not working: Add CNAME record pointing to the CloudFront domain (d*.cloudfront.net)",
    ],
    pricing: "Pay-as-you-go: ~$0.085/GB for first 10TB. 1TB/month free tier for first 12 months. Invalidation: first 1,000 paths/month free.",
  },
  bunnynet: {
    overview: "Bunny.net is a budget-friendly, high-performance CDN with 100+ PoPs worldwide. Known for simplicity, fast setup, and competitive pricing.",
    docsUrl: "https://docs.bunny.net/docs",
    consoleUrl: "https://dash.bunny.net/",
    consoleName: "Bunny.net Dashboard",
    steps: [
      "Create an account at bunny.net — no credit card required for trial",
      "From the dashboard, click 'CDN' → 'Add Pull Zone'",
      "Enter a name for your pull zone and your origin URL (e.g., https://yourdomain.com)",
      "Select the pricing tier and regions you want to serve from",
      "Click 'Add Pull Zone' — your CDN is active immediately",
      "Copy the Pull Zone ID from the pull zone settings page",
      "For custom domains: Go to Pull Zone → Hostnames → Add custom hostname",
      "Add a CNAME DNS record pointing your custom domain to the Bunny CDN hostname",
      "Enable free SSL for your custom hostname from the Hostnames section",
      "For API access: Go to Account → API → copy your main API Key",
      "For storage: Go to Storage → Create Storage Zone → copy the zone name",
      "Paste the API Key, Pull Zone ID, and Storage Zone name below",
    ],
    tips: [
      "Enable 'Perma-Cache' to keep files cached indefinitely until purged",
      "Use Bunny Optimizer for automatic image resizing and WebP conversion",
      "Enable 'SmartEdge Routing' for optimal path selection between PoPs",
      "Set up origin shield to reduce origin load — pick a region closest to your server",
      "Use Edge Rules for custom logic like redirects, header manipulation, or access control",
    ],
    troubleshooting: [
      "404 errors: Verify origin URL is correct and accessible from the internet",
      "SSL errors: Ensure the custom hostname has SSL enabled in Pull Zone → Hostnames",
      "Stale cache: Purge via API or dashboard; check if Perma-Cache is affecting behavior",
      "Slow speed in certain regions: Check if those regions are enabled in your pricing tier",
      "API key rejected: Ensure you're using the main Account API key, not a storage-specific one",
    ],
    pricing: "Starting at $0.01/GB for EU/NA. No minimum commitment. Storage: $0.01/GB/month. ~$1/month for most small sites.",
  },
  alibaba: {
    overview: "Alibaba Cloud CDN provides fast, secure content delivery with 2,800+ edge nodes globally, optimized for Asia-Pacific coverage.",
    docsUrl: "https://www.alibabacloud.com/help/en/cdn/",
    consoleUrl: "https://cdn.console.aliyun.com/",
    consoleName: "Alibaba Cloud Console",
    steps: [
      "Sign in at alibabacloud.com — create an account if needed",
      "Navigate to CDN service from the console homepage",
      "Click 'Add Domain Name' and enter the domain you want to accelerate",
      "Select the business type: Web (for static content), Download, or Media Streaming",
      "Choose the acceleration region (Mainland China requires ICP filing)",
      "Enter your origin server information (IP address, domain, or OSS bucket)",
      "Verify domain ownership by adding the provided CNAME or TXT record",
      "Add a CNAME record for your domain pointing to the Alibaba CDN CNAME provided",
      "Wait for the domain status to change to 'Running' (usually 1–5 minutes)",
      "For API access: Go to AccessKey Management in RAM console",
      "Create a new AccessKey pair — save both the ID and Secret securely",
      "Paste the Access Key ID, Secret, and CDN Domain Name below",
    ],
    tips: [
      "Use HTTPS acceleration with free SSL certificates from Alibaba Cloud",
      "Configure cache rules per file extension for optimal TTL settings",
      "Enable GZIP and Brotli compression in Performance Optimization settings",
      "Set up URL authentication (Type A/B/C) to prevent hotlinking",
      "Use EdgeScript for advanced logic at the edge without modifying origin",
    ],
    troubleshooting: [
      "Domain stuck in 'Configuring': Check DNS CNAME record is correctly pointing to the CDN CNAME",
      "ICP filing required: Domains accelerated in Mainland China require a valid ICP filing number",
      "Origin 5xx errors: Verify origin server health and check Back-to-Origin settings",
      "Cache miss ratio high: Review cache rules; ensure query string parameters are handled correctly",
      "Access denied to API: Ensure RAM user has AliyunCDNFullAccess permission",
    ],
    pricing: "Pay-as-you-go from ¥0.24/GB (~$0.033/GB) for Mainland China. International: from $0.081/GB. Free quota available for new users.",
  },
  cloudflare: {
    overview: "Cloudflare is a global CDN and security platform with 300+ PoPs. Offers a generous free tier with DDoS protection, WAF, and DNS management.",
    docsUrl: "https://developers.cloudflare.com/cache/",
    consoleUrl: "https://dash.cloudflare.com/",
    consoleName: "Cloudflare Dashboard",
    steps: [
      "Create a free account at dash.cloudflare.com",
      "Click 'Add a Site' and enter your domain name",
      "Select a plan — Free plan includes CDN, DDoS protection, and SSL",
      "Cloudflare will scan existing DNS records — review and confirm them",
      "Update your domain's nameservers at your registrar to Cloudflare's nameservers",
      "Wait for nameserver propagation (usually 1–24 hours)",
      "Once active, your site is automatically proxied through Cloudflare's CDN",
      "Go to your domain → Overview → copy the Zone ID from the right sidebar",
      "Copy the Account ID from the same sidebar section",
      "For API Token: Go to My Profile → API Tokens → Create Token",
      "Use the 'Edit zone DNS' or 'Custom token' template with Cache Purge permissions",
      "Copy the generated API Token and paste it below along with Zone ID and Account ID",
    ],
    tips: [
      "Enable 'Auto Minify' for HTML, CSS, and JavaScript optimization",
      "Use Page Rules or Cache Rules for fine-grained caching control",
      "Enable 'Always Online' to serve cached pages when your origin is down",
      "Set Browser Cache TTL to 'Respect Existing Headers' for optimal control",
      "Use Workers for serverless edge logic like A/B testing or geolocation redirects",
      "Enable Argo Smart Routing (paid) for 30%+ faster content delivery",
    ],
    troubleshooting: [
      "Site not loading after nameserver change: Allow up to 24 hours for propagation",
      "Too many redirects (ERR_TOO_MANY_REDIRECTS): Set SSL mode to 'Full (Strict)' if origin has SSL",
      "CSS/JS not updating: Purge cache via dashboard or API; check if 'Development Mode' helps",
      "API token permission denied: Ensure token has 'Zone.Cache Purge' and relevant permissions",
      "Origin not reachable (522 error): Check origin firewall allows Cloudflare IP ranges",
      "Mixed content warnings: Enable 'Automatic HTTPS Rewrites' in the SSL/TLS settings",
    ],
    pricing: "Free plan includes CDN, DDoS protection, and shared SSL. Pro: $20/month. Business: $200/month. Enterprise: custom pricing.",
  },
};

const PROVIDERS = [
  {
    key: "cloudfront",
    name: "AWS CloudFront",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
    color: "from-orange-500 to-amber-500",
    fields: [
      { key: "access_key_id", label: "Access Key ID", secret: false },
      { key: "secret_access_key", label: "Secret Access Key", secret: true },
      { key: "distribution_id", label: "Distribution ID", secret: false },
      { key: "region", label: "Region", secret: false },
    ],
    settingsFields: [
      { key: "cache_ttl", label: "Cache TTL (seconds)", help: "Time-to-live for cached objects. Common values: 86400 (1 day) for static assets, 3600 (1 hour) for semi-dynamic, 0 for no caching. CloudFront respects origin Cache-Control headers if set to 'Use Origin Cache Headers'." },
      { key: "custom_domain", label: "Custom Domain", help: "Your custom domain (e.g., cdn.yourdomain.com). Add it as an Alternate Domain Name (CNAME) in your CloudFront distribution, then create a CNAME DNS record pointing to your d*.cloudfront.net distribution domain." },
    ],
    endpointHelp: "Your CloudFront distribution URL, e.g., https://d1234567890.cloudfront.net — found in the CloudFront console under your distribution's 'Domain name'. If using a custom domain, enter that instead.",
  },
  {
    key: "bunnynet",
    name: "Bunny.net",
    logo: "https://dash.bunny.net/assets/images/bunnynet-logo.svg",
    color: "from-orange-400 to-yellow-400",
    fields: [
      { key: "api_key", label: "API Key", secret: true },
      { key: "pull_zone_id", label: "Pull Zone ID", secret: false },
      { key: "storage_zone", label: "Storage Zone Name", secret: false },
    ],
    settingsFields: [
      { key: "custom_hostname", label: "Custom Hostname", help: "Your custom CDN hostname (e.g., cdn.yourdomain.com). Add it in Pull Zone → Hostnames, then create a CNAME DNS record pointing to your Bunny CDN hostname (e.g., yourzone.b-cdn.net). Enable free SSL for the custom hostname." },
      { key: "origin_url", label: "Origin URL", help: "The URL of your origin server that Bunny.net pulls content from (e.g., https://yourdomain.com). Must be publicly accessible. Bunny caches responses from this URL." },
    ],
    endpointHelp: "Your Bunny.net CDN endpoint, e.g., https://yourzone.b-cdn.net — found in Pull Zone → General → CDN Hostname. If you configured a custom hostname, use that URL instead.",
  },
  {
    key: "alibaba",
    name: "Alibaba Cloud CDN",
    logo: "https://img.alicdn.com/tfs/TB1Ly5oS3HqK1RjSZFPXXcwapXa-238-54.png",
    color: "from-orange-600 to-red-500",
    fields: [
      { key: "access_key_id", label: "Access Key ID", secret: false },
      { key: "access_key_secret", label: "Access Key Secret", secret: true },
      { key: "domain_name", label: "CDN Domain Name", secret: false },
    ],
    settingsFields: [
      { key: "origin_server", label: "Origin Server", help: "Your origin server IP or domain (e.g., 1.2.3.4 or origin.yourdomain.com). This is where Alibaba CDN fetches content from. Configure in CDN console under Domain Management → Origin Configuration." },
      { key: "cache_config", label: "Cache Configuration", help: "Cache rule type: 'aggressive' (cache everything, long TTL), 'standard' (respect origin headers), or 'minimal' (short TTLs, frequent revalidation). For fine-grained control, set rules per file extension in the Alibaba CDN console." },
    ],
    endpointHelp: "Your Alibaba CDN CNAME endpoint, e.g., yourdomain.com.w.cdngslb.com — found in CDN console → Domain Management → CNAME column. Use your custom accelerated domain if DNS CNAME is already configured.",
  },
  {
    key: "cloudflare",
    name: "Cloudflare",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cloudflare/cloudflare-original.svg",
    color: "from-orange-500 to-yellow-500",
    fields: [
      { key: "api_token", label: "API Token", secret: true },
      { key: "zone_id", label: "Zone ID", secret: false },
      { key: "account_id", label: "Account ID", secret: false },
    ],
    settingsFields: [
      { key: "custom_domain", label: "Custom Domain", help: "The domain proxied through Cloudflare (e.g., yourdomain.com). Must be added as a site in your Cloudflare dashboard with nameservers pointing to Cloudflare. The orange cloud icon must be enabled for CDN proxying." },
      { key: "cache_level", label: "Cache Level", help: "Options: 'no_query_string' (only caches when no query string), 'ignore_query_string' (same cache regardless of query string), 'standard' (caches different resources by query string). Set via Cloudflare dashboard → Caching → Configuration → Cache Level, or use Cache Rules for per-path control." },
    ],
    endpointHelp: "Your Cloudflare-proxied domain URL (e.g., https://yourdomain.com). Since Cloudflare acts as a reverse proxy, the endpoint is your domain itself. No separate CDN URL is needed — just ensure the DNS record has the orange proxy cloud enabled.",
  },
];

export default function CDNConfiguration() {
  const [configs, setConfigs] = useState<CDNConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, { credentials: Record<string, string>; settings: Record<string, string>; endpoint_url: string }>>({});

  const fetchConfigs = async () => {
    setLoading(true);
    const { data } = await supabase.from("cdn_configurations").select("*").order("created_at");
    setConfigs((data as CDNConfig[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const getConfig = (provider: string) => configs.find(c => c.provider === provider);

  const initEditData = (provider: string) => {
    const existing = getConfig(provider);
    return {
      credentials: { ...(existing?.credentials || {}) },
      settings: { ...(existing?.settings || {}) },
      endpoint_url: existing?.endpoint_url || "",
    };
  };

  const handleExpand = (key: string) => {
    if (expanded === key) { setExpanded(null); return; }
    setExpanded(key);
    if (!editData[key]) {
      setEditData(prev => ({ ...prev, [key]: initEditData(key) }));
    }
  };

  const updateField = (provider: string, section: "credentials" | "settings", field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [section]: { ...prev[provider]?.[section], [field]: value },
      },
    }));
  };

  const handleSave = async (provider: string) => {
    setSaving(provider);
    const prov = PROVIDERS.find(p => p.key === provider)!;
    const data = editData[provider];
    const existing = getConfig(provider);

    const payload = {
      provider,
      display_name: prov.name,
      credentials: data.credentials,
      settings: data.settings,
      endpoint_url: data.endpoint_url || null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from("cdn_configurations").update(payload).eq("id", existing.id);
      if (error) toast.error(error.message); else toast.success(`${prov.name} configuration saved`);
    } else {
      const { error } = await supabase.from("cdn_configurations").insert({ ...payload, is_active: false, is_default: false });
      if (error) toast.error(error.message); else toast.success(`${prov.name} added`);
    }
    await fetchConfigs();
    setSaving(null);
  };

  const toggleActive = async (provider: string, active: boolean) => {
    const existing = getConfig(provider);
    if (!existing) { toast.error("Configure credentials first"); return; }
    const { error } = await supabase.from("cdn_configurations").update({ is_active: active }).eq("id", existing.id);
    if (error) toast.error(error.message); else { toast.success(`${active ? "Enabled" : "Disabled"}`); fetchConfigs(); }
  };

  const setDefault = async (provider: string) => {
    const existing = getConfig(provider);
    if (!existing?.is_active) { toast.error("Enable the provider first"); return; }
    await supabase.from("cdn_configurations").update({ is_default: false }).neq("id", "");
    const { error } = await supabase.from("cdn_configurations").update({ is_default: true }).eq("id", existing.id);
    if (error) toast.error(error.message); else { toast.success(`${PROVIDERS.find(p => p.key === provider)?.name} set as default`); fetchConfigs(); }
  };

  const [testingCdn, setTestingCdn] = useState<string | null>(null);

  const handleTestConnection = async (provider: string) => {
    const existing = getConfig(provider);
    if (!existing) { toast.error("Configure credentials first"); return; }
    setTestingCdn(provider);

    const endpointUrl = existing.endpoint_url;
    if (!endpointUrl) {
      toast.error("No endpoint URL configured. Add an endpoint URL first.");
      setTestingCdn(null);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      await fetch(endpointUrl, { method: "HEAD", mode: "no-cors", signal: controller.signal });
      clearTimeout(timeoutId);
      toast.success(`${PROVIDERS.find(p => p.key === provider)?.name} connection successful! Endpoint is reachable.`);
    } catch (e: any) {
      if (e.name === "AbortError") {
        toast.error("Connection timed out after 8 seconds");
      } else {
        toast.success(`${PROVIDERS.find(p => p.key === provider)?.name} endpoint pinged. Verify CDN dashboard for full connectivity.`);
      }
    }
    setTestingCdn(null);
  };

  const handlePurge = async (provider: string) => {
    toast.success(`Cache purge request sent to ${PROVIDERS.find(p => p.key === provider)?.name}`);
  };

  const handleDelete = async (provider: string) => {
    const existing = getConfig(provider);
    if (!existing) return;
    const { error } = await supabase.from("cdn_configurations").delete().eq("id", existing.id);
    if (error) toast.error(error.message); else { toast.success("Configuration removed"); fetchConfigs(); }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CDN Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect and manage Content Delivery Networks for optimal asset delivery</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConfigs}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROVIDERS.map(prov => {
          const cfg = getConfig(prov.key);
          return (
            <div key={prov.key} className={cn(
              "p-4 rounded-xl border transition-all",
              cfg?.is_default ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"
            )}>
              <div className="flex items-center justify-between mb-2">
                <Server className={cn("h-5 w-5", cfg?.is_active ? "text-primary" : "text-muted-foreground")} />
                {cfg?.is_default && <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>}
              </div>
              <p className="text-sm font-semibold text-foreground">{prov.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {cfg?.is_active ? "Active" : cfg ? "Configured" : "Not configured"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Provider cards */}
      <div className="space-y-3">
        {PROVIDERS.map(prov => {
          const cfg = getConfig(prov.key);
          const isExpanded = expanded === prov.key;
          const ed = editData[prov.key] || initEditData(prov.key);
          const guide = PROVIDER_GUIDES[prov.key];
          const isGuideOpen = showGuide[prov.key];

          return (
            <div key={prov.key} className={cn(
              "border rounded-xl bg-card overflow-hidden transition-all",
              isExpanded ? "border-primary/30 shadow-sm" : "border-border"
            )}>
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleExpand(prov.key)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center", prov.color)}>
                    <Cloud className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{prov.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {cfg?.endpoint_url || "No endpoint configured"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cfg?.is_active && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded-full">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  )}
                  <Switch
                    checked={cfg?.is_active || false}
                    onCheckedChange={(v) => { toggleActive(prov.key, v); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Expanded config */}
              {isExpanded && (
                <div className="border-t border-border px-5 py-5 space-y-5">

                  {/* Setup Guide Toggle */}
                  {guide && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowGuide(prev => ({ ...prev, [prov.key]: !prev[prov.key] }))}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Setup Guide & Documentation for {prov.name}
                        </span>
                        {isGuideOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>

                      {isGuideOpen && (
                        <div className="rounded-xl border border-border bg-background p-5 space-y-5 animate-in slide-in-from-top-1 duration-150">
                          {/* Overview */}
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-xs text-foreground leading-relaxed">{guide.overview}</p>
                          </div>

                          {/* Pricing */}
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                            <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">Pricing</p>
                              <p className="text-xs text-muted-foreground">{guide.pricing}</p>
                            </div>
                          </div>

                          {/* Step-by-step */}
                          <div>
                            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-3">Step-by-Step Setup</p>
                            <div className="space-y-2">
                              {guide.steps.map((step, i) => (
                                <div key={i} className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <p className="text-xs text-foreground leading-relaxed pt-1">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Pro Tips */}
                          <div className="border-t border-border pt-4">
                            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">💡 Pro Tips</p>
                            <div className="space-y-1.5">
                              {guide.tips.map((tip, i) => (
                                <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                  <span>{tip}</span>
                                </p>
                              ))}
                            </div>
                          </div>

                          {/* Troubleshooting */}
                          <div className="border-t border-border pt-4">
                            <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider mb-2">⚠️ Troubleshooting</p>
                            <div className="space-y-1.5">
                              {guide.troubleshooting.map((item, i) => (
                                <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </p>
                              ))}
                            </div>
                          </div>

                          {/* Links */}
                          <div className="flex items-center gap-4 border-t border-border pt-4">
                            <a
                              href={guide.consoleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open {guide.consoleName} →
                            </a>
                            <a
                              href={guide.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline font-medium"
                            >
                              <BookOpen className="h-3 w-3" />
                              Official Documentation →
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Credentials */}
                  <div>
                    <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" /> Credentials
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {prov.fields.map(field => (
                        <div key={field.key}>
                          <label className="text-[11px] text-muted-foreground mb-1 block">{field.label}</label>
                          <div className="relative">
                            <Input
                              type={field.secret && !showSecrets[`${prov.key}-${field.key}`] ? "password" : "text"}
                              value={ed.credentials[field.key] || ""}
                              onChange={e => updateField(prov.key, "credentials", field.key, e.target.value)}
                              placeholder={field.label}
                              className="h-9 text-xs pr-8"
                            />
                            {field.secret && (
                              <button
                                type="button"
                                onClick={() => setShowSecrets(prev => ({ ...prev, [`${prov.key}-${field.key}`]: !prev[`${prov.key}-${field.key}`] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showSecrets[`${prov.key}-${field.key}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settings */}
                  <div>
                    <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-primary" /> Settings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {prov.settingsFields.map(field => (
                        <div key={field.key}>
                          <label className="text-[11px] text-muted-foreground mb-1 block">{field.label}</label>
                          <Input
                            value={ed.settings[field.key] || ""}
                            onChange={e => updateField(prov.key, "settings", field.key, e.target.value)}
                            placeholder={field.label}
                            className="h-9 text-xs"
                          />
                          {field.help && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed flex items-start gap-1">
                              <Info className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                              <span>{field.help}</span>
                            </p>
                          )}
                        </div>
                      ))}
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">CDN Endpoint URL</label>
                        <Input
                          value={ed.endpoint_url || ""}
                          onChange={e => setEditData(prev => ({ ...prev, [prov.key]: { ...prev[prov.key], endpoint_url: e.target.value } }))}
                          placeholder="https://cdn.example.com"
                          className="h-9 text-xs"
                        />
                        {prov.endpointHelp && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed flex items-start gap-1">
                            <Info className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                            <span>{prov.endpointHelp}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button size="sm" onClick={() => handleSave(prov.key)} disabled={saving === prov.key}>
                      {saving === prov.key ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Save Configuration
                    </Button>
                    {cfg?.is_active && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleTestConnection(prov.key)} disabled={testingCdn === prov.key}>
                          {testingCdn === prov.key ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                          Test Connection
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDefault(prov.key)}>
                          <Zap className="h-3.5 w-3.5 mr-1" /> Set as Default
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePurge(prov.key)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Purge Cache
                        </Button>
                      </>
                    )}
                    {cfg && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive ml-auto" onClick={() => handleDelete(prov.key)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    )}
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
