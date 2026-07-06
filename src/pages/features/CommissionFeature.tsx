import FeaturePageLayout from "@/components/FeaturePageLayout";
import { DollarSign, TrendingUp, Users, Trophy, Calculator, FileCheck, BarChart3, CreditCard, Building2, Target } from "lucide-react";

export default function CommissionFeature() {
  return (
    <FeaturePageLayout
      title="Commission & Incentive Management"
      subtitle="Sales Compensation Engine"
      description="Automate sales commission calculations, eliminate spreadsheet errors, and motivate your sales team with real-time earnings dashboards."
      icon={DollarSign}
      gradient="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600"
      features={[
        { title: "Commission Rules", description: "Custom commission structures: flat amount, percentage, tiered, and multi-level.", icon: Calculator },
        { title: "Real-Time Earnings", description: "Sales reps see their earnings dashboard updated in real-time on every deal close.", icon: TrendingUp },
        { title: "Auto-Calculation", description: "Commission triggered automatically on invoice payment confirmation.", icon: DollarSign },
        { title: "Dispute Resolution", description: "Commission dispute submission and resolution workflow with audit trail.", icon: FileCheck },
        { title: "Team Leaderboards", description: "Individual and team leaderboards for performance motivation.", icon: Trophy },
        { title: "Payout Integration", description: "Seamless integration with payroll module for commission payouts.", icon: CreditCard },
      ]}
      detailSections={[
        {
          id: "rules",
          label: "Commission Rules",
          icon: Calculator,
          color: "hsl(142,71%,45%)",
          title: "Flexible commission structures",
          description: "Configure any commission model — flat rates, percentage-based, tiered, accelerators, and split commissions across teams.",
          points: [
            "Flat, percentage, and tiered structures",
            "Accelerators for overachievers",
            "Split commissions across teams",
            "Product-specific commission rates",
            "Manager override and adjustment capability",
          ],
        },
        {
          id: "tracking",
          label: "Earnings Tracking",
          icon: TrendingUp,
          color: "hsl(38,92%,50%)",
          title: "Transparent earnings for every rep",
          description: "Every sales rep gets a real-time earnings dashboard showing deal-by-deal commission calculations, YTD earnings, and projected payouts.",
          points: [
            "Deal-by-deal commission breakdown",
            "YTD earnings summary",
            "Projected payout forecasting",
            "Commission statement generation",
            "Historical earnings comparison",
          ],
        },
      ]}
      stats={[
        { value: "95%", label: "Fewer commission errors" },
        { value: "40%", label: "Faster payout processing" },
        { value: "25%", label: "Sales performance improvement" },
        { value: "Zero", label: "Spreadsheet dependencies" },
      ]}
      useCases={[
        { title: "B2B Sales Teams", description: "Complex multi-tier commission structures with deal-based and recurring revenue splits.", icon: Target },
        { title: "Real Estate Agencies", description: "Property-based commission with split calculations for agents and brokers.", icon: Building2 },
        { title: "Insurance Brokers", description: "Tiered commission with renewal bonuses and portfolio-based incentives.", icon: Users },
        { title: "Distribution Companies", description: "Volume-based incentives, territory bonuses, and distributor commission tracking.", icon: BarChart3 },
      ]}
      benefits={[
        "Automated commission calculation",
        "Multiple commission structures",
        "Real-time earnings dashboard",
        "Payroll integration",
        "Dispute resolution workflow",
        "Team and individual leaderboards",
        "Commission statements",
        "Manager adjustment controls",
        "Audit trail for every change",
        "Performance-based accelerators",
      ]}
      faqs={[
        { q: "When are commissions calculated?", a: "Commissions are automatically calculated when an invoice payment is confirmed. You can also configure manual trigger points or deal stage-based calculations." },
        { q: "Can I handle split commissions?", a: "Yes. Split commissions across multiple reps, managers, and teams with configurable split percentages per deal or product." },
        { q: "How do commission disputes work?", a: "Reps can submit disputes with supporting details. Managers review, approve, or deny with a full audit trail of the resolution." },
        { q: "Does it integrate with payroll?", a: "Yes. Approved commissions flow directly into the payroll module for inclusion in the next pay cycle." },
      ]}
    />
  );
}
