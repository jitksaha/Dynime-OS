import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Video, Calendar, Users, Link2, Settings, Shield, Globe, Monitor, Clock } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function MeetingsFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} Meetings`}
      subtitle="Video Conferencing"
      description="Schedule, host, and join video meetings directly from your dashboard — with calendar sync, instant meetings, and provider integrations."
      icon={Video}
      gradient="bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-600"
      features={[
        { title: "Instant Meetings", description: "Start a video call instantly with a shareable link — no scheduling needed.", icon: Monitor },
        { title: "Schedule Ahead", description: "Plan meetings with date, time, and attendee invitations from the calendar.", icon: Calendar },
        { title: "Provider Support", description: "Connect Zoom, Google Meet, or Jitsi for seamless video conferencing.", icon: Link2 },
        { title: "Calendar Sync", description: "Two-way sync with Google Calendar to keep all events in one place.", icon: Clock },
        { title: "Team Rooms", description: "Persistent meeting rooms for recurring standups and team syncs.", icon: Users },
        { title: "Secure Links", description: "Password-protected meetings with waiting room functionality.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "scheduling",
          label: "Scheduling",
          icon: Calendar,
          color: "hsl(210,80%,55%)",
          title: "Smart Scheduling",
          description: "Schedule meetings with automatic timezone detection, attendee availability checks, and calendar integration.",
          points: ["Timezone auto-detect", "Attendee invitations", "Recurring meetings", "Buffer time settings"],
        },
        {
          id: "providers",
          label: "Providers",
          icon: Globe,
          color: "hsl(142,71%,45%)",
          title: "Multiple Video Providers",
          description: "Choose your preferred video platform — Zoom, Google Meet, or self-hosted Jitsi — and switch anytime.",
          points: ["Zoom integration", "Google Meet", "Jitsi self-hosted", "Custom provider URLs"],
        },
        {
          id: "dashboard",
          label: "Dashboard",
          icon: Settings,
          color: "hsl(38,92%,50%)",
          title: "Meeting Dashboard Widget",
          description: "See upcoming meetings, join with one click, and manage your schedule directly from the main dashboard.",
          points: ["Upcoming meetings list", "One-click join", "Quick schedule", "Meeting history"],
        },
      ]}
      benefits={[
        "Instant meeting links",
        "Calendar synchronisation",
        "Multi-provider support",
        "Team meeting rooms",
        "Password protection",
        "Dashboard widget",
      ]}
    />
  );
}
