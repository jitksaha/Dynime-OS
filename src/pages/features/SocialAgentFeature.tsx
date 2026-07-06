// @ts-nocheck
import FeaturePageLayout from "@/components/FeaturePageLayout";
import {
  Bot, MessageSquare, Shield, BarChart3, Inbox, Brain, Target,
} from "lucide-react";

export default function SocialAgentFeature() {
  return (
    <FeaturePageLayout
      title="AI Social Agent that replies like a human, 24/7"
      subtitle="Dynime AI Social Agent"
      description="Connect Instagram, Facebook, Messenger, WhatsApp Business and X. Our AI reads every incoming DM, comment and message, replies instantly with your brand voice, and escalates the tricky ones to your team."
      icon={Bot}
      gradient="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600"
      features={[
        { title: "Auto-reply on every channel", description: "Instagram DMs, Facebook & Messenger, WhatsApp Business, and X — one inbox, one AI brain.", icon: MessageSquare },
        { title: "Trained on your business", description: "Upload FAQs, product info, policies and prices. The agent only answers from your knowledge base — no hallucinations.", icon: Brain },
        { title: "Smart escalation", description: "Low-confidence, complaints, refunds or VIP customers are routed instantly to a human agent.", icon: Shield },
        { title: "Human-in-the-loop", description: "Reply manually from the unified inbox any time. AI suggests draft responses you can edit and send.", icon: Inbox },
        { title: "Lead capture & CTAs", description: "Auto-suggest booking links, product pages, signup forms and capture leads straight into your CRM.", icon: Target },
        { title: "Analytics & insights", description: "Response time, deflection rate, top intents, sentiment trends — across every social channel.", icon: BarChart3 },
      ]}
      detailSections={[
        {
          id: "channels",
          label: "Channels",
          icon: MessageSquare,
          color: "hsl(260,80%,60%)",
          title: "One agent. Every social inbox.",
          description: "Bring your own platform credentials. The agent connects directly to Meta, WhatsApp Business and X APIs — no third-party middleman, no per-message markup.",
          points: [
            "Instagram Direct Messages & comment replies",
            "Facebook Page messages & Messenger",
            "WhatsApp Business API (Meta Cloud)",
            "X / Twitter DMs & mentions",
            "Tenant-managed credentials — your tokens stay with you",
            "Webhook URLs auto-generated per channel",
          ],
        },
        {
          id: "ai",
          label: "AI Brain",
          icon: Brain,
          color: "hsl(280,75%,60%)",
          title: "Sounds like you, not like a bot",
          description: "Configure tone, fallback messages, blacklist topics and confidence thresholds. The agent uses your knowledge base + RAG to answer with accuracy.",
          points: [
            "Custom tone: friendly, professional, witty, formal",
            "Confidence threshold to auto-escalate uncertain replies",
            "Blacklist topics the AI must never discuss",
            "Multi-language support (English, Bangla, Arabic)",
            "Strict mode: never invent — only answer from your KB",
            "Per-channel greeting templates",
          ],
        },
        {
          id: "inbox",
          label: "Unified Inbox",
          icon: Inbox,
          color: "hsl(199,89%,48%)",
          title: "See everything, reply anywhere",
          description: "All conversations from every channel land in one inbox. See AI replies in real-time, take over a chat, assign to teammates, add internal notes.",
          points: [
            "Real-time message stream across all platforms",
            "Take over from AI mid-conversation",
            "Assign conversations to specific agents",
            "Internal notes & tagging",
            "Customer profile sidebar with full history",
            "Quick replies & saved responses",
          ],
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart3,
          color: "hsl(142,71%,45%)",
          title: "Prove the ROI of every conversation",
          description: "Measure how much time your team saves, which intents drive sales, and where the AI is winning or losing.",
          points: [
            "Auto-deflection rate & human escalation rate",
            "Average response time per channel",
            "Top intents & questions asked",
            "Sentiment trends over time",
            "Lead conversion from social conversations",
            "Per-agent performance dashboards",
          ],
        },
      ]}
    />
  );
}
