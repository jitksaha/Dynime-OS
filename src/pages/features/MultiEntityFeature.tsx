// @ts-nocheck
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Building2, Layers, Users, BarChart3, ArrowLeftRight, Shield, Globe, FileText, CreditCard, Building } from "lucide-react";

export default function MultiEntityFeature() {
  return (
    <FeaturePageLayout
      title="Multi-Entity Management"
      subtitle="Group Company Platform"
      description="Manage multiple legal entities from a single account — ideal for holding companies, franchises, and conglomerates with consolidated reporting."
      icon={Building2}
      gradient="bg-gradient-to-br from-slate-700 via-gray-700 to-zinc-800"
      features={[
        { title: "Entity Management", description: "Create unlimited entities under one parent account with fully isolated data.", icon: Building },
        { title: "Consolidated Reports", description: "Consolidated financial reports across all entities with inter-company eliminations.", icon: BarChart3 },
        { title: "Inter-Company Transactions", description: "Track inter-company transactions, loans, and cost allocations seamlessly.", icon: ArrowLeftRight },
        { title: "Shared Employee Pool", description: "Shared employee pool with entity-specific contracts and payroll.", icon: Users },
        { title: "Entity Switcher", description: "Switch between entities from the top navigation — no separate login required.", icon: Layers },
        { title: "Entity Permissions", description: "Entity-level role and permission controls for granular access management.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "entities",
          label: "Entity Setup",
          icon: Building,
          color: "hsl(220,13%,46%)",
          title: "One account, multiple businesses",
          description: "Set up separate legal entities with their own chart of accounts, employee roster, and business rules — all managed from a single login.",
          points: [
            "Unlimited entity creation",
            "Isolated data per entity",
            "Entity-specific configurations",
            "Common master data sharing",
            "Entity switcher in navigation",
          ],
        },
        {
          id: "consolidation",
          label: "Financial Consolidation",
          icon: BarChart3,
          color: "hsl(142,71%,45%)",
          title: "Unified financial view across all entities",
          description: "Generate consolidated financial statements, track inter-company balances, and perform group-level reporting with automatic eliminations.",
          points: [
            "Consolidated P&L and Balance Sheet",
            "Inter-company elimination entries",
            "Transfer pricing management",
            "Group-level cash flow analysis",
            "Entity-level and group-level dashboards",
          ],
        },
      ]}
      stats={[
        { value: "80%", label: "Faster group reporting" },
        { value: "100%", label: "Data isolation guaranteed" },
        { value: "Zero", label: "Separate login required" },
        { value: "50%", label: "Less admin overhead" },
      ]}
      useCases={[
        { title: "Holding Companies", description: "Manage subsidiary companies with consolidated reporting and inter-company transactions.", icon: Building2 },
        { title: "Franchise Networks", description: "Standardized operations across franchisees with centralized oversight and reporting.", icon: Globe },
        { title: "Multi-Branch Businesses", description: "Branch-level accounting and HR with headquarters-level consolidated views.", icon: Layers },
        { title: "International Operations", description: "Country-specific entities with local compliance and multi-currency consolidation.", icon: CreditCard },
      ]}
      benefits={[
        "Unlimited entity creation",
        "Data isolation per entity",
        "Consolidated financials",
        "Inter-company transactions",
        "Shared employee pool",
        "One-click entity switching",
        "Entity-level permissions",
        "Group-level dashboards",
        "Transfer pricing support",
        "Multi-currency consolidation",
      ]}
      faqs={[
        { q: "How many entities can I create?", a: "There is no limit. Create as many entities as needed under a single parent account. Each entity has fully isolated data." },
        { q: "Can employees work across entities?", a: "Yes. Employees can be shared across entities with entity-specific contracts, payroll, and role assignments." },
        { q: "How does financial consolidation work?", a: "The system auto-generates consolidated P&L, Balance Sheet, and Cash Flow statements with inter-company elimination entries." },
        { q: "Do I need separate logins?", a: "No. Switch between entities using the entity switcher in the top navigation. Your permissions are entity-specific." },
      ]}
    />
  );
}
