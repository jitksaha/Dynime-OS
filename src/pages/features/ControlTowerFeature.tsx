import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Activity, Monitor, Bell, BarChart3, Zap, Eye, AlertTriangle, Clock, Users, Server } from "lucide-react";

export default function ControlTowerFeature() {
  return (
    <FeaturePageLayout
      title="Real-Time Operations Monitor"
      subtitle="Control Tower Dashboard"
      description="A unified command center providing real-time visibility into all business operations — sales, HR, finance, projects, and support — from a single screen."
      icon={Activity}
      gradient="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700"
      features={[
        { title: "Live Dashboard", description: "Real-time metrics from all modules displayed on a single unified dashboard.", icon: Monitor },
        { title: "Anomaly Detection", description: "Automatic detection of unusual patterns — revenue dips, ticket spikes, attendance drops.", icon: AlertTriangle },
        { title: "Smart Alerts", description: "Configurable threshold-based alerts pushed to managers and executives.", icon: Bell },
        { title: "Cross-Module KPIs", description: "Track KPIs spanning CRM, HRM, Accounting, and Projects in one view.", icon: BarChart3 },
        { title: "Executive View", description: "Simplified high-level view for executives with drill-down capability.", icon: Eye },
        { title: "Automation Triggers", description: "Trigger automated workflows when metrics cross defined thresholds.", icon: Zap },
      ]}
      detailSections={[
        {
          id: "monitoring",
          label: "Live Monitoring",
          icon: Monitor,
          color: "hsl(270,80%,60%)",
          title: "See everything, in real time",
          description: "Every key metric from every module streams into one dashboard. Sales pipeline, employee attendance, cash flow, support tickets — all live.",
          points: [
            "Real-time data from all modules",
            "Customizable widget layout",
            "Auto-refreshing metrics",
            "Historical trend overlays",
            "Multi-location monitoring",
          ],
        },
        {
          id: "intelligence",
          label: "Operational Intelligence",
          icon: AlertTriangle,
          color: "hsl(0,72%,50%)",
          title: "Catch problems before they escalate",
          description: "Pattern detection algorithms identify anomalies and alert the right people. Revenue drops, support spikes, and operational bottlenecks are flagged automatically.",
          points: [
            "Anomaly detection algorithms",
            "Threshold-based alert rules",
            "Escalation management",
            "Root cause drill-down",
            "Incident timeline tracking",
          ],
        },
      ]}
      stats={[
        { value: "Real-time", label: "Data refresh across modules" },
        { value: "85%", label: "Faster issue detection" },
        { value: "60%", label: "Reduction in escalations" },
        { value: "360°", label: "Business visibility" },
      ]}
      useCases={[
        { title: "C-Suite Executives", description: "High-level business health view with drill-down into any department or metric.", icon: Eye },
        { title: "Operations Managers", description: "Monitor cross-functional KPIs and trigger workflows on threshold breaches.", icon: Activity },
        { title: "Regional Managers", description: "Multi-location performance comparison with territory-based filtering.", icon: Users },
        { title: "IT Operations", description: "System health monitoring with uptime tracking and performance alerts.", icon: Server },
      ]}
      benefits={[
        "Unified cross-module dashboard",
        "Real-time data streaming",
        "Anomaly detection",
        "Threshold-based alerts",
        "Executive summary view",
        "Drill-down analytics",
        "Automation triggers",
        "Multi-location support",
        "Custom widget layout",
        "Historical trend analysis",
      ]}
      faqs={[
        { q: "What data is shown on the Control Tower?", a: "Key metrics from every module — active deals, revenue, employee attendance, open tickets, project progress, cash flow, and more — all in real time." },
        { q: "Can I customize the dashboard?", a: "Yes. Add, remove, and rearrange widgets. Choose which metrics matter most to you and configure alert thresholds per widget." },
        { q: "How does anomaly detection work?", a: "The system learns normal patterns and flags deviations — like a sudden drop in daily revenue or spike in support tickets — with configurable sensitivity." },
        { q: "Can it trigger automated actions?", a: "Yes. Configure rules like 'If open tickets exceed 50, notify the support manager and create an escalation task automatically.'" },
      ]}
    />
  );
}
