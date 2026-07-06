import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Building, QrCode, Bell, UserCheck, FileCheck, Shield, Clock, Users, Camera, Building2 } from "lucide-react";

export default function VisitorManagementFeature() {
  return (
    <FeaturePageLayout
      title="Visitor & Reception Management"
      subtitle="Digital Front Desk"
      description="Replace paper visitor logs with a smart, trackable digital reception system. QR-based check-in, host notifications, and NDA signing — all automated."
      icon={Building}
      gradient="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600"
      features={[
        { title: "QR Check-In", description: "QR code-based visitor check-in at reception kiosks or mobile devices.", icon: QrCode },
        { title: "Host Notifications", description: "Instant in-app and email alerts to hosts when their visitor arrives.", icon: Bell },
        { title: "Pre-Registration", description: "Employees pre-register expected guests for faster check-in.", icon: UserCheck },
        { title: "NDA Signing", description: "Digital NDA signing at check-in with acknowledgment tracking.", icon: FileCheck },
        { title: "Visitor Badges", description: "Auto-generated visitor badges with photo, name, and host info.", icon: Camera },
        { title: "Blacklist Management", description: "Restrict access for blacklisted individuals with automatic alerts.", icon: Shield },
      ]}
      detailSections={[
        {
          id: "checkin",
          label: "Smart Check-In",
          icon: QrCode,
          color: "hsl(199,89%,48%)",
          title: "Frictionless visitor experience",
          description: "Visitors scan a QR code, fill in their details, sign any required documents, and hosts are instantly notified — all within seconds.",
          points: [
            "QR code and tablet kiosk support",
            "Photo capture at check-in",
            "Automatic host notification",
            "Digital NDA/agreement signing",
            "Estimated meeting duration tracking",
          ],
        },
        {
          id: "safety",
          label: "Safety & Security",
          icon: Shield,
          color: "hsl(0,72%,50%)",
          title: "Know who's in your building at all times",
          description: "Real-time visitor log with emergency evacuation lists, blacklist management, and complete audit trails for compliance.",
          points: [
            "Real-time visitor count dashboard",
            "Emergency evacuation list generation",
            "Blacklist with automatic alert triggers",
            "Visitor log with timestamps and purpose",
            "Duration analytics and overstay alerts",
          ],
        },
      ]}
      stats={[
        { value: "80%", label: "Faster check-in process" },
        { value: "100%", label: "Visitor accountability" },
        { value: "Zero", label: "Paper visitor logs" },
        { value: "95%", label: "Host notification delivery" },
      ]}
      useCases={[
        { title: "Corporate Offices", description: "Professional visitor experience with pre-registration and automated host notifications.", icon: Building },
        { title: "Co-Working Spaces", description: "Multi-tenant visitor management with per-company tracking and billing.", icon: Building2 },
        { title: "Manufacturing Plants", description: "Safety compliance with NDA signing, PPE checklists, and restricted area management.", icon: Shield },
        { title: "Government Buildings", description: "Enhanced security with ID verification, visitor badges, and blacklist management.", icon: Users },
      ]}
      benefits={[
        "QR-based check-in",
        "Instant host notifications",
        "Pre-registration system",
        "Digital NDA signing",
        "Visitor badge printing",
        "Blacklist management",
        "Evacuation list generation",
        "Visit duration tracking",
        "Complete audit trail",
        "Multi-location support",
      ]}
      faqs={[
        { q: "Do visitors need an app?", a: "No. Visitors scan a QR code with their phone camera or use a tablet kiosk at reception. No app download required." },
        { q: "Can I require NDA signing?", a: "Yes. Configure NDAs or other documents that visitors must digitally sign before completing check-in." },
        { q: "How are hosts notified?", a: "Hosts receive instant notifications via in-app alert, email, and optionally SMS when their visitor arrives." },
        { q: "Is there an emergency feature?", a: "Yes. Generate a real-time list of all visitors currently in the building for emergency evacuation purposes." },
      ]}
    />
  );
}
