import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedAnalytics } from "@/components/illustrations";
import {
  BarChart3, PieChart, TrendingUp, Download, Filter, Layers,
  Building2, Globe, Briefcase, Shield, Target, Heart,
} from "lucide-react";

export default function ReportsFeature() {
  return (
    <FeaturePageLayout
      title="Business Intelligence"
      subtitle="Reports & Analytics"
      description="Turn data into decisions. Build custom dashboards, generate reports, and visualize key metrics across your entire business."
      icon={BarChart3}
      gradient="bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600"
      heroIllustration={<AnimatedAnalytics />}
      features={[
        { title: "Custom Dashboards", description: "Build personalized dashboards with drag-and-drop widgets and real-time data.", icon: Layers },
        { title: "Visual Charts", description: "Bar charts, pie charts, line graphs, and more to visualize any metric.", icon: PieChart },
        { title: "Trend Analysis", description: "Spot trends over time with automatic comparisons and growth tracking.", icon: TrendingUp },
        { title: "Export & Share", description: "Export reports as PDF, Excel, or CSV. Schedule automatic email delivery.", icon: Download },
        { title: "Advanced Filters", description: "Filter by date range, department, module, user, and custom fields.", icon: Filter },
        { title: "Cross-Module Reports", description: "Combine data from HRMS, CRM, Accounting, and more in unified reports.", icon: BarChart3 },
      ]}
      detailSections={[
        {
          id: "dashboards",
          label: "Custom Dashboards",
          icon: Layers,
          color: "hsl(290,65%,55%)",
          title: "Dashboards tailored to your KPIs",
          description: "Drag-and-drop widgets to build dashboards that show exactly what matters. Save, share, and schedule them for automated delivery to stakeholders.",
          points: [
            "Drag-and-drop widget placement",
            "Real-time data refresh",
            "Role-based dashboard access",
            "Scheduled email delivery",
            "Embeddable dashboard links",
          ],
        },
        {
          id: "cross-module",
          label: "Cross-Module Analytics",
          icon: BarChart3,
          color: "hsl(38,92%,50%)",
          title: "One view across your entire operation",
          description: "Combine data from HR, CRM, Accounting, Projects, and more into unified reports. Spot correlations and trends that siloed data would never reveal.",
          points: [
            "Data from all modules in one report",
            "Automatic cross-module correlations",
            "Custom calculated fields",
            "Drill-down from summary to detail",
            "Data comparison across time periods",
          ],
        },
        {
          id: "exports",
          label: "Export & Distribution",
          icon: Download,
          color: "hsl(142,71%,45%)",
          title: "Reports where and when you need them",
          description: "Export to PDF, Excel, or CSV with custom formatting. Schedule reports to land in stakeholders' inboxes automatically — daily, weekly, or monthly.",
          points: [
            "Export to PDF, Excel, and CSV",
            "Custom branding on exports",
            "Scheduled report delivery via email",
            "Shareable dashboard links",
            "API access for external BI tools",
          ],
        },
      ]}
      stats={[
        { value: "70%", label: "Faster decision making" },
        { value: "100+", label: "Pre-built report templates" },
        { value: "5min", label: "Average dashboard setup time" },
        { value: "360°", label: "Business visibility" },
      ]}
      useCases={[
        { title: "Executive Leadership", description: "Company-wide KPI dashboards with financial health, team productivity, and growth metrics.", icon: Target },
        { title: "Sales Teams", description: "Pipeline analytics, conversion funnels, revenue forecasts, and rep performance tracking.", icon: TrendingUp },
        { title: "HR Directors", description: "Workforce analytics, attrition trends, hiring funnel metrics, and payroll summaries.", icon: Building2 },
        { title: "Finance", description: "P&L dashboards, budget tracking, expense analysis, and cash flow projections.", icon: Briefcase },
        { title: "Operations", description: "Process efficiency metrics, SLA compliance, and resource utilization reports.", icon: Globe },
        { title: "Compliance", description: "Audit-ready reports, regulatory compliance tracking, and risk assessment dashboards.", icon: Shield },
      ]}
      benefits={[
        "Data-driven decision making",
        "Real-time KPI dashboards",
        "Automated report scheduling",
        "Cross-module data insights",
        "Export in multiple formats",
        "Custom date range analysis",
        "Team performance tracking",
        "Revenue & growth forecasting",
        "Pre-built report templates",
        "Role-based report access",
      ]}
      faqs={[
        { q: "Can I build custom reports?", a: "Yes. Use the report builder to select data sources, apply filters, choose visualization types, and save for reuse." },
        { q: "Does it combine data from all modules?", a: "Absolutely. Pull data from HR, CRM, Accounting, Projects, and any other module into a single unified report." },
        { q: "Can reports be scheduled?", a: "Yes. Schedule any report for daily, weekly, or monthly delivery via email to any stakeholder — internal or external." },
        { q: "What export formats are supported?", a: "Export to PDF (with custom branding), Excel (with formulas preserved), CSV, and shareable web links." },
      ]}
    />
  );
}
