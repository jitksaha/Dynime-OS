import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedCRM } from "@/components/illustrations";
import {
  Target, Users, TrendingUp, Phone, Mail, BarChart3,
  Globe, Zap, Building2, ShoppingCart, Briefcase, Heart,
  Kanban, Search, MessageSquare, Filter,
} from "lucide-react";

export default function CRMFeature() {
  return (
    <FeaturePageLayout
      title="Powerful CRM Platform"
      subtitle="Customer Relationship Management"
      description="Close more deals, nurture relationships, and grow revenue with an intelligent CRM built for modern sales teams. AI-assisted scoring, WhatsApp integration, and advanced pipeline management."
      icon={Target}
      gradient="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600"
      heroIllustration={<AnimatedCRM />}
      features={[
        { title: "Pipeline Kanban View", description: "Drag-and-drop deal stages with swimlane filtering by owner, value, or stage age.", icon: TrendingUp },
        { title: "AI Deal Scoring", description: "AI-assisted win probability per deal based on historical data patterns and engagement signals.", icon: Zap },
        { title: "WhatsApp & SMS Integration", description: "Send and receive WhatsApp messages directly from CRM contact records.", icon: MessageSquare },
        { title: "Email Sequences", description: "Multi-step drip email sequences triggered by deal stage changes with open/click tracking.", icon: Mail },
        { title: "Contact Enrichment", description: "Auto-populate contact details from LinkedIn and company databases for richer profiles.", icon: Search },
        { title: "Sales Forecasting", description: "Monthly and quarterly revenue forecasting from weighted pipeline with confidence levels.", icon: BarChart3 },
      ]}
      detailSections={[
        {
          id: "pipeline",
          label: "Sales Pipeline",
          icon: TrendingUp,
          color: "hsl(142,71%,45%)",
          title: "Visualize your entire sales funnel",
          description: "Drag-and-drop Kanban boards let you move deals through custom stages. See pipeline value at every stage, identify bottlenecks, and forecast revenue with confidence.",
          points: [
            "Custom deal stages with drag-and-drop",
            "Swimlane filtering by owner, value, or age",
            "Weighted pipeline value by probability",
            "Stage duration tracking & bottleneck alerts",
            "Revenue forecasting by close date",
          ],
        },
        {
          id: "contacts",
          label: "Contact Intelligence",
          icon: Users,
          color: "hsl(243,75%,58%)",
          title: "Know your customers inside out",
          description: "Every interaction — emails, calls, WhatsApp messages, meetings, deals — is automatically linked to contact profiles with AI-powered enrichment.",
          points: [
            "Unified contact timeline with all touchpoints",
            "Auto-enrichment from LinkedIn & company DBs",
            "Company & contact relationship mapping",
            "Duplicate detection & intelligent merge",
            "Lead scoring based on engagement signals",
          ],
        },
        {
          id: "automation",
          label: "Sales Automation",
          icon: Zap,
          color: "hsl(38,92%,50%)",
          title: "Automate the repetitive, focus on closing",
          description: "Set up multi-step email sequences, automated follow-up reminders, AI deal scoring, and lost deal analysis. Your sales team spends time selling, not on admin work.",
          points: [
            "Multi-step drip email sequences",
            "AI-assisted win probability scoring",
            "Lost deal analysis with mandatory reason capture",
            "Stale deal alerts & re-engagement triggers",
            "Lead assignment rules by territory & scoring",
          ],
        },
      ]}
      stats={[
        { value: "35%", label: "Increase in deal close rate" },
        { value: "2.5x", label: "Faster lead response time" },
        { value: "40%", label: "More pipeline visibility" },
        { value: "28%", label: "Revenue growth year-over-year" },
      ]}
      useCases={[
        { title: "SaaS Companies", description: "Manage subscription deals, track MRR, and automate renewal follow-ups for recurring revenue.", icon: Globe },
        { title: "Real Estate", description: "Track property inquiries, manage viewings, and nurture buyer relationships through long sales cycles.", icon: Building2 },
        { title: "E-Commerce B2B", description: "Manage wholesale accounts, bulk orders, and long-term partnerships with tiered pricing.", icon: ShoppingCart },
        { title: "Consulting Firms", description: "Track project-based deals, manage proposals, and monitor consultant utilization.", icon: Briefcase },
        { title: "Healthcare Sales", description: "Manage medical device or pharma sales with compliance tracking and territory management.", icon: Heart },
        { title: "Financial Services", description: "Track client portfolios, manage advisor assignments, and automate compliance workflows.", icon: BarChart3 },
      ]}
      benefits={[
        "AI-assisted deal probability scoring",
        "WhatsApp & SMS direct messaging",
        "Multi-step email sequences",
        "Contact auto-enrichment",
        "Lost deal analysis & analytics",
        "Duplicate detection & merge",
        "360° customer view",
        "Sales forecasting with confidence",
        "Territory-based lead routing",
        "Complete interaction history",
      ]}
      faqs={[
        { q: "Can I customize the deal pipeline stages?", a: "Yes. Create unlimited custom stages, set probabilities for each, and define automated actions when deals move between stages." },
        { q: "How does AI deal scoring work?", a: "The AI analyzes historical win/loss patterns, deal characteristics, engagement signals, and stage duration to predict win probability for each deal in real-time." },
        { q: "Does it integrate with WhatsApp?", a: "Yes. Send and receive WhatsApp messages directly from contact records. Full conversation history is logged in the CRM timeline." },
        { q: "How do email sequences work?", a: "Create multi-step drip campaigns triggered by deal stage changes. Track opens, clicks, and replies. Sequences auto-pause when a reply is detected." },
        { q: "Can I import existing contacts?", a: "Absolutely. Import from CSV/Excel with field mapping, duplicate detection, and merge capabilities. Contact enrichment auto-fills missing data." },
      ]}
    />
  );
}
