import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Receipt, Camera, FileCheck, CreditCard, BarChart3, Users, Clock, Shield, Building2, Briefcase } from "lucide-react";

export default function ExpenseManagementFeature() {
  return (
    <FeaturePageLayout
      title="Expense Management"
      subtitle="Smart Expense Tracking"
      description="Submit, approve, and reimburse employee expenses with receipt scanning, policy enforcement, and automated approval workflows."
      icon={Receipt}
      gradient="bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600"
      features={[
        { title: "Receipt Scanning", description: "AI-powered receipt scanning that auto-extracts amount, vendor, and category.", icon: Camera },
        { title: "Expense Policies", description: "Configure spending limits, per diem rates, and category-based policy rules.", icon: Shield },
        { title: "Approval Workflows", description: "Multi-level approval workflows with manager, finance, and executive reviews.", icon: FileCheck },
        { title: "Reimbursement", description: "Auto-calculate reimbursement amounts with payroll integration for payout.", icon: CreditCard },
        { title: "Spending Analytics", description: "Department and category-wise spending analytics with budget comparison.", icon: BarChart3 },
        { title: "Travel Expenses", description: "Dedicated travel expense tracking with mileage, per diem, and itinerary support.", icon: Clock },
      ]}
      detailSections={[
        {
          id: "submission",
          label: "Expense Submission",
          icon: Camera,
          color: "hsl(170,60%,45%)",
          title: "Submit expenses in seconds",
          description: "Snap a photo of receipts, and AI auto-fills the expense details. Submit from mobile or desktop with category tagging and notes.",
          points: [
            "AI receipt scanning and extraction",
            "Mobile and desktop submission",
            "Category auto-tagging",
            "Multi-receipt batch upload",
            "Recurring expense templates",
          ],
        },
        {
          id: "approval",
          label: "Approval & Reimbursement",
          icon: FileCheck,
          color: "hsl(142,71%,45%)",
          title: "Fast approvals, faster reimbursements",
          description: "Configurable approval chains ensure expenses are reviewed by the right people. Approved expenses flow directly to payroll for reimbursement.",
          points: [
            "Manager and finance approvals",
            "Policy violation auto-flagging",
            "Approval delegation for absences",
            "Direct payroll integration",
            "Reimbursement status tracking",
          ],
        },
      ]}
      stats={[
        { value: "70%", label: "Faster expense processing" },
        { value: "85%", label: "Fewer policy violations" },
        { value: "50%", label: "Less manual data entry" },
        { value: "95%", label: "On-time reimbursements" },
      ]}
      useCases={[
        { title: "Traveling Employees", description: "Travel expense tracking with hotel, flight, meal, and transportation categories.", icon: Briefcase },
        { title: "Sales Teams", description: "Client entertainment, travel, and per diem expense management with CRM linking.", icon: Users },
        { title: "Remote Workers", description: "Home office equipment, internet, and co-working space expense claims.", icon: Building2 },
        { title: "Consultants", description: "Client-billable expense tracking with project and client allocation.", icon: Clock },
      ]}
      benefits={[
        "AI receipt scanning",
        "Policy enforcement",
        "Multi-level approvals",
        "Payroll integration",
        "Mobile submission",
        "Category analytics",
        "Travel expense support",
        "Mileage tracking",
        "Budget comparison",
        "Audit-ready reports",
      ]}
      faqs={[
        { q: "How does receipt scanning work?", a: "Take a photo of any receipt. AI extracts the vendor name, amount, date, and suggests a category. Review and submit in seconds." },
        { q: "Can I set spending limits?", a: "Yes. Configure per-category limits, per diem rates, and overall budget caps. The system auto-flags submissions that exceed policy." },
        { q: "How are reimbursements processed?", a: "Approved expenses are automatically queued for reimbursement through the payroll module in the next pay cycle." },
        { q: "Can I track expenses by project?", a: "Yes. Tag expenses to specific projects or clients for billable expense tracking and project cost analysis." },
      ]}
    />
  );
}
