import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Globe, Users, Briefcase, FileText, Bell, Shield, CreditCard, BookOpen, UserCheck, MessageSquare } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function PortalsFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} Portals`}
      subtitle="Self-Service Portals"
      description="Branded self-service portals for employees and customers — payslips, invoices, support tickets, knowledge base, and more in one unified experience."
      icon={Globe}
      gradient="bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600"
      features={[
        { title: "Employee Portal", description: "Payslips, leave requests, expense claims, and company announcements.", icon: Users },
        { title: "Customer Portal", description: "Invoice history, order tracking, loyalty points, and wallet management.", icon: Briefcase },
        { title: "Document Requests", description: "Employees can request certificates, letters, and official documents.", icon: FileText },
        { title: "Announcements", description: "Push company-wide news, policy updates, and event notifications.", icon: Bell },
        { title: "Knowledge Base", description: "Searchable FAQ and how-to articles for customers and employees.", icon: BookOpen },
        { title: "Secure Access", description: "Role-based portal access with SSO integration and audit logging.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "employee",
          label: "Employee Portal",
          icon: UserCheck,
          color: "hsl(170,60%,45%)",
          title: "Everything Employees Need",
          description: "A single dashboard for payslips, leave balances, asset assignments, training progress, and team directories.",
          points: ["Payslip downloads", "Leave applications", "Expense claims", "Team directory"],
        },
        {
          id: "customer",
          label: "Customer Portal",
          icon: CreditCard,
          color: "hsl(199,89%,48%)",
          title: "Customer Self-Service",
          description: "Let customers view invoices, track orders, manage their wallet, and redeem loyalty rewards without contacting support.",
          points: ["Invoice history", "Order tracking", "Wallet top-up", "Loyalty points"],
        },
        {
          id: "support",
          label: "Support Hub",
          icon: MessageSquare,
          color: "hsl(270,80%,60%)",
          title: "Built-In Support Channel",
          description: "Integrated live chat, ticket submission, and knowledge base so users find answers fast.",
          points: ["Live chat widget", "Ticket system", "Knowledge base", "FAQ search"],
        },
      ]}
      benefits={[
        "Employee self-service",
        "Customer invoice access",
        "Document request workflows",
        "Knowledge base articles",
        "Real-time announcements",
        "Role-based portal access",
      ]}
    />
  );
}
