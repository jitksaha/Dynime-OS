import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Calculator, TrendingUp, BarChart3, PieChart, ArrowUpDown, FileCheck, AlertTriangle, Building2, Layers, DollarSign } from "lucide-react";

export default function BudgetPlanningFeature() {
  return (
    <FeaturePageLayout
      title="Budget Planning & Forecasting"
      subtitle="Financial Planning Engine"
      description="Strategic financial planning that complements your accounting with forward-looking budget allocation, variance analysis, and scenario modeling."
      icon={Calculator}
      gradient="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
      features={[
        { title: "Budget Allocation", description: "Department-wise and project-wise budget allocation with approval workflows.", icon: PieChart },
        { title: "Variance Analysis", description: "Actual vs. Budget variance with traffic light indicators for quick insights.", icon: ArrowUpDown },
        { title: "Forecast Models", description: "Rolling 12-month and quarterly forecast models with trend projections.", icon: TrendingUp },
        { title: "Scenario Modeling", description: "Best Case / Base Case / Worst Case scenario planning for strategic decisions.", icon: Layers },
        { title: "Budget Approvals", description: "Multi-level budget request submission and approval workflow.", icon: FileCheck },
        { title: "Trend Charts", description: "Forecast vs. actuals trend charts with automatic variance highlighting.", icon: BarChart3 },
      ]}
      detailSections={[
        {
          id: "allocation",
          label: "Budget Allocation",
          icon: PieChart,
          color: "hsl(38,92%,50%)",
          title: "Allocate budgets with precision",
          description: "Create departmental and project budgets with multi-level approval workflows. Track spending in real-time against allocated amounts.",
          points: [
            "Department and project-wise allocation",
            "Multi-level approval workflows",
            "Budget freeze and version control",
            "Auto-import actuals from Accounting",
            "Budget request and justification forms",
          ],
        },
        {
          id: "forecasting",
          label: "Financial Forecasting",
          icon: TrendingUp,
          color: "hsl(142,71%,45%)",
          title: "Plan for every scenario",
          description: "Build rolling forecasts with scenario modeling. Compare best, base, and worst case projections to make confident financial decisions.",
          points: [
            "Rolling 12-month forecasts",
            "Quarterly re-forecasting cycles",
            "Scenario comparison dashboards",
            "Revenue and expense projections",
            "Cash flow forecasting",
          ],
        },
      ]}
      stats={[
        { value: "45%", label: "Faster budget cycles" },
        { value: "92%", label: "Budget accuracy improvement" },
        { value: "60%", label: "Less manual spreadsheet work" },
        { value: "3x", label: "More scenario analyses" },
      ]}
      useCases={[
        { title: "CFO & Finance Teams", description: "Strategic financial planning with variance analysis and board-ready reports.", icon: DollarSign },
        { title: "Department Heads", description: "Request and manage departmental budgets with spending visibility.", icon: Building2 },
        { title: "Project Managers", description: "Track project budgets against actuals with alert thresholds.", icon: AlertTriangle },
        { title: "Startup Founders", description: "Runway forecasting, burn rate analysis, and investor-ready financial models.", icon: TrendingUp },
      ]}
      benefits={[
        "Department & project budgets",
        "Actual vs. budget variance",
        "Traffic light indicators",
        "Rolling forecast models",
        "Scenario modeling tools",
        "Budget approval workflows",
        "Auto-import from accounting",
        "Version control for audits",
        "Trend charts & dashboards",
        "Cash flow projections",
      ]}
      faqs={[
        { q: "Can budgets pull actuals from accounting?", a: "Yes. The system auto-imports actual spending from your accounting module, so variance analysis is always up-to-date without manual entry." },
        { q: "How does scenario modeling work?", a: "Create best case, base case, and worst case scenarios by adjusting key assumptions. Compare all three side-by-side with visual charts." },
        { q: "Can department heads request budget changes?", a: "Yes. Budget requests go through configurable multi-level approval workflows with justification notes and supporting documents." },
        { q: "Is there version control for budgets?", a: "Yes. Budget versions are frozen and archived for audit purposes. You can compare any historical version against current actuals." },
      ]}
    />
  );
}
