import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Gamepad2, Trophy, Award, Star, TrendingUp, Users, Zap, Target, Heart, BarChart3 } from "lucide-react";

export default function GamificationFeature() {
  return (
    <FeaturePageLayout
      title="Gamification Engine"
      subtitle="Engagement & Motivation Platform"
      description="Drive engagement, productivity, and healthy competition across your organization with points, badges, leaderboards, and achievement systems."
      icon={Gamepad2}
      gradient="bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500"
      features={[
        { title: "Points System", description: "Award points for task completion, deals closed, training finished, and more.", icon: Star },
        { title: "Badges & Achievements", description: "Custom badges for milestones — first deal, 100th task, top performer of the month.", icon: Award },
        { title: "Leaderboards", description: "Real-time leaderboards by department, team, or company-wide for healthy competition.", icon: Trophy },
        { title: "Challenges", description: "Create time-bound challenges with goals, rewards, and team competitions.", icon: Target },
        { title: "Streaks", description: "Daily and weekly streak tracking for consistent performance and engagement.", icon: Zap },
        { title: "Rewards Store", description: "Redeem points for rewards — gift cards, extra PTO, or custom company perks.", icon: Heart },
      ]}
      detailSections={[
        {
          id: "engagement",
          label: "Employee Engagement",
          icon: Star,
          color: "hsl(38,92%,50%)",
          title: "Turn work into play",
          description: "Gamification mechanics applied across all platform modules — CRM deals, project tasks, training courses, and support tickets all earn points.",
          points: [
            "Cross-module point earning",
            "Custom point values per activity",
            "Automatic point calculation",
            "Department and team competitions",
            "Monthly/quarterly reset cycles",
          ],
        },
        {
          id: "rewards",
          label: "Recognition & Rewards",
          icon: Trophy,
          color: "hsl(270,80%,60%)",
          title: "Recognize and reward excellence",
          description: "Build a culture of recognition with peer nominations, manager awards, and a rewards catalog where points translate to real perks.",
          points: [
            "Peer-to-peer recognition",
            "Manager spotlight awards",
            "Configurable rewards catalog",
            "Points-to-perks redemption",
            "Public celebration feed",
          ],
        },
      ]}
      stats={[
        { value: "35%", label: "Increase in engagement" },
        { value: "28%", label: "Higher task completion rate" },
        { value: "50%", label: "Improvement in training completion" },
        { value: "3x", label: "More peer recognition" },
      ]}
      useCases={[
        { title: "Sales Teams", description: "Deal-closing competitions, quota leaderboards, and top performer badges.", icon: TrendingUp },
        { title: "Support Teams", description: "Ticket resolution speed challenges, customer satisfaction badges, and team goals.", icon: Users },
        { title: "Engineering Teams", description: "Sprint completion streaks, bug fix challenges, and code review badges.", icon: Zap },
        { title: "Company-Wide", description: "Cross-department challenges, wellness goals, and culture-building activities.", icon: Heart },
      ]}
      benefits={[
        "Cross-module point system",
        "Custom badges and achievements",
        "Real-time leaderboards",
        "Team and individual challenges",
        "Streak tracking",
        "Peer recognition",
        "Rewards catalog",
        "Manager spotlight awards",
        "Department competitions",
        "Engagement analytics",
      ]}
      faqs={[
        { q: "What activities earn points?", a: "Any tracked activity across the platform — closing deals, completing tasks, finishing courses, resolving tickets, and more. Point values are fully configurable." },
        { q: "Can I create custom challenges?", a: "Yes. Create time-bound challenges with specific goals, participant rules, and reward tiers for winners." },
        { q: "How do leaderboards work?", a: "Leaderboards rank employees by points earned. Filter by department, team, or company-wide. Configurable time periods (weekly, monthly, quarterly)." },
        { q: "Can points be redeemed for rewards?", a: "Yes. Set up a rewards catalog with perks like gift cards, extra time off, or company swag. Employees redeem points directly from their profile." },
      ]}
    />
  );
}
