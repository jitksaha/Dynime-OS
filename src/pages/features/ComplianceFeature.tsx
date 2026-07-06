import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Shield, FileCheck, AlertTriangle, Calendar, ClipboardCheck, Lock, Scale, BookOpen, Building2, Briefcase } from "lucide-react";

export default function ComplianceFeature() {
  return (
    <FeaturePageLayout
      title="Compliance & Audit Management"
      subtitle="Regulatory Compliance Hub"
      description="Centralized compliance management for policy tracking, audit checklists, risk registers, and regulatory deadline monitoring."
      icon={Shield}
      gradient="bg-gradient-to-br from-red-500 via-rose-500 to-pink-600"
      features={[
        { title: "Policy Repository", description: "Store policies with mandatory employee acknowledgment tracking and version control.", icon: BookOpen },
        { title: "Audit Checklists", description: "Build audit checklists with assignable tasks, findings log, and evidence collection.", icon: ClipboardCheck },
        { title: "Risk Register", description: "Track risks with severity scoring — Critical, High, Medium, Low — with mitigation plans.", icon: AlertTriangle },
        { title: "Regulatory Calendar", description: "VAT filing dates, tax deadlines, license renewals, and compliance due dates.", icon: Calendar },
        { title: "Compliance Reports", description: "Auto-generated compliance status reports for management and external auditors.", icon: FileCheck },
        { title: "Escalation System", description: "Non-compliance alerts with configurable escalation workflows and notifications.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "audit",
          label: "Audit Management",
          icon: ClipboardCheck,
          color: "hsl(0,72%,50%)",
          title: "Streamline your audit processes",
          description: "Create detailed audit checklists, assign tasks to team members, log findings, and maintain an evidence repository — all in one place.",
          points: [
            "Customizable audit checklist templates",
            "Task assignment with due dates",
            "Findings log with severity classification",
            "Evidence repository for documentation",
            "Audit history and trend reporting",
          ],
        },
        {
          id: "risk",
          label: "Risk Management",
          icon: AlertTriangle,
          color: "hsl(38,92%,50%)",
          title: "Identify and mitigate risks proactively",
          description: "Maintain a comprehensive risk register with severity scoring, mitigation tracking, and automatic escalation when risk levels change.",
          points: [
            "Risk register with severity scoring",
            "Mitigation plan tracking",
            "Automatic risk level escalation",
            "Risk heat maps and dashboards",
            "ISO, GDPR, and local framework templates",
          ],
        },
      ]}
      stats={[
        { value: "85%", label: "Faster audit completion" },
        { value: "Zero", label: "Missed compliance deadlines" },
        { value: "70%", label: "Less manual compliance work" },
        { value: "100%", label: "Audit trail coverage" },
      ]}
      useCases={[
        { title: "Banking & Finance", description: "Regulatory compliance tracking for Bangladesh Bank, SEC, and international standards.", icon: Building2 },
        { title: "Healthcare", description: "Patient data privacy compliance, medical audit trails, and accreditation management.", icon: Shield },
        { title: "Manufacturing", description: "ISO certification management, quality audits, and environmental compliance.", icon: Scale },
        { title: "Legal Firms", description: "Client confidentiality compliance, regulatory filings, and professional standards.", icon: Briefcase },
      ]}
      benefits={[
        "Policy document management",
        "Employee acknowledgment tracking",
        "Audit checklist builder",
        "Risk severity scoring",
        "Regulatory deadline calendar",
        "Auto-generated compliance reports",
        "Non-compliance escalation",
        "Evidence repository",
        "Framework templates (ISO, GDPR)",
        "Full audit trail logging",
      ]}
      faqs={[
        { q: "What compliance frameworks are supported?", a: "The system includes templates for ISO 27001, GDPR, SOC 2, and local regulatory frameworks. You can also create custom frameworks for your industry." },
        { q: "Can employees acknowledge policies digitally?", a: "Yes. Policies can be distributed to employees who must read and digitally acknowledge them. The system tracks who has and hasn't acknowledged each policy." },
        { q: "How does the regulatory calendar work?", a: "Pre-loaded with common regulatory deadlines (VAT filing, tax returns, license renewals). Add custom deadlines and receive automated reminders before due dates." },
        { q: "Can I generate audit reports for external auditors?", a: "Yes. Generate comprehensive compliance status reports in PDF format, including audit findings, risk assessments, and evidence documentation." },
      ]}
    />
  );
}
