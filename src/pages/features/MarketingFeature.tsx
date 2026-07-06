import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedAnalytics } from "@/components/illustrations";
import {
  Megaphone, Mail, BarChart3, Globe, Zap, Users,
  ShoppingCart, Building2, Briefcase, Target, Heart, Layers,
} from "lucide-react";

export default function MarketingFeature() {
  return (
    <FeaturePageLayout
      title="Marketing Automation"
      subtitle="Multi-Channel Marketing"
      description="Create, automate, and analyze campaigns across all channels. Reach your audience at the right time with the right message."
      icon={Megaphone}
      gradient="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600"
      heroIllustration={<AnimatedAnalytics />}
      features={[
        { title: "Campaign Builder", description: "Create multi-channel campaigns with drag-and-drop builders and A/B testing.", icon: Megaphone },
        { title: "Email Templates", description: "Professional email templates with personalization, scheduling, and performance tracking.", icon: Mail },
        { title: "Analytics Dashboard", description: "Track opens, clicks, conversions, and ROI across all campaigns in real-time.", icon: BarChart3 },
        { title: "Multi-Channel Outreach", description: "Email, SMS, social media — manage all channels from a single unified platform.", icon: Globe },
        { title: "Automation Flows", description: "Set up automated drip campaigns, welcome sequences, and re-engagement workflows.", icon: Zap },
        { title: "Audience Segmentation", description: "Segment contacts by behavior, demographics, and engagement for targeted messaging.", icon: Users },
      ]}
      detailSections={[
        {
          id: "campaigns",
          label: "Campaign Management",
          icon: Megaphone,
          color: "hsl(270,80%,60%)",
          title: "Launch campaigns that actually convert",
          description: "Build multi-step campaigns across email, SMS, and social. A/B test subject lines, content, and timing to maximize every send.",
          points: [
            "Multi-channel campaign orchestration",
            "A/B testing for subject lines & content",
            "Send-time optimization per recipient",
            "Campaign calendar with team collaboration",
            "Budget tracking per campaign",
          ],
        },
        {
          id: "automation",
          label: "Marketing Automation",
          icon: Zap,
          color: "hsl(38,92%,50%)",
          title: "Set it up once, let it run forever",
          description: "Design automated journeys — welcome series, cart abandonment, re-engagement flows — that nurture leads into customers on autopilot.",
          points: [
            "Visual automation flow builder",
            "Trigger-based email sequences",
            "Behavioral event tracking",
            "Lead nurturing with scoring updates",
            "Automated list management",
          ],
        },
        {
          id: "analytics",
          label: "Campaign Analytics",
          icon: BarChart3,
          color: "hsl(142,71%,45%)",
          title: "Data-driven decisions at every step",
          description: "Real-time dashboards show campaign performance across channels. Compare ROI, track attribution, and optimize spend based on actual results.",
          points: [
            "Open, click, and conversion tracking",
            "Campaign comparison dashboards",
            "ROI analysis per channel",
            "Subscriber growth tracking",
            "Unsubscribe & bounce analysis",
          ],
        },
      ]}
      stats={[
        { value: "10x", label: "Average campaign ROI" },
        { value: "45%", label: "Higher email open rates" },
        { value: "3x", label: "More qualified leads" },
        { value: "60%", label: "Time saved on campaign setup" },
      ]}
      useCases={[
        { title: "E-Commerce", description: "Cart abandonment emails, product recommendations, and post-purchase follow-ups.", icon: ShoppingCart },
        { title: "SaaS", description: "Trial onboarding sequences, feature announcements, and churn prevention campaigns.", icon: Globe },
        { title: "Agencies", description: "Manage campaigns for multiple clients with white-label reporting.", icon: Building2 },
        { title: "B2B Sales", description: "Lead nurturing sequences, webinar promotions, and account-based marketing.", icon: Target },
        { title: "Healthcare", description: "Patient engagement, appointment reminders, and health awareness campaigns.", icon: Heart },
        { title: "Education", description: "Student recruitment, enrollment campaigns, and alumni engagement.", icon: Briefcase },
      ]}
      benefits={[
        "10x your campaign ROI",
        "Automated drip sequences",
        "A/B testing built-in",
        "Detailed open & click tracking",
        "Contact segmentation engine",
        "Multi-channel from one dashboard",
        "Professional template library",
        "Campaign performance comparison",
        "Smart send-time optimization",
        "Subscriber lifecycle management",
      ]}
      faqs={[
        { q: "How many emails can I send per month?", a: "Email volume depends on your plan tier. All plans include generous limits with additional volume available as add-ons." },
        { q: "Does it support SMS campaigns?", a: "Yes. Send SMS campaigns alongside emails, with the same segmentation and automation capabilities." },
        { q: "Can I import my existing contact list?", a: "Absolutely. Import from CSV, Excel, or sync from your CRM module with automatic deduplication." },
        { q: "How does A/B testing work?", a: "Test up to 3 variants of subject lines, content, or send times. The winner is auto-selected based on open rate or click rate." },
      ]}
    />
  );
}
