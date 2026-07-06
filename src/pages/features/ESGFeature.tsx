import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Leaf, TrendingUp, BarChart3, Globe, FileText, Users, Building2, Droplets, Factory, Heart } from "lucide-react";

export default function ESGFeature() {
  return (
    <FeaturePageLayout
      title="ESG & Sustainability Reporting"
      subtitle="Environmental, Social & Governance"
      description="Track, measure, and report on your environmental, social, and governance commitments. Generate investor-ready ESG reports aligned to global frameworks."
      icon={Leaf}
      gradient="bg-gradient-to-br from-green-500 via-emerald-500 to-lime-500"
      features={[
        { title: "Carbon Tracking", description: "Track carbon footprint by department, activity, and facility with trend analysis.", icon: Factory },
        { title: "ESG Dashboard", description: "ESG score dashboard aligned to GRI and SASB reporting frameworks.", icon: BarChart3 },
        { title: "Sustainability Goals", description: "Set sustainability goals and track milestones with progress indicators.", icon: TrendingUp },
        { title: "ESG Reports", description: "Generate investor-ready ESG reports in PDF format with one click.", icon: FileText },
        { title: "Supply Chain Risk", description: "Score supply chain sustainability risk across vendors and suppliers.", icon: Globe },
        { title: "D&I Metrics", description: "Employee diversity and inclusion metrics with year-over-year comparison.", icon: Users },
      ]}
      detailSections={[
        {
          id: "environmental",
          label: "Environmental",
          icon: Leaf,
          color: "hsl(142,71%,45%)",
          title: "Measure your environmental impact",
          description: "Track energy consumption, carbon emissions, waste management, and water usage across your organization with automated data collection.",
          points: [
            "Carbon footprint tracking by facility",
            "Energy and utility consumption logging",
            "Waste reduction goal tracking",
            "Water usage monitoring",
            "Year-over-year trend comparison",
          ],
        },
        {
          id: "governance",
          label: "Governance & Social",
          icon: Users,
          color: "hsl(243,75%,58%)",
          title: "Social responsibility and governance",
          description: "Track diversity metrics, board composition, community engagement, and governance policies for comprehensive ESG reporting.",
          points: [
            "Diversity and inclusion metrics",
            "Board composition tracking",
            "Community engagement logging",
            "Governance policy compliance",
            "Stakeholder communication records",
          ],
        },
      ]}
      stats={[
        { value: "100%", label: "ESG framework compliance" },
        { value: "60%", label: "Faster report generation" },
        { value: "45%", label: "Better investor transparency" },
        { value: "3x", label: "More sustainability metrics" },
      ]}
      useCases={[
        { title: "Listed Companies", description: "Meet regulatory ESG disclosure requirements with framework-aligned reporting.", icon: Building2 },
        { title: "Manufacturing", description: "Track factory emissions, energy usage, and waste management for sustainability goals.", icon: Factory },
        { title: "Financial Services", description: "ESG risk scoring for investment portfolios and client reporting.", icon: TrendingUp },
        { title: "Retail Brands", description: "Supply chain sustainability tracking and consumer-facing impact reports.", icon: Globe },
      ]}
      benefits={[
        "Carbon footprint tracking",
        "GRI & SASB alignment",
        "Investor-ready reports",
        "Sustainability goal setting",
        "Supply chain risk scoring",
        "D&I metrics tracking",
        "Energy consumption logging",
        "Year-over-year comparison",
        "Framework-compliant reporting",
        "Stakeholder transparency",
      ]}
      faqs={[
        { q: "Which ESG frameworks are supported?", a: "The module aligns with GRI (Global Reporting Initiative), SASB (Sustainability Accounting Standards Board), and can be customized for TCFD and CDP frameworks." },
        { q: "Can I generate reports for investors?", a: "Yes. Generate comprehensive ESG reports in PDF format with charts, metrics, and year-over-year comparisons — ready for board meetings and investor presentations." },
        { q: "How is carbon footprint calculated?", a: "Input energy usage, travel data, and facility information. The system applies standard emission factors to calculate Scope 1, 2, and 3 emissions." },
        { q: "Can I track supply chain sustainability?", a: "Yes. Score vendors and suppliers on sustainability criteria and identify supply chain ESG risks with automated assessments." },
      ]}
    />
  );
}
