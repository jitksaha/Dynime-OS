import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Zap, Plug, Globe, RefreshCw, Code, Webhook, Link2, Database, Shield } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function IntegrationsFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} Integrations`}
      subtitle="Connect Everything"
      description="Seamlessly connect your favourite tools — payment gateways, communication platforms, cloud storage, and more with our plug-and-play integration hub."
      icon={Zap}
      gradient="bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600"
      features={[
        { title: "Payment Gateways", description: "Stripe, bKash, SSLCommerz, PayPal and more with one-click setup.", icon: Globe },
        { title: "Webhooks", description: "Send real-time event notifications to any external endpoint.", icon: Webhook },
        { title: "REST API", description: "Full-featured API with scoped keys, rate limiting, and OpenAPI docs.", icon: Code },
        { title: "Email & SMS", description: "Connect SMTP, WhatsApp, and SMS gateways for multi-channel outreach.", icon: Plug },
        { title: "Calendar Sync", description: "Two-way Google Calendar synchronisation for events and meetings.", icon: RefreshCw },
        { title: "Cloud Storage", description: "CDN and storage integrations for fast, global file delivery.", icon: Database },
      ]}
      detailSections={[
        {
          id: "connectors",
          label: "Connectors",
          icon: Link2,
          color: "hsl(45,93%,47%)",
          title: "Pre-Built Connectors",
          description: "Choose from a growing library of pre-built connectors or build custom ones with our Webhook and API tools.",
          points: ["Stripe checkout", "Google Calendar", "SMTP email", "WhatsApp Business"],
        },
        {
          id: "api",
          label: "Developer API",
          icon: Code,
          color: "hsl(270,80%,60%)",
          title: "Powerful Developer API",
          description: "Full REST API with interactive documentation, per-key scoping, usage analytics, and rate limiting.",
          points: ["OpenAPI spec", "Scoped API keys", "Request logging", "Rate limit controls"],
        },
        {
          id: "security",
          label: "Secure by Design",
          icon: Shield,
          color: "hsl(142,71%,45%)",
          title: "Enterprise-Grade Security",
          description: "All integrations use encrypted credentials, audit logging, and role-based access policies.",
          points: ["Encrypted secrets", "Audit trails", "Role-gated setup", "Automatic token refresh"],
        },
      ]}
      benefits={[
        "Pre-built connectors",
        "Webhook event streaming",
        "Scoped API keys",
        "Multi-channel messaging",
        "Calendar synchronisation",
        "CDN file delivery",
      ]}
    />
  );
}
