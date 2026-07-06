import DynamicPage, { type Block } from "@/components/DynamicPage";

const fallbackBlocks: Block[] = [
  { id: "1", type: "hero", content: { heading: "Data Processing Agreement", subheading: "GDPR Article 28 Compliant DPA · Effective Date: June 1, 2025" } },

  { id: "2", type: "text", content: { heading: "", body: "*This Data Processing Agreement (DPA) forms part of the Terms & Conditions between Dynime and the Customer. It is designed to comply with GDPR Article 28 and governs the processing of personal data by Dynime on behalf of the Customer.*" } },

  { id: "3", type: "text", content: { heading: "1. Definitions", body: "• **\"Controller\"**: The Customer who determines the purposes and means of processing Personal Data\n• **\"Processor\"**: Dynime LLC, which processes Personal Data on behalf of the Controller\n• **\"Data Subject\"**: Any identified or identifiable natural person whose data is processed\n• **\"Personal Data\"**: Information relating to an identified or identifiable natural person\n• **\"Processing\"**: Any operation performed on Personal Data\n• **\"Sub-processor\"**: A third party engaged by Dynime to process Customer Personal Data\n• **\"GDPR\"**: Regulation (EU) 2016/679 of the European Parliament" } },

  { id: "4", type: "text", content: { heading: "2. Subject Matter & Duration", body: "This DPA governs Dynime's processing of Personal Data contained in Customer Data uploaded to the Dynime platform. Processing shall continue for the duration of the active subscription agreement and for any post-termination retention periods specified in the Privacy Policy or required by law." } },

  { id: "5", type: "text", content: { heading: "3. Nature & Purpose of Processing", body: "• Providing the Dynime CRM, HRM, accounting, project management, and workflow Services\n• Technical support, troubleshooting, and customer service\n• Security monitoring, incident detection, and fraud prevention\n• Billing, invoicing, and payment processing\n• Platform improvement and feature development (using anonymized data only)" } },

  { id: "6", type: "text", content: { heading: "4. Types of Personal Data Processed", body: "• **CRM Data**: Customer names, email addresses, phone numbers, company details\n• **HRM Data**: Employee names, addresses, employment history, payroll data, performance records\n• **Accounting Data**: Financial data, bank details, VAT numbers, invoice information\n• **User Account Data**: Login credentials, usage logs, IP addresses\n• **Communication Data**: Support tickets, messages, feedback" } },

  { id: "7", type: "text", content: { heading: "5. Dynime's Obligations as Processor", body: "Dynime shall:\n\n• Process Personal Data only on documented instructions from the Controller\n• Ensure confidentiality obligations bind all personnel with access to Personal Data\n• Implement appropriate technical and organizational security measures (GDPR Article 32)\n• Assist the Controller in fulfilling Data Subject rights requests\n• Delete or return all Personal Data upon termination of the agreement\n• Provide all information necessary to demonstrate GDPR compliance\n• Not engage sub-processors without prior authorization from the Controller\n• Notify the Controller without undue delay of any Personal Data breach" } },

  { id: "8", type: "text", content: { heading: "6. Sub-Processors", body: "Dynime maintains an approved sub-processor list. Current key sub-processors include:\n\n| **Sub-Processor** | **Purpose** | **Location** |\n|---|---|---|\n| Amazon Web Services | Cloud hosting & storage | US, EU (Frankfurt) |\n| Stripe, Inc. | Payment processing | United States |\n| PayPal Holdings | Payment processing | United States |\n| Paddle.com Market Ltd | Payment & billing | United Kingdom |\n| SendGrid (Twilio) | Transactional email | United States |\n| Google Cloud | Data backup & analytics | US, EU |\n\nDynime will provide 30 days' notice before adding new sub-processors that process EEA Personal Data. The Controller may object in writing within this period." } },

  { id: "9", type: "text", content: { heading: "7. Security Measures (Article 32)", body: "• AES-256 encryption for data at rest\n• TLS 1.3 encryption for all data in transit\n• Role-based access control (RBAC) with principle of least privilege\n• Multi-factor authentication (MFA) for all Dynime staff\n• Annual SOC 2 Type II audits\n• Automated vulnerability scanning and penetration testing\n• 72-hour Personal Data breach notification to Controller\n• Business continuity and disaster recovery plans" } },

  { id: "10", type: "text", content: { heading: "8. International Data Transfers", body: "For transfers of EEA Personal Data to third countries, Dynime relies on: (a) EU Standard Contractual Clauses (SCCs) as approved by European Commission Decision 2021/914; (b) adequacy decisions; or (c) other lawful transfer mechanisms under Chapter V of GDPR." } },

  { id: "11", type: "text", content: { heading: "9. Data Breach Notification", body: "In the event of a Personal Data breach affecting Customer Data, Dynime shall notify the Controller without undue delay and in any event within 72 hours of becoming aware. Notification shall include: nature of the breach, categories and approximate number of data subjects affected, likely consequences, and measures taken or proposed." } },

  { id: "12", type: "text", content: { heading: "10. Audit Rights", body: "The Controller may request audits of Dynime's data processing activities no more than once per year (unless required by regulatory order). Audits shall be conducted with reasonable notice, during business hours, and at the Controller's expense. Dynime may provide its most recent SOC 2 report in lieu of an on-site audit." } },

  { id: "13", type: "text", content: { heading: "11. Contact", body: "| | |\n|---|---|\n| **General Contact** | contact@dynime.com |\n| **Support** | support@dynime.com |\n| **Address** | 2B, 16, 16/1 Basubazar Lane, Dayaganj, Wari, Dhaka, 1100, Bangladesh |\n\n*Last Updated: June 1, 2025 · Version 1.0 · dynime.com/dpa*" } },
];

export default function DataProcessingAgreement() {
  return <DynamicPage slug="/dpa" fallbackTitle="Data Processing Agreement" fallbackBlocks={fallbackBlocks} />;
}
