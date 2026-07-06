import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Monitor, Laptop, Smartphone, Server, Shield, Bell, Users, FileCheck, BarChart3, Building2 } from "lucide-react";

export default function ITAssetFeature() {
  return (
    <FeaturePageLayout
      title="IT Asset Management"
      subtitle="Hardware & Software Tracking"
      description="Track every hardware device and software license across your organization. Prevent costly oversights with automated alerts and assignment tracking."
      icon={Monitor}
      gradient="bg-gradient-to-br from-slate-600 via-gray-600 to-zinc-700"
      features={[
        { title: "Hardware Registry", description: "Track laptops, phones, printers, and servers with serial numbers and specifications.", icon: Laptop },
        { title: "Software Licenses", description: "Manage license seat counts, renewal dates, and compliance with automated alerts.", icon: Shield },
        { title: "Asset Assignment", description: "Assign assets to employees with digital acknowledgment and return tracking.", icon: Users },
        { title: "Lifecycle Tracking", description: "Track asset lifecycle from procurement to depreciation to disposal.", icon: BarChart3 },
        { title: "Maintenance Schedules", description: "Schedule preventive maintenance and track repair history for each asset.", icon: Server },
        { title: "Renewal Alerts", description: "Automated alerts for warranty expiry, license renewals, and lease end dates.", icon: Bell },
      ]}
      detailSections={[
        {
          id: "hardware",
          label: "Hardware Assets",
          icon: Laptop,
          color: "hsl(220,13%,46%)",
          title: "Complete hardware inventory at a glance",
          description: "Maintain a comprehensive registry of all hardware assets with serial numbers, purchase dates, warranty information, and current assignment status.",
          points: [
            "Detailed asset profiles with specs",
            "Serial number and barcode tracking",
            "Purchase cost and depreciation",
            "Warranty and insurance tracking",
            "Asset audit and stocktake tools",
          ],
        },
        {
          id: "software",
          label: "Software Licenses",
          icon: Shield,
          color: "hsl(199,89%,48%)",
          title: "Never overpay for licenses again",
          description: "Track every software license, allocated seats, and renewal dates. Get alerts before licenses expire and identify unused seats to optimize costs.",
          points: [
            "License type and seat tracking",
            "Cost per seat analytics",
            "Renewal date alerts",
            "Unused seat identification",
            "Compliance verification reports",
          ],
        },
      ]}
      stats={[
        { value: "30%", label: "Reduction in software costs" },
        { value: "100%", label: "Asset accountability" },
        { value: "Zero", label: "Missed license renewals" },
        { value: "50%", label: "Less IT admin time" },
      ]}
      useCases={[
        { title: "IT Departments", description: "Full visibility into hardware and software inventory across all offices and departments.", icon: Monitor },
        { title: "Tech Companies", description: "Track developer workstations, cloud subscriptions, and development tool licenses.", icon: Laptop },
        { title: "Enterprise Organizations", description: "Multi-location asset tracking with centralized reporting and compliance.", icon: Building2 },
        { title: "Education Institutions", description: "Lab equipment, classroom technology, and institutional software license management.", icon: Smartphone },
      ]}
      benefits={[
        "Complete hardware registry",
        "Software license tracking",
        "Employee asset assignment",
        "Digital acknowledgment",
        "Depreciation schedules",
        "Maintenance scheduling",
        "Warranty tracking",
        "License renewal alerts",
        "Cost optimization insights",
        "Audit-ready reports",
      ]}
      faqs={[
        { q: "Can employees see their assigned assets?", a: "Yes. Through the employee portal, staff can view all assets assigned to them and raise return or repair requests." },
        { q: "How does license compliance work?", a: "The system tracks allocated vs. available seats for each license. If usage exceeds the license count, compliance alerts are triggered." },
        { q: "Can I track asset depreciation?", a: "Yes. Configure depreciation methods (straight-line, declining balance) and the system automatically calculates current book value." },
        { q: "Is there barcode/QR scanning?", a: "Yes. Generate and print asset tags with barcodes or QR codes for quick scanning during audits and stocktakes." },
      ]}
    />
  );
}
