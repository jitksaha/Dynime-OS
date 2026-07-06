import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedDashboard } from "@/components/illustrations";
import {
  Headphones, MessageSquare, Clock, BookOpen, BarChart3, Users,
  Globe, Building2, ShoppingCart, Zap, Shield, Heart,
} from "lucide-react";

export default function HelpdeskFeature() {
  return (
    <FeaturePageLayout
      title="Customer Support Helpdesk"
      subtitle="Helpdesk & Support"
      description="Deliver exceptional customer support with smart ticket management, SLA tracking, and a self-service knowledge base."
      icon={Headphones}
      gradient="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600"
      heroIllustration={<AnimatedDashboard />}
      features={[
        { title: "Ticket Management", description: "Create, assign, prioritize, and track support tickets with custom workflows.", icon: MessageSquare },
        { title: "SLA Tracking", description: "Define SLAs per priority level and get alerts before breaches occur.", icon: Clock },
        { title: "Knowledge Base", description: "Build a searchable help center so customers can find answers themselves.", icon: BookOpen },
        { title: "Customer Portal", description: "Let customers submit and track tickets through a branded self-service portal.", icon: Users },
        { title: "Support Analytics", description: "Track resolution times, agent performance, and customer satisfaction scores.", icon: BarChart3 },
        { title: "Multi-Channel Support", description: "Manage support from email, chat, and phone — all in one unified inbox.", icon: Headphones },
      ]}
      detailSections={[
        {
          id: "tickets",
          label: "Smart Ticketing",
          icon: MessageSquare,
          color: "hsl(0,72%,50%)",
          title: "Resolve tickets faster with smart routing",
          description: "Auto-assign tickets based on agent expertise, current workload, and priority. Custom statuses, tags, and workflows ensure nothing falls through the cracks.",
          points: [
            "Auto-routing based on category & expertise",
            "Custom ticket statuses & workflows",
            "Internal notes & team collaboration",
            "Canned responses for common issues",
            "Ticket merging & linking",
          ],
        },
        {
          id: "sla",
          label: "SLA Management",
          icon: Clock,
          color: "hsl(243,75%,58%)",
          title: "Never breach an SLA again",
          description: "Define response and resolution targets per priority level. Real-time SLA clocks, escalation rules, and breach alerts keep your team on track.",
          points: [
            "Per-priority SLA targets",
            "Real-time countdown timers",
            "Auto-escalation on approaching breach",
            "SLA compliance reporting",
            "Business hours & holiday exclusions",
          ],
        },
        {
          id: "knowledge",
          label: "Knowledge Base",
          icon: BookOpen,
          color: "hsl(142,71%,45%)",
          title: "Self-service that reduces ticket volume",
          description: "Build a searchable knowledge base that deflects common questions. AI-powered suggestions show relevant articles before customers even submit a ticket.",
          points: [
            "Categorized article management",
            "Full-text search with instant results",
            "Article suggestion during ticket creation",
            "View analytics per article",
            "Feedback ratings & improvement tracking",
          ],
        },
      ]}
      stats={[
        { value: "50%", label: "Faster ticket resolution" },
        { value: "35%", label: "Fewer tickets with knowledge base" },
        { value: "98%", label: "SLA compliance rate" },
        { value: "4.8★", label: "Average customer satisfaction" },
      ]}
      useCases={[
        { title: "SaaS Support", description: "Tiered support with priority-based SLAs, feature request tracking, and bug report management.", icon: Globe },
        { title: "E-Commerce", description: "Order inquiries, return/refund management, and shipping issue resolution.", icon: ShoppingCart },
        { title: "IT Helpdesk", description: "Internal IT support with asset tracking, access requests, and change management.", icon: Building2 },
        { title: "Healthcare", description: "Patient inquiry management, appointment issues, and insurance claim support.", icon: Heart },
        { title: "Financial Services", description: "Account inquiries, transaction disputes, and compliance-related support.", icon: Shield },
        { title: "Telecom", description: "Service outage tracking, billing inquiries, and plan upgrade support.", icon: Zap },
      ]}
      benefits={[
        "50% faster ticket resolution",
        "SLA compliance tracking",
        "Self-service knowledge base",
        "Customer satisfaction surveys",
        "Agent performance metrics",
        "Automated ticket routing",
        "Canned responses library",
        "Escalation management",
        "Multi-channel unified inbox",
        "Customer portal with ticket tracking",
      ]}
      faqs={[
        { q: "Can customers submit tickets without logging in?", a: "Yes. You can enable a public submission form or email-to-ticket functionality for unregistered customers." },
        { q: "How does auto-routing work?", a: "Tickets are automatically assigned based on rules you define — category, keywords, customer type, or round-robin distribution." },
        { q: "Can I customize SLA policies?", a: "Yes. Create different SLA policies per priority level, customer tier, or ticket category with unique response and resolution targets." },
        { q: "Does it support internal IT helpdesk?", a: "Absolutely. Use it for internal IT support with employee-facing portals, asset tracking, and internal SLAs." },
      ]}
    />
  );
}
