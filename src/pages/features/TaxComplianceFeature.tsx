import FeaturePageLayout from "@/components/FeaturePageLayout";
import {
  Percent, Globe, FileText, BarChart3, Calculator, Shield,
  Building2, Briefcase, ShoppingCart, Heart, Layers, Search,
} from "lucide-react";

export default function TaxComplianceFeature() {
  return (
    <FeaturePageLayout
      title="Tax Compliance Suite"
      subtitle="Tax & Regulatory"
      description="Stay compliant across jurisdictions with automated tax calculations, country profiles, rate management, and real-time compliance tracking."
      icon={Percent}
      gradient="bg-gradient-to-br from-red-500 via-rose-500 to-pink-600"
      features={[
        { title: "Tax Dashboard", description: "Real-time overview of tax obligations, upcoming deadlines, and compliance status.", icon: BarChart3 },
        { title: "Country Profiles", description: "Pre-configured tax rules for multiple countries with VAT, GST, and sales tax support.", icon: Globe },
        { title: "Tax Rate Manager", description: "Create and manage tax rates, exemptions, and special categories across jurisdictions.", icon: Percent },
        { title: "Compliance Tracker", description: "Monitor filing deadlines, track submissions, and get alerts for upcoming obligations.", icon: Shield },
        { title: "Tax Calculator", description: "Instant tax calculations with jurisdiction detection and rate application.", icon: Calculator },
        { title: "Tax Code Importer", description: "Bulk import tax codes and rates from CSV to quickly set up multi-region compliance.", icon: FileText },
      ]}
      detailSections={[
        {
          id: "multi-jurisdiction",
          label: "Multi-Jurisdiction",
          icon: Globe,
          color: "hsl(0,72%,50%)",
          title: "One platform, every tax authority",
          description: "Configure tax rules for any country. Support for VAT, GST, sales tax, withholding tax, and custom tax types with automatic rate application.",
          points: [
            "Pre-built country tax profiles",
            "VAT, GST, and sales tax support",
            "Withholding tax calculations",
            "Tax exemption management",
            "Multi-currency tax reporting",
          ],
        },
        {
          id: "compliance",
          label: "Compliance Engine",
          icon: Shield,
          color: "hsl(243,75%,58%)",
          title: "Never miss a filing deadline",
          description: "Automated compliance tracking monitors your obligations, sends reminders before deadlines, and maintains a complete audit trail of all tax activities.",
          points: [
            "Automated deadline tracking",
            "Pre-filing reminders and alerts",
            "Submission status monitoring",
            "Complete audit trail",
            "Regulatory update notifications",
          ],
        },
      ]}
      stats={[
        { value: "100%", label: "Filing accuracy rate" },
        { value: "70%", label: "Less time on tax prep" },
        { value: "50+", label: "Country profiles available" },
        { value: "0", label: "Missed deadlines" },
      ]}
      useCases={[
        { title: "Global Enterprises", description: "Manage tax compliance across multiple countries with centralized rate management and reporting.", icon: Globe },
        { title: "E-Commerce", description: "Automatically apply correct tax rates based on customer location and product category.", icon: ShoppingCart },
        { title: "Accounting Firms", description: "Handle multi-client tax compliance with separate profiles and consolidated reporting.", icon: Building2 },
        { title: "Financial Services", description: "Track complex tax obligations including withholding taxes and regulatory filings.", icon: Briefcase },
      ]}
      benefits={[
        "Automated tax calculations",
        "Multi-jurisdiction support",
        "Filing deadline alerts",
        "Complete audit trail",
        "Bulk tax code import",
        "Real-time compliance status",
        "Country-specific rules",
        "Tax exemption management",
      ]}
      faqs={[
        { q: "Which tax types are supported?", a: "VAT, GST, sales tax, withholding tax, and custom tax types. Each can be configured per country with specific rates and rules." },
        { q: "Can I import existing tax codes?", a: "Yes. Use the Tax Code Importer to bulk import rates from CSV files with automatic mapping and validation." },
        { q: "How are tax rates applied to invoices?", a: "Tax rates are automatically applied based on customer location, product category, and applicable exemptions." },
        { q: "Does it handle multi-currency?", a: "Yes. Tax calculations respect the transaction currency and can report in your base currency with exchange rate handling." },
      ]}
    />
  );
}
