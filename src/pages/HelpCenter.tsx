import DynamicPage, { type Block } from "@/components/DynamicPage";

const fallbackBlocks: Block[] = [
  { id: "1", type: "hero", content: { heading: "Help Center", subheading: "Find answers, guides, and resources to help you get the most out of Dynime." } },
  { id: "2", type: "features", content: { heading: "", items: [
    { title: "Getting Started", description: "Learn the basics and set up your account.", links: ["How to create your account", "Setting up your company profile", "Inviting team members", "Navigating the dashboard"] },
    { title: "HRMS & Employees", description: "Manage your workforce efficiently.", links: ["Adding employees", "Leave management guide", "Payroll setup", "Attendance tracking"] },
    { title: "Billing & Payments", description: "Subscription and payment questions.", links: ["Understanding your plan", "Upgrading or downgrading", "Payment methods", "Invoice downloads"] },
    { title: "Account Settings", description: "Configure your workspace.", links: ["Profile settings", "Security & 2FA", "Notification preferences", "API keys & integrations"] },
    { title: "CRM & Sales", description: "Sales pipeline and customer tools.", links: ["Managing deals", "Contact management", "Pipeline customization", "Reporting & analytics"] },
    { title: "Troubleshooting", description: "Fix common issues quickly.", links: ["Login problems", "Data not syncing", "Email delivery issues", "Browser compatibility"] },
  ] } },
  { id: "3", type: "cta", content: { heading: "Still need help?", description: "Our support team is available to assist you.", button_text: "Contact Support", button_link: "/contact" } },
];

export default function HelpCenter() {
  return (
    <DynamicPage slug="/help" fallbackTitle="Help Center" fallbackBlocks={fallbackBlocks} maxWidth="max-w-4xl" />
  );
}
