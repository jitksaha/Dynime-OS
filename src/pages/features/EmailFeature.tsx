import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Mail, Send, FileText, BarChart3, Settings, Shield, Users, Zap, Globe } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function EmailFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} Email`}
      subtitle="Email Platform"
      description="Professional email system with SMTP integration, drag-and-drop template builder, transactional emails, and delivery analytics."
      icon={Mail}
      gradient="bg-gradient-to-br from-orange-500 via-amber-500 to-red-500"
      features={[
        { title: "SMTP Integration", description: "Connect any SMTP provider — Gmail, SendGrid, Mailgun, or custom.", icon: Globe },
        { title: "Template Builder", description: "Drag-and-drop email template builder with brand-consistent designs.", icon: FileText },
        { title: "Transactional Emails", description: "Automated emails for invoices, OTPs, password resets, and more.", icon: Send },
        { title: "Email Campaigns", description: "Create and send marketing email campaigns to segmented lists.", icon: Users },
        { title: "Delivery Tracking", description: "Monitor delivery, open, and click rates for every email sent.", icon: BarChart3 },
        { title: "SPF/DKIM", description: "Domain authentication guides for maximum deliverability.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "templates",
          label: "Templates",
          icon: Settings,
          color: "hsl(15,80%,55%)",
          title: "Visual Template Builder",
          description: "Design professional email templates with a drag-and-drop editor, dynamic variables, and responsive preview.",
          points: ["Drag-and-drop editor", "Dynamic variables", "Responsive preview", "Template library"],
        },
        {
          id: "automation",
          label: "Automation",
          icon: Zap,
          color: "hsl(270,80%,60%)",
          title: "Email Automation",
          description: "Trigger automated emails based on events — new signup, invoice created, subscription expiring, and more.",
          points: ["Event-based triggers", "Scheduled sending", "Drip sequences", "A/B testing"],
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart3,
          color: "hsl(199,89%,48%)",
          title: "Email Analytics",
          description: "Track every email with delivery receipts, open tracking, click maps, and bounce management.",
          points: ["Open rate tracking", "Click analytics", "Bounce handling", "Unsubscribe management"],
        },
      ]}
      benefits={[
        "Multi-provider SMTP",
        "Visual template builder",
        "Transactional automation",
        "Campaign management",
        "Delivery analytics",
        "Domain authentication",
      ]}
    />
  );
}
