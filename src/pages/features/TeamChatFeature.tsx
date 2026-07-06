import FeaturePageLayout from "@/components/FeaturePageLayout";
import {
  MessageSquare, Users, Smile, Bell, Search, Shield,
  Zap, Globe, Briefcase, Heart, Building2, GraduationCap,
} from "lucide-react";

export default function TeamChatFeature() {
  return (
    <FeaturePageLayout
      title="Real-Time Team Chat"
      subtitle="Internal Communication"
      description="Keep your team connected with instant messaging, channels, reactions, and real-time presence — all built into your workspace."
      icon={MessageSquare}
      gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600"
      features={[
        { title: "Group Channels", description: "Create topic-based channels for departments, projects, or any team grouping.", icon: Users },
        { title: "Direct Messages", description: "Private 1-on-1 conversations with searchable team directory and online indicators.", icon: MessageSquare },
        { title: "Emoji Reactions", description: "React to messages with emojis for quick acknowledgement without cluttering the chat.", icon: Smile },
        { title: "Live Presence", description: "See who's online in real-time with heartbeat-powered presence indicators.", icon: Bell },
        { title: "Message Search", description: "Full-text search across all channels and DMs to find any conversation instantly.", icon: Search },
        { title: "Secure & Private", description: "Role-based access, tenant isolation, and encrypted channels keep conversations secure.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "channels",
          label: "Channels & Groups",
          icon: Users,
          color: "hsl(270,80%,60%)",
          title: "Organized conversations that scale",
          description: "Create unlimited channels for teams, projects, or topics. Pin important messages, manage members, and keep conversations focused and searchable.",
          points: [
            "Unlimited public and private channels",
            "Department-based auto-join channels",
            "Pin important messages for quick reference",
            "Member management with role-based access",
            "Channel descriptions and topic headers",
          ],
        },
        {
          id: "realtime",
          label: "Real-Time Engine",
          icon: Zap,
          color: "hsl(38,92%,50%)",
          title: "Instant delivery, zero lag",
          description: "Messages appear the moment they're sent. Typing indicators, read receipts, and live presence create a fluid communication experience.",
          points: [
            "Sub-second message delivery",
            "Live typing indicators",
            "Online/offline status with last seen",
            "Smart message grouping (3-min window)",
            "Sticky date headers for context",
          ],
        },
      ]}
      stats={[
        { value: "45%", label: "Fewer internal emails" },
        { value: "<1s", label: "Message delivery time" },
        { value: "3x", label: "Faster team decisions" },
        { value: "92%", label: "Team adoption rate" },
      ]}
      useCases={[
        { title: "Remote Teams", description: "Bridge the distance gap with instant messaging, presence indicators, and async-friendly channels.", icon: Globe },
        { title: "Project Coordination", description: "Dedicated project channels keep discussions organized alongside task management.", icon: Briefcase },
        { title: "HR Announcements", description: "Broadcast company news, policy updates, and celebrations to the entire organization.", icon: Building2 },
        { title: "Customer Support Teams", description: "Internal escalation channels help resolve complex tickets faster with team collaboration.", icon: Heart },
      ]}
      benefits={[
        "Replace scattered email threads",
        "Real-time presence and status",
        "Searchable conversation history",
        "Department & project channels",
        "Emoji reactions for quick feedback",
        "Secure tenant-isolated messaging",
        "Mobile-friendly responsive design",
        "Seamless platform integration",
      ]}
      faqs={[
        { q: "Is chat data isolated between companies?", a: "Yes. All messages and channels are strictly tenant-isolated. No company can access another's conversations." },
        { q: "Can I create private channels?", a: "Yes. Create invite-only channels for sensitive discussions. Only invited members can view and participate." },
        { q: "Does it work on mobile?", a: "Absolutely. The chat is fully responsive with optimized layouts for phones and tablets." },
        { q: "How are messages stored?", a: "Messages are stored securely in the database with full encryption at rest. Search indexing enables instant full-text search." },
      ]}
    />
  );
}
