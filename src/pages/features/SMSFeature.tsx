import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Smartphone, Send, Users, BarChart3, Shield, Zap, Settings, Globe, CreditCard } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function SMSFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} SMS`}
      subtitle="SMS Messaging"
      description="Powerful bulk and transactional SMS platform with multi-provider support, credit-based billing, dynamic templates, and real-time delivery tracking."
      icon={Smartphone}
      gradient="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600"
      features={[
        { title: "Bulk SMS", description: "Send mass notifications, promotions, and alerts to thousands instantly.", icon: Send },
        { title: "Template Engine", description: "Dynamic templates with {{variable}} syntax for personalised messages.", icon: Settings },
        { title: "Credit System", description: "Pre-paid SMS credits with per-message or package-based pricing.", icon: CreditCard },
        { title: "Multi-Provider", description: "Route messages through global and regional gateways automatically.", icon: Globe },
        { title: "Delivery Reports", description: "Real-time delivery status tracking with analytics dashboard.", icon: BarChart3 },
        { title: "DLT Compliance", description: "Built-in support for regulatory compliance and sender ID management.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "providers",
          label: "Gateway Modes",
          icon: Globe,
          color: "hsl(160,60%,40%)",
          title: "Platform & Own Gateway Modes",
          description: "Use the shared platform gateway with per-SMS billing, or connect your own provider credentials for unlimited sending.",
          points: ["Shared platform gateway", "Own credentials mode", "Auto-provider routing", "Balance auto-refund"],
        },
        {
          id: "templates",
          label: "Templates",
          icon: Settings,
          color: "hsl(270,80%,60%)",
          title: "Smart Template System",
          description: "Create reusable SMS templates with dynamic variables for OTPs, invoices, reminders, and custom notifications.",
          points: ["Variable substitution", "Category tagging", "Preview before send", "Template versioning"],
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart3,
          color: "hsl(199,89%,48%)",
          title: "Delivery Analytics",
          description: "Track delivery rates, failed messages, credit consumption, and per-tenant usage from a centralised dashboard.",
          points: ["Real-time delivery status", "Credit usage reports", "Provider health checks", "Export logs"],
        },
      ]}
      benefits={[
        "Multi-provider support",
        "Credit-based billing",
        "Dynamic templates",
        "Real-time delivery tracking",
        "Regulatory compliance",
        "Tenant-level analytics",
      ]}
    />
  );
}
