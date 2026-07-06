import FeaturePageLayout from "@/components/FeaturePageLayout";
import {
  Calendar, Clock, Users, Bell, Globe, Repeat,
  Briefcase, Building2, GraduationCap, Heart, Video, Layers,
} from "lucide-react";

export default function CalendarFeature() {
  return (
    <FeaturePageLayout
      title="Smart Calendar & Scheduling"
      subtitle="Events & Time Management"
      description="A unified calendar that syncs events across all modules — meetings, tasks, deadlines, and reminders in one beautiful view."
      icon={Calendar}
      gradient="bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-600"
      features={[
        { title: "Multi-View Calendar", description: "Switch between day, week, and month views with color-coded events by type.", icon: Calendar },
        { title: "Event Management", description: "Create, edit, and manage events with attendees, locations, and descriptions.", icon: Clock },
        { title: "Team Scheduling", description: "View team availability, schedule meetings, and avoid conflicts effortlessly.", icon: Users },
        { title: "Smart Reminders", description: "Configurable reminders ensure you never miss an important meeting or deadline.", icon: Bell },
        { title: "Google Calendar Sync", description: "Two-way sync with Google Calendar keeps all your events in perfect harmony.", icon: Globe },
        { title: "Recurring Events", description: "Set up daily, weekly, or monthly recurring events with flexible rules.", icon: Repeat },
      ]}
      detailSections={[
        {
          id: "views",
          label: "Calendar Views",
          icon: Layers,
          color: "hsl(199,89%,48%)",
          title: "See your schedule, your way",
          description: "Switch between day, week, and month views instantly. Events are color-coded by type — meetings, tasks, deadlines — so you can scan your schedule at a glance.",
          points: [
            "Day view with hourly time slots",
            "Week view with drag-to-reschedule",
            "Month view with event density indicators",
            "Color-coded event categories",
            "All-day event support",
          ],
        },
        {
          id: "sync",
          label: "Calendar Sync",
          icon: Globe,
          color: "hsl(142,71%,45%)",
          title: "One calendar to rule them all",
          description: "Connect Google Calendar for two-way sync. CRM meetings, project deadlines, and HR events automatically appear in your unified calendar.",
          points: [
            "Google Calendar two-way sync",
            "CRM deal follow-ups auto-added",
            "Project milestone integration",
            "HR leave & holiday overlay",
            "Cross-module event aggregation",
          ],
        },
      ]}
      stats={[
        { value: "50%", label: "Fewer scheduling conflicts" },
        { value: "2x", label: "Meeting preparation time saved" },
        { value: "30%", label: "Better team coordination" },
        { value: "100%", label: "Cross-module event visibility" },
      ]}
      useCases={[
        { title: "Sales Teams", description: "Schedule prospect meetings, demo calls, and follow-ups directly from CRM deals.", icon: Briefcase },
        { title: "HR Departments", description: "Manage interview schedules, company holidays, and team events in one view.", icon: Building2 },
        { title: "Project Managers", description: "Track project milestones, sprint reviews, and team standup schedules.", icon: GraduationCap },
        { title: "Client Services", description: "Schedule client calls, service appointments, and review meetings seamlessly.", icon: Heart },
      ]}
      benefits={[
        "Unified view across all modules",
        "Google Calendar sync",
        "Color-coded event types",
        "Recurring event support",
        "Smart conflict detection",
        "Attendee management",
        "Configurable reminders",
        "Mobile-responsive design",
      ]}
      faqs={[
        { q: "Does it sync with Google Calendar?", a: "Yes. Two-way sync keeps your Google Calendar and platform events perfectly aligned in real-time." },
        { q: "Can I see events from other modules?", a: "Absolutely. CRM follow-ups, project deadlines, HR leaves, and more appear automatically in your calendar." },
        { q: "Are recurring events supported?", a: "Yes. Create daily, weekly, monthly, or custom recurring events with flexible recurrence rules." },
        { q: "Can I share my calendar with teammates?", a: "Yes. Team calendars allow shared visibility, and you can check team availability before scheduling meetings." },
      ]}
    />
  );
}
