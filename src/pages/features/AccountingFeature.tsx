import FeaturePageLayout from "@/components/FeaturePageLayout";
import { AnimatedAnalytics } from "@/components/illustrations";
import {
  Receipt, FileText, CreditCard, TrendingUp, Calculator, PieChart,
  Globe, Building2, ShoppingCart, Briefcase, Shield, BarChart3,
  ArrowLeftRight, Landmark, FileCheck, Scale,
} from "lucide-react";

export default function AccountingFeature() {
  return (
    <FeaturePageLayout
      title="Smart Accounting Tools"
      subtitle="Financial Management"
      description="Enterprise-grade accounting with multi-currency support, bank reconciliation, VAT/Mushak compliance, fixed asset management, and auto-generated financial statements."
      icon={Receipt}
      gradient="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600"
      heroIllustration={<AnimatedAnalytics />}
      features={[
        { title: "Multi-Currency Support", description: "Real-time exchange rates, multi-currency invoicing, and FX gain/loss tracking.", icon: Globe },
        { title: "Bank Reconciliation", description: "Import bank statements and auto-match transactions to ledger entries.", icon: Landmark },
        { title: "Bangladesh VAT Compliance", description: "Auto-generate Mushak 6.3, 6.6, 6.7, and 9.1 forms for NBR filing.", icon: Scale },
        { title: "Fixed Asset Management", description: "Asset register, depreciation schedules (straight-line, declining), and disposal tracking.", icon: Building2 },
        { title: "Financial Statements", description: "Auto-generate P&L, Balance Sheet, and Cash Flow Statement on demand.", icon: BarChart3 },
        { title: "Full Audit Trail", description: "Immutable log of every ledger entry change with user, timestamp, and IP address.", icon: FileCheck },
      ]}
      detailSections={[
        {
          id: "invoicing",
          label: "Invoicing System",
          icon: FileText,
          color: "hsl(38,92%,50%)",
          title: "Professional invoices with advanced billing",
          description: "Create recurring invoices, accept partial payments, issue credit notes, auto-apply late fees, and send automated payment reminders at 7, 3, and 1 day before due.",
          points: [
            "Recurring invoice automation (weekly, monthly)",
            "Partial payment tracking per invoice",
            "Credit notes with auto-receivable adjustment",
            "Late payment fee auto-application",
            "Advance/deposit invoices and reconciliation",
            "Invoice approval workflow for high-value items",
          ],
        },
        {
          id: "reconciliation",
          label: "Bank Reconciliation",
          icon: Landmark,
          color: "hsl(199,89%,48%)",
          title: "Reconcile accounts in minutes, not hours",
          description: "Import bank statements in CSV/OFX format and auto-match transactions to ledger entries. Identify discrepancies instantly and reconcile with one click.",
          points: [
            "Bank statement import (CSV, OFX)",
            "Automatic transaction matching",
            "One-click reconciliation",
            "Unmatched transaction investigation",
            "Multi-bank account support",
          ],
        },
        {
          id: "compliance",
          label: "Tax & Compliance",
          icon: Scale,
          color: "hsl(0,72%,50%)",
          title: "Bangladesh & global tax compliance built in",
          description: "Auto-generate Mushak forms for NBR filing, handle withholding tax, configurable tax codes, and produce tax liability reports ready for submission.",
          points: [
            "Mushak 6.3, 6.6, 6.7, 9.1 auto-generation",
            "Configurable tax codes and rates",
            "Withholding tax calculation",
            "Tax liability reports",
            "Budgeting integration with general ledger",
          ],
        },
        {
          id: "reports",
          label: "Financial Reporting",
          icon: BarChart3,
          color: "hsl(243,75%,58%)",
          title: "Complete financial picture on demand",
          description: "Auto-generated P&L, Balance Sheet, Cash Flow Statement, and custom financial dashboards with drill-down capability. Export-ready for auditors and investors.",
          points: [
            "Profit & Loss statements on demand",
            "Balance Sheet with asset/liability breakdown",
            "Cash flow tracking & projections",
            "Accounts receivable/payable aging",
            "Export to PDF, Excel, or CSV",
          ],
        },
      ]}
      stats={[
        { value: "85%", label: "Faster invoice processing" },
        { value: "99%", label: "Tax compliance accuracy" },
        { value: "4hrs", label: "Saved weekly on reconciliation" },
        { value: "2x", label: "Faster month-end close" },
      ]}
      useCases={[
        { title: "Service Agencies", description: "Project-based invoicing, billable hours, and profitability per client with recurring billing.", icon: Briefcase },
        { title: "E-Commerce", description: "Automated revenue tracking, refund management, and multi-currency payment reconciliation.", icon: ShoppingCart },
        { title: "Multi-Location", description: "Consolidated financial reports across branches with inter-company transaction handling.", icon: Building2 },
        { title: "Bangladesh SMBs", description: "NBR-compliant VAT filing, Mushak form generation, and local bank reconciliation.", icon: Scale },
        { title: "Compliance-Heavy", description: "Full audit trail, immutable ledger logs, and regulatory reporting for auditors.", icon: Shield },
        { title: "Non-Profits", description: "Grant tracking, donor management, fund allocation, and restricted fund reporting.", icon: PieChart },
      ]}
      benefits={[
        "Multi-currency with live exchange rates",
        "Bank reconciliation automation",
        "Mushak/VAT form auto-generation",
        "Fixed asset depreciation tracking",
        "Recurring invoices & partial payments",
        "Credit notes & late fee automation",
        "Payment reminder automation (7, 3, 1 day)",
        "Full immutable audit trail",
        "Auto-generated financial statements",
        "Budget-to-ledger integration",
      ]}
      faqs={[
        { q: "Does it support Bangladesh VAT?", a: "Yes. Auto-generate Mushak 6.3, 6.6, 6.7, and 9.1 forms ready for NBR submission. Tax codes and rates are fully configurable." },
        { q: "How does bank reconciliation work?", a: "Import bank statements in CSV or OFX format. The system auto-matches transactions to ledger entries. Review and reconcile unmatched items manually." },
        { q: "Can I handle partial payments?", a: "Yes. Accept and track multiple partial payments against a single invoice. The system maintains a clear outstanding balance and payment history." },
        { q: "How does the audit trail work?", a: "Every ledger entry change is logged with the user who made it, timestamp, and IP address. This immutable log cannot be edited or deleted — ensuring full compliance." },
        { q: "Can I set up recurring invoices?", a: "Yes. Define invoice templates with custom intervals. They'll be auto-generated and sent with configurable late fee rules and payment reminders." },
      ]}
    />
  );
}
