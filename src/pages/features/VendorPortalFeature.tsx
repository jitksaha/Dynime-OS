import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Store, FileCheck, Users, TrendingUp, MessageSquare, CreditCard, ClipboardCheck, Shield, Building2, Truck } from "lucide-react";

export default function VendorPortalFeature() {
  return (
    <FeaturePageLayout
      title="Vendor & Supplier Portal"
      subtitle="Two-Sided Procurement Hub"
      description="Empower vendors to self-serve with onboarding, quote submission, PO acknowledgment, and payment tracking — reducing your procurement workload."
      icon={Store}
      gradient="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500"
      features={[
        { title: "Vendor Onboarding", description: "Self-service vendor registration with document upload — trade license, bank details, tax info.", icon: FileCheck },
        { title: "RFQ & Quotations", description: "Vendors submit quotes directly against your RFQ requests through the portal.", icon: ClipboardCheck },
        { title: "PO Management", description: "Purchase Order acknowledgment and delivery updates submitted by vendors.", icon: Store },
        { title: "Performance Scorecard", description: "Vendor performance scoring visible to both parties for transparency.", icon: TrendingUp },
        { title: "Dispute Resolution", description: "Transaction-level dispute threads with resolution tracking.", icon: MessageSquare },
        { title: "Payment Tracking", description: "Vendors view their payment status, invoice history, and upcoming payouts.", icon: CreditCard },
      ]}
      detailSections={[
        {
          id: "onboarding",
          label: "Vendor Onboarding",
          icon: FileCheck,
          color: "hsl(38,92%,50%)",
          title: "Streamlined vendor registration",
          description: "Vendors complete a self-service onboarding form, upload required documents, and go through an automated approval workflow.",
          points: [
            "Self-registration with document upload",
            "Trade license and tax verification",
            "Bank details collection and validation",
            "Multi-level approval workflow",
            "Vendor communication history archive",
          ],
        },
        {
          id: "procurement",
          label: "Procurement Flow",
          icon: Store,
          color: "hsl(142,71%,45%)",
          title: "End-to-end procurement automation",
          description: "From RFQ to quote comparison, PO issuance to delivery tracking — the complete procurement cycle managed in one place.",
          points: [
            "RFQ creation and vendor distribution",
            "Side-by-side quote comparison",
            "Purchase Order generation",
            "Delivery tracking and updates",
            "Goods receipt and quality checks",
          ],
        },
      ]}
      stats={[
        { value: "60%", label: "Faster vendor onboarding" },
        { value: "45%", label: "Procurement cycle reduction" },
        { value: "35%", label: "Better vendor compliance" },
        { value: "80%", label: "Less email-based procurement" },
      ]}
      useCases={[
        { title: "Manufacturing", description: "Manage raw material suppliers with quality scoring and delivery performance tracking.", icon: Building2 },
        { title: "Construction", description: "Subcontractor management with milestone-based payments and document verification.", icon: Building2 },
        { title: "Retail & Distribution", description: "Wholesale vendor management with catalog integration and pricing negotiations.", icon: Truck },
        { title: "Government & NGOs", description: "Transparent procurement with competitive bidding and compliance documentation.", icon: Shield },
      ]}
      benefits={[
        "Vendor self-registration",
        "Document upload & verification",
        "RFQ and quote management",
        "PO acknowledgment flow",
        "Vendor performance scoring",
        "Dispute resolution threads",
        "Payment status visibility",
        "Automated approval workflows",
        "Communication archive",
        "Compliance documentation",
      ]}
      faqs={[
        { q: "Can vendors register themselves?", a: "Yes. Vendors access a self-service registration form, upload required documents, and go through your configured approval workflow before becoming active." },
        { q: "How does the RFQ process work?", a: "Create an RFQ, select vendors to invite, and they submit quotes through the portal. Compare quotes side-by-side and award the PO to the winning vendor." },
        { q: "Can vendors track their payments?", a: "Yes. Vendors have a dashboard showing invoice history, payment status, upcoming payouts, and can download payment receipts." },
        { q: "How is vendor performance scored?", a: "Based on configurable criteria: delivery timeliness, quality ratings, pricing competitiveness, and communication responsiveness." },
      ]}
    />
  );
}
