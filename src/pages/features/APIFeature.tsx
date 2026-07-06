import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Code, Key, BarChart3, Shield, FileText, Zap, Globe, Lock, Settings } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function APIFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} API`}
      subtitle="Developer Platform"
      description="Full-featured REST API with scoped API keys, interactive documentation, rate limiting, and request analytics — build custom integrations with ease."
      icon={Code}
      gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-700"
      features={[
        { title: "REST API", description: "Comprehensive RESTful endpoints for all platform modules and data.", icon: Globe },
        { title: "API Keys", description: "Generate scoped API keys with custom permissions and expiry dates.", icon: Key },
        { title: "Rate Limiting", description: "Configurable rate limits per key to protect your infrastructure.", icon: Shield },
        { title: "Request Logs", description: "Detailed request logging with response times and status codes.", icon: BarChart3 },
        { title: "Documentation", description: "Interactive API documentation with examples and try-it-now.", icon: FileText },
        { title: "Webhooks", description: "Receive real-time event notifications at your custom endpoints.", icon: Zap },
      ]}
      detailSections={[
        {
          id: "keys",
          label: "API Keys",
          icon: Key,
          color: "hsl(250,60%,55%)",
          title: "Scoped API Keys",
          description: "Create multiple API keys with granular scope control — restrict access to specific modules, actions, and data.",
          points: ["Per-module scoping", "Expiry dates", "Usage tracking", "Instant revocation"],
        },
        {
          id: "docs",
          label: "Documentation",
          icon: FileText,
          color: "hsl(38,92%,50%)",
          title: "Interactive API Docs",
          description: "Auto-generated documentation with request/response examples, authentication guides, and a live testing sandbox.",
          points: ["OpenAPI spec", "Code examples", "Authentication guide", "Live sandbox"],
        },
        {
          id: "security",
          label: "Security",
          icon: Lock,
          color: "hsl(0,72%,50%)",
          title: "Enterprise-Grade Security",
          description: "All API requests are authenticated, rate-limited, and logged for complete audit trails and abuse prevention.",
          points: ["HMAC signing", "IP whitelisting", "Audit logging", "Abuse detection"],
        },
      ]}
      benefits={[
        "RESTful endpoints",
        "Scoped API keys",
        "Interactive documentation",
        "Rate limiting",
        "Request analytics",
        "Webhook events",
      ]}
    />
  );
}
