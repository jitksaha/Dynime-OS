import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Bell, Mail, Smartphone, MessageSquare, Settings, BarChart3, Users, Zap, Shield } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function NotificationsFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} Notifications`}
      subtitle="Multi-Channel Alerts"
      description="Keep your team and customers informed with real-time notifications across email, SMS, WhatsApp, and in-app channels from a single hub."
      icon={Bell}
      gradient="bg-gradient-to-br from-rose-500 via-pink-500 to-red-600"
      features={[
        { title: "In-App Alerts", description: "Real-time notification bell with read/unread tracking and quick actions.", icon: Bell },
        { title: "Email Notifications", description: "Automated email alerts for invoices, approvals, and system events.", icon: Mail },
        { title: "SMS Alerts", description: "Critical notifications delivered instantly via SMS.", icon: Smartphone },
        { title: "WhatsApp Alerts", description: "Send business-critical updates through WhatsApp Business API.", icon: MessageSquare },
        { title: "Preferences", description: "Let users choose which channels and events they want notifications for.", icon: Settings },
        { title: "Analytics", description: "Track delivery rates, open rates, and engagement across all channels.", icon: BarChart3 },
      ]}
      detailSections={[
        {
          id: "channels",
          label: "Channels",
          icon: Zap,
          color: "hsl(350,70%,55%)",
          title: "Multi-Channel Delivery",
          description: "Route notifications through the most effective channel — email for details, SMS for urgency, WhatsApp for engagement.",
          points: ["Email via SMTP", "SMS via gateway", "WhatsApp Business", "In-app real-time"],
        },
        {
          id: "preferences",
          label: "Preferences",
          icon: Settings,
          color: "hsl(270,80%,60%)",
          title: "Granular Preferences",
          description: "Users and admins can configure exactly which events trigger notifications and on which channels.",
          points: ["Per-event toggles", "Channel selection", "Quiet hours", "Digest mode"],
        },
        {
          id: "templates",
          label: "Templates",
          icon: Users,
          color: "hsl(199,89%,48%)",
          title: "Notification Templates",
          description: "Design branded notification templates with dynamic variables for consistent communication across all channels.",
          points: ["Branded templates", "Variable substitution", "Multi-language", "Preview & test"],
        },
      ]}
      benefits={[
        "Multi-channel delivery",
        "Granular user preferences",
        "Real-time in-app alerts",
        "Branded templates",
        "Delivery analytics",
        "Quiet hours & digests",
      ]}
    />
  );
}
