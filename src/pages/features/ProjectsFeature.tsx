import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedDashboard } from "@/components/illustrations";
import {
  FolderKanban, CheckSquare, Users, Calendar, Target, MessageSquare,
  Building2, Globe, Briefcase, Layers, Clock, BarChart3,
  GanttChart, DollarSign, AlertTriangle, Share2,
} from "lucide-react";

export default function ProjectsFeature() {
  return (
    <FeaturePageLayout
      title="Project Management"
      subtitle="Projects & Tasks"
      description="Plan, track, and deliver projects with Gantt charts, time tracking, resource allocation, budget management, and client-facing status pages."
      icon={FolderKanban}
      gradient="bg-gradient-to-br from-amber-500 via-orange-500 to-red-600"
      heroIllustration={<AnimatedDashboard />}
      features={[
        { title: "Gantt Chart View", description: "Interactive timeline with dependency arrows, critical path highlighting, and drag-to-reschedule.", icon: Calendar },
        { title: "Time Tracking", description: "Per-task time logging by team members with billable/non-billable classification.", icon: Clock },
        { title: "Resource Allocation", description: "Visual capacity planner showing team member workload across all projects.", icon: Users },
        { title: "Project Budget Tracking", description: "Planned vs. actual spend per project with budget alert thresholds.", icon: DollarSign },
        { title: "Client Status Pages", description: "Shareable project status pages for external clients without giving full access.", icon: Share2 },
        { title: "Milestone Billing", description: "Auto-trigger invoice generation on milestone completion for seamless billing.", icon: Target },
      ]}
      detailSections={[
        {
          id: "gantt",
          label: "Gantt & Timeline",
          icon: Calendar,
          color: "hsl(38,92%,50%)",
          title: "Visual project planning with dependencies",
          description: "Interactive Gantt charts with task dependencies, critical path highlighting, and drag-to-reschedule. See your entire project timeline at a glance.",
          points: [
            "Dependency arrows between tasks",
            "Critical path auto-highlighting",
            "Drag to reschedule with auto-adjust",
            "Milestone markers on the timeline",
            "Multi-project timeline overlay",
          ],
        },
        {
          id: "time",
          label: "Time & Resource Tracking",
          icon: Clock,
          color: "hsl(200,80%,55%)",
          title: "Track time and optimize resources",
          description: "Team members log time per task with billable/non-billable tags. Resource allocation views show capacity across projects to prevent overloading.",
          points: [
            "Per-task time logging with timer",
            "Billable vs. non-billable classification",
            "Team workload heatmap view",
            "Resource capacity planning",
            "Utilization rate analytics",
          ],
        },
        {
          id: "budget",
          label: "Project Budgets",
          icon: DollarSign,
          color: "hsl(142,71%,45%)",
          title: "Keep projects profitable",
          description: "Set budgets per project, track actual spending against plans, and receive alerts when thresholds are crossed. Milestone billing auto-generates invoices on completion.",
          points: [
            "Budget allocation per project",
            "Actual vs. planned spend tracking",
            "Budget alert thresholds",
            "Milestone-triggered invoicing",
            "Profitability analysis per project",
          ],
        },
        {
          id: "client",
          label: "Client Collaboration",
          icon: Share2,
          color: "hsl(270,80%,60%)",
          title: "Keep clients informed, effortlessly",
          description: "Generate shareable status pages for external clients. They see progress, milestones, and deliverables without accessing your internal project tools.",
          points: [
            "Branded client status pages",
            "Progress bar and milestone view",
            "File sharing with clients",
            "Risk log with mitigation tracking",
            "Client feedback collection",
          ],
        },
      ]}
      stats={[
        { value: "30%", label: "Faster project delivery" },
        { value: "45%", label: "Fewer missed deadlines" },
        { value: "3x", label: "Better team visibility" },
        { value: "25%", label: "More billable hours captured" },
      ]}
      useCases={[
        { title: "Software Development", description: "Sprint planning, bug tracking, and release management with agile-friendly boards and time tracking.", icon: Layers },
        { title: "Marketing Agencies", description: "Campaign planning, retainer billing, resource utilization, and client-facing status pages.", icon: Globe },
        { title: "Consulting", description: "Client project tracking, billable hour logging, milestone billing, and profitability analysis.", icon: Briefcase },
        { title: "Construction", description: "Phase-based project planning with BOQ tracking, subcontractor management, and site progress reporting.", icon: Building2 },
        { title: "Event Management", description: "Timeline-driven planning with vendor coordination, budget tracking, and checklist management.", icon: Clock },
        { title: "Product Teams", description: "Roadmap planning, feature prioritization, dependency tracking, and cross-team resource allocation.", icon: BarChart3 },
      ]}
      benefits={[
        "Interactive Gantt charts with dependencies",
        "Per-task time tracking",
        "Billable/non-billable classification",
        "Resource capacity planning",
        "Project budget tracking",
        "Milestone-triggered invoicing",
        "Client-facing status pages",
        "Risk log & mitigation tracking",
        "Multi-project portfolio view",
        "Automated status notifications",
      ]}
      faqs={[
        { q: "How does time tracking work?", a: "Team members log time per task with a built-in timer or manual entry. Tag entries as billable or non-billable. Managers see utilization reports across the team." },
        { q: "Can clients see project progress?", a: "Yes. Generate branded status pages that clients access via a shareable link. They see milestones, progress, and deliverables without needing a login." },
        { q: "How does milestone billing work?", a: "Define billing milestones on the project. When a milestone is marked complete, the system auto-generates an invoice for the associated amount." },
        { q: "Can I manage resource allocation?", a: "Yes. See each team member's workload in a visual heatmap. Identify overloaded or underutilized resources and rebalance work across the team." },
        { q: "Does it support Gantt charts?", a: "Yes. Interactive Gantt charts with dependency arrows, critical path highlighting, drag-to-reschedule, and multi-project overlay views." },
      ]}
    />
  );
}
