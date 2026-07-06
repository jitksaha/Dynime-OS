import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedWorkflow } from "@/components/illustrations";
import {
  GitBranch, Zap, Settings, Clock, Shield, Layers,
  Building2, Globe, Briefcase, BarChart3, Heart, Target,
} from "lucide-react";

export default function WorkflowsFeature() {
  return (
    <FeaturePageLayout
      title="Visual Workflow Builder"
      subtitle="Automation Engine"
      description="Automate any business process with our visual drag-and-drop builder. Set triggers, conditions, and actions without writing code."
      icon={GitBranch}
      gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600"
      heroIllustration={<AnimatedWorkflow />}
      features={[
        { title: "Drag & Drop Builder", description: "Build complex workflows visually with our intuitive canvas-based builder.", icon: GitBranch },
        { title: "Smart Triggers", description: "Start workflows on events like form submissions, schedule changes, or status updates.", icon: Zap },
        { title: "Conditional Logic", description: "Add if/else branches, loops, and parallel paths to handle any business scenario.", icon: Settings },
        { title: "Scheduled Automation", description: "Run workflows on schedule — daily reports, weekly summaries, monthly cleanups.", icon: Clock },
        { title: "Approval Chains", description: "Multi-level approval workflows with escalation rules and SLA tracking.", icon: Shield },
        { title: "Cross-Module Actions", description: "Connect HRMS, CRM, Accounting, and more in a single automated workflow.", icon: Layers },
      ]}
      detailSections={[
        {
          id: "builder",
          label: "Flow Builder",
          icon: GitBranch,
          color: "hsl(270,80%,60%)",
          title: "Build automation without a single line of code",
          description: "Our visual canvas lets you drag triggers, conditions, and actions into powerful workflows. Preview, test, and deploy — all from one screen.",
          points: [
            "Drag-and-drop visual canvas",
            "Pre-built action templates",
            "Conditional branching & loops",
            "Test mode with sample data",
            "Version history & rollback",
          ],
        },
        {
          id: "triggers",
          label: "Triggers & Events",
          icon: Zap,
          color: "hsl(38,92%,50%)",
          title: "Trigger automation from any event",
          description: "Start workflows when records change, forms are submitted, schedules fire, or external webhooks arrive. Combine multiple triggers for complex scenarios.",
          points: [
            "Database change triggers (create, update, delete)",
            "Scheduled triggers (cron-based)",
            "Webhook triggers from external systems",
            "Manual trigger with input forms",
            "Conditional trigger filtering",
          ],
        },
        {
          id: "approvals",
          label: "Approval Workflows",
          icon: Shield,
          color: "hsl(142,71%,45%)",
          title: "Multi-level approvals made simple",
          description: "Define approval chains with automatic escalation. Sequential, parallel, or hierarchical — handle any organizational structure.",
          points: [
            "Sequential & parallel approval paths",
            "Auto-escalation on timeout",
            "Delegation & substitute approvers",
            "Mobile-friendly approval actions",
            "Complete audit trail",
          ],
        },
      ]}
      stats={[
        { value: "80%", label: "Less manual work" },
        { value: "5min", label: "Average workflow setup time" },
        { value: "10K+", label: "Automations running monthly" },
        { value: "99.9%", label: "Execution reliability" },
      ]}
      useCases={[
        { title: "HR Approvals", description: "Leave requests, expense claims, and salary changes with multi-level approval chains.", icon: Building2 },
        { title: "Sales Follow-ups", description: "Automated follow-up tasks when deals stall, with escalation to managers.", icon: Target },
        { title: "Invoice Processing", description: "Auto-generate invoices on project completion, send reminders, and track payments.", icon: Briefcase },
        { title: "Onboarding", description: "New employee or customer onboarding with automated task creation and notifications.", icon: Globe },
        { title: "Compliance", description: "Automated compliance checks, document expiry alerts, and audit trail generation.", icon: Shield },
        { title: "Reporting", description: "Scheduled report generation and distribution to stakeholders.", icon: BarChart3 },
      ]}
      benefits={[
        "Eliminate manual repetitive tasks",
        "No-code workflow creation",
        "Cross-module automation",
        "Built-in approval chains",
        "Scheduled task execution",
        "Error handling & retries",
        "Workflow version history",
        "Real-time execution logs",
        "Webhook integration support",
        "Complete audit trail",
      ]}
      faqs={[
        { q: "Do I need to know how to code?", a: "Not at all. The visual builder is completely no-code. Drag triggers, conditions, and actions onto the canvas and connect them." },
        { q: "Can workflows connect to external systems?", a: "Yes. Use webhook triggers and HTTP actions to integrate with any external API or service." },
        { q: "What happens if a workflow fails?", a: "Failed steps are retried automatically based on your configuration. You'll get notifications and can inspect the full execution log." },
        { q: "Can I schedule workflows?", a: "Yes. Set up cron-based schedules for recurring automations — daily reports, weekly cleanups, monthly summaries." },
      ]}
    />
  );
}
