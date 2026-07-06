import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Shield, Lock, Key, Eye, UserCheck, FileWarning, Fingerprint, ShieldCheck, AlertTriangle, Settings } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function SecurityFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} Security`}
      subtitle="Enterprise Security"
      description="Comprehensive security suite with role-based access control, audit logging, two-factor authentication, and compliance tools to protect your business data."
      icon={Shield}
      gradient="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700"
      features={[
        { title: "Role-Based Access", description: "Granular permission system with custom roles for every team member.", icon: UserCheck },
        { title: "Two-Factor Auth", description: "TOTP and WebAuthn support for secure multi-factor authentication.", icon: Key },
        { title: "Audit Logging", description: "Complete activity trail with IP tracking and tamper-proof records.", icon: Eye },
        { title: "Data Encryption", description: "End-to-end encryption for sensitive data at rest and in transit.", icon: Lock },
        { title: "Session Management", description: "Active session monitoring with remote revocation capabilities.", icon: Fingerprint },
        { title: "Compliance Reports", description: "Automated compliance reporting for SOC 2, GDPR, and HIPAA.", icon: FileWarning },
      ]}
      detailSections={[
        {
          id: "access",
          label: "Access Control",
          icon: ShieldCheck,
          color: "hsl(220,70%,50%)",
          title: "Fine-Grained Permissions",
          description: "Define exactly who can access what with role hierarchies, department-level restrictions, and custom permission sets.",
          points: ["Custom role creation", "Department-based access", "Module-level permissions", "API key scoping"],
        },
        {
          id: "monitoring",
          label: "Threat Monitoring",
          icon: AlertTriangle,
          color: "hsl(38,92%,50%)",
          title: "Real-Time Security Alerts",
          description: "Detect suspicious login attempts, unusual data access patterns, and potential security breaches with instant notifications.",
          points: ["Login anomaly detection", "Brute-force protection", "IP whitelisting", "Geo-blocking"],
        },
        {
          id: "compliance",
          label: "Compliance",
          icon: Settings,
          color: "hsl(142,71%,45%)",
          title: "Built-In Compliance Tools",
          description: "Stay compliant with automated data retention policies, right-to-erasure workflows, and exportable audit reports.",
          points: ["GDPR data exports", "Retention policies", "Consent management", "Vulnerability scanning"],
        },
      ]}
      benefits={[
        "Role-based access control",
        "Two-factor authentication",
        "Complete audit trails",
        "Session monitoring",
        "Data encryption at rest",
        "Compliance automation",
      ]}
    />
  );
}
