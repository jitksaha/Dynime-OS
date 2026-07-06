import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Phone, MessageSquare, Send, Settings, BarChart3, Shield, Users, Globe, Zap } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function WhatsAppFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} WhatsApp`}
      subtitle="WhatsApp Business"
      description="Enterprise WhatsApp messaging with Meta Cloud API and AiSensy integration — send OTPs, invoices, notifications, and marketing campaigns at scale."
      icon={Phone}
      gradient="bg-gradient-to-br from-green-500 via-emerald-500 to-green-700"
      features={[
        { title: "Business Messaging", description: "Send transactional messages, OTPs, and notifications via WhatsApp.", icon: MessageSquare },
        { title: "Template Manager", description: "Create and manage message templates with {{variable}} placeholders.", icon: Settings },
        { title: "Multi-Provider", description: "Support for Meta Cloud API and AiSensy with seamless switching.", icon: Globe },
        { title: "Delivery Logs", description: "Track message delivery status with detailed per-tenant logs.", icon: BarChart3 },
        { title: "Bulk Campaigns", description: "Send marketing campaigns to opted-in contacts at scale.", icon: Send },
        { title: "Compliance", description: "Built-in opt-in management and Meta Business verification.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "providers",
          label: "Providers",
          icon: Globe,
          color: "hsl(142,70%,40%)",
          title: "Meta Cloud API & AiSensy",
          description: "Connect directly to Meta's official Cloud API for maximum reliability, or use AiSensy for simplified setup and campaign management.",
          points: ["Meta Graph API v21.0", "AiSensy integration", "Automatic failover", "Sandbox testing"],
        },
        {
          id: "templates",
          label: "Templates",
          icon: Settings,
          color: "hsl(38,92%,50%)",
          title: "Dynamic Message Templates",
          description: "Create reusable templates for OTPs, invoice reminders, shipping updates, and custom notifications with variable substitution.",
          points: ["Variable syntax {{name}}", "Category management", "Preview & test", "Multi-language support"],
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart3,
          color: "hsl(270,80%,60%)",
          title: "Message Analytics",
          description: "Monitor delivery rates, read receipts, and engagement metrics across all your WhatsApp communications.",
          points: ["Delivery tracking", "Read receipts", "Engagement metrics", "Export reports"],
        },
      ]}
      benefits={[
        "Official Meta API support",
        "Dynamic template engine",
        "Bulk campaign sending",
        "Real-time delivery logs",
        "Multi-provider routing",
        "Regulatory compliance",
      ]}
    />
  );
}
