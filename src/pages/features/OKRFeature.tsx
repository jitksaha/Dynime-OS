import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Target, Users, TrendingUp, BarChart3, CheckCircle, GitBranch, Calendar, MessageSquare, Award, Eye } from "lucide-react";

export default function OKRFeature() {
  return (
    <FeaturePageLayout
      title="OKR & Goal Management"
      subtitle="Strategic Execution Layer"
      description="Link individual, team, and company goals to measurable outcomes. Drive alignment and accountability across your entire organization."
      icon={Target}
      gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600"
      features={[
        { title: "Goal Hierarchy", description: "Company → Team → Individual goal cascading with automatic alignment tracking.", icon: GitBranch },
        { title: "Key Results Tracking", description: "Real-time progress tracking with percentage completion and health scoring.", icon: TrendingUp },
        { title: "Quarterly Cycles", description: "Structured OKR cycles with review and retrospective workflows built in.", icon: Calendar },
        { title: "Health Scoring", description: "Automatic goal health: On Track, At Risk, Behind, or Completed with visual indicators.", icon: CheckCircle },
        { title: "Performance Integration", description: "Connect goals to HRM performance reviews and project task completion.", icon: Users },
        { title: "Trend Analytics", description: "OKR history and trend analytics across quarters for continuous improvement.", icon: BarChart3 },
      ]}
      detailSections={[
        {
          id: "hierarchy",
          label: "Goal Hierarchy",
          icon: GitBranch,
          color: "hsl(270,80%,60%)",
          title: "Cascade goals from company to individual",
          description: "Create a clear line of sight from top-level company objectives down to individual contributor key results. Everyone understands how their work drives the mission.",
          points: [
            "Company → Department → Team → Individual cascading",
            "Automatic alignment percentage tracking",
            "Visual dependency mapping between goals",
            "Cross-team goal linking and collaboration",
            "Public vs. private goals with visibility controls",
          ],
        },
        {
          id: "tracking",
          label: "Progress Tracking",
          icon: TrendingUp,
          color: "hsl(142,71%,45%)",
          title: "Real-time progress with smart health scoring",
          description: "Track key results with automatic health scoring that updates in real-time. Identify at-risk goals early and take corrective action before it's too late.",
          points: [
            "Percentage-based key result progress",
            "Automatic health scoring algorithms",
            "Manager comment and feedback threads",
            "Weekly check-in prompts and reminders",
            "Goal completion celebrations and badges",
          ],
        },
        {
          id: "analytics",
          label: "OKR Analytics",
          icon: BarChart3,
          color: "hsl(199,89%,48%)",
          title: "Data-driven insights across quarters",
          description: "Compare OKR performance across quarters, identify patterns, and continuously improve your goal-setting process with rich analytics.",
          points: [
            "Quarter-over-quarter trend analysis",
            "Team and individual completion rates",
            "Goal health distribution dashboards",
            "Alignment score across the organization",
            "Historical retrospective reports",
          ],
        },
      ]}
      stats={[
        { value: "76%", label: "Better team alignment" },
        { value: "3.2x", label: "Faster goal completion" },
        { value: "54%", label: "Improved transparency" },
        { value: "89%", label: "Employee engagement boost" },
      ]}
      useCases={[
        { title: "Tech Startups", description: "Align fast-moving engineering and product teams around quarterly sprint goals and product milestones.", icon: Target },
        { title: "Enterprise Teams", description: "Cascade CEO-level objectives through departments to ensure every team contributes to the company vision.", icon: Users },
        { title: "Sales Organizations", description: "Set revenue targets, pipeline goals, and activity metrics that align to company growth objectives.", icon: TrendingUp },
        { title: "HR & People Teams", description: "Link employee development goals to performance reviews and career progression frameworks.", icon: Award },
      ]}
      benefits={[
        "Company-wide goal alignment",
        "Quarterly OKR cycles with reviews",
        "Real-time health scoring",
        "Manager feedback threads",
        "Performance review integration",
        "Public and private goals",
        "Trend analytics across quarters",
        "Automatic progress tracking",
        "Cross-team goal linking",
        "Goal completion celebrations",
      ]}
      faqs={[
        { q: "How does goal cascading work?", a: "Set company-level objectives, then departments and teams create aligned goals. The system automatically calculates alignment percentages and surfaces misaligned goals." },
        { q: "Can I integrate OKRs with performance reviews?", a: "Yes. OKR completion rates and history feed directly into HRM performance review cycles, giving managers objective data for evaluations." },
        { q: "What happens at the end of a quarter?", a: "The system prompts retrospective reviews, archives completed OKRs, and helps teams plan the next quarter based on historical patterns." },
        { q: "Are goals visible to everyone?", a: "You control visibility. Goals can be public (company-wide), team-only, or private between an employee and their manager." },
      ]}
    />
  );
}
