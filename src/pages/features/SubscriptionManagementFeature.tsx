// @ts-nocheck
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { RefreshCw, TrendingUp, BarChart3, CreditCard, Bell, Users, DollarSign, Clock, ArrowUpDown, Shield } from "lucide-react";

export default function SubscriptionManagementFeature() {
  return (
    <FeaturePageLayout
      title="Subscription & Revenue Management"
      subtitle="Recurring Revenue Engine"
      description="End-to-end lifecycle management for subscription-based businesses. Track MRR, ARR, churn, and renewals with powerful automation."
      icon={RefreshCw}
      gradient="bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-600"
      features={[
        { title: "Plan Builder", description: "Create subscription plans with trial, monthly, annual, and custom billing cycles.", icon: CreditCard },
        { title: "MRR/ARR Dashboards", description: "Auto-calculated MRR, ARR, LTV, and churn rate dashboards updated in real-time.", icon: TrendingUp },
        { title: "Dunning Management", description: "Automatic failed payment retries with customizable retry schedules.", icon: RefreshCw },
        { title: "Proration Engine", description: "Smart proration on plan upgrades and downgrades mid-billing cycle.", icon: ArrowUpDown },
        { title: "Revenue Forecasting", description: "Forecast revenue by cohort, acquisition channel, and subscription tier.", icon: BarChart3 },
        { title: "Renewal Automation", description: "Automated renewal reminders via email, SMS, and in-app notifications.", icon: Bell },
      ]}
      detailSections={[
        {
          id: "lifecycle",
          label: "Subscription Lifecycle",
          icon: RefreshCw,
          color: "hsl(199,89%,48%)",
          title: "Manage the complete subscription journey",
          description: "From trial to paid, upgrade to downgrade, pause to cancel — manage every stage of the subscription lifecycle with automated workflows.",
          points: [
            "Trial → Paid conversion workflows",
            "Pause, cancel, and reactivation flows",
            "Mid-cycle upgrade/downgrade proration",
            "Grace period management for failed payments",
            "Customer lifetime value tracking per subscription",
          ],
        },
        {
          id: "revenue",
          label: "Revenue Analytics",
          icon: DollarSign,
          color: "hsl(142,71%,45%)",
          title: "Every revenue metric at your fingertips",
          description: "Track the metrics that matter — MRR, ARR, churn, expansion revenue, and cohort analysis — all calculated automatically.",
          points: [
            "Monthly and Annual Recurring Revenue",
            "Churn rate by plan, cohort, and period",
            "Expansion revenue from upsells",
            "Customer LTV and CAC tracking",
            "Revenue forecasting by channel",
          ],
        },
      ]}
      stats={[
        { value: "42%", label: "Reduction in involuntary churn" },
        { value: "3.5x", label: "Faster upgrade conversion" },
        { value: "28%", label: "Increase in expansion revenue" },
        { value: "95%", label: "Payment recovery rate" },
      ]}
      useCases={[
        { title: "SaaS Companies", description: "Manage tiered pricing, usage-based billing, and enterprise contracts with custom terms.", icon: CreditCard },
        { title: "Media & Publishing", description: "Handle digital subscriptions, paywalls, and content access tiers.", icon: Users },
        { title: "Membership Businesses", description: "Gym, club, and association memberships with seasonal pricing and group discounts.", icon: Users },
        { title: "Professional Services", description: "Retainer billing, hourly rate subscriptions, and project-based recurring invoices.", icon: Clock },
      ]}
      benefits={[
        "Automated billing cycle management",
        "Smart dunning for failed payments",
        "Real-time MRR/ARR dashboards",
        "Cohort-based revenue analytics",
        "Proration on plan changes",
        "Renewal reminder automation",
        "Customer LTV tracking",
        "Churn prediction signals",
        "Multi-currency subscriptions",
        "Subscription pause and resume",
      ]}
      faqs={[
        { q: "How does dunning management work?", a: "When a payment fails, the system automatically retries with configurable schedules (e.g., retry after 1, 3, and 7 days) and sends customer notifications at each stage." },
        { q: "Can I offer trial periods?", a: "Yes. Configure trial durations per plan, set auto-conversion rules, and send trial expiry reminders to maximize conversion." },
        { q: "How is proration calculated?", a: "When a customer upgrades mid-cycle, the remaining credit from the current plan is automatically deducted from the new plan's cost." },
        { q: "What revenue metrics are tracked?", a: "MRR, ARR, churn rate, expansion revenue, net revenue retention, customer LTV, and cohort-based revenue analytics — all calculated automatically." },
      ]}
    />
  );
}
