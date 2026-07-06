import DynamicPage, { type Block } from "@/components/DynamicPage";

const fallbackBlocks: Block[] = [
  { id: "1", type: "hero", content: { heading: "Acceptable Use Policy", subheading: "Rules & Guidelines for Using the Dynime Platform · Effective Date: June 1, 2025" } },

  { id: "2", type: "text", content: { heading: "", body: "*This Acceptable Use Policy (\"AUP\") outlines the rules and guidelines for using the Dynime platform. It is incorporated by reference into our Terms & Conditions. Violations may result in account suspension or termination.*" } },

  { id: "3", type: "text", content: { heading: "1. Purpose", body: "This AUP ensures a safe, secure, and productive experience for all Dynime users. It applies to all users, including Account holders, Authorized Users, and any individual accessing the Service through your Account." } },

  { id: "4", type: "text", content: { heading: "2. Prohibited Content", body: "You shall not upload, transmit, store, or distribute content that:\n\n• Is unlawful, defamatory, libelous, obscene, pornographic, threatening, harassing, hateful, or discriminatory\n• Infringes upon any third party's intellectual property rights, privacy rights, or other proprietary rights\n• Contains Malicious Code (viruses, worms, Trojan horses, ransomware, spyware)\n• Promotes illegal activities, violence, or self-harm\n• Contains unauthorized personal data of third parties without their consent\n• Violates any applicable law, regulation, or industry standard" } },

  { id: "5", type: "text", content: { heading: "3. Prohibited Activities", body: "You shall not:\n\n• Engage in any activity that interferes with, disrupts, damages, or impairs the Service, servers, networks, or infrastructure\n• Attempt to gain unauthorized access to any portion of the Service, other user accounts, or any systems connected to the Service\n• Use automated means (bots, scrapers, crawlers, spiders) to access the Service without prior written authorization\n• Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Service\n• Use the Service for competitive analysis, benchmarking, or to build a competing product\n• Share your account credentials with unauthorized individuals\n• Exceed rate limits or usage quotas to gain unfair advantage\n• Use the Service to send spam, unsolicited commercial messages, or phishing emails\n• Misrepresent your identity or affiliation with any person or entity" } },

  { id: "6", type: "text", content: { heading: "4. Resource Usage", body: "You shall use the platform's resources (storage, API calls, bandwidth) responsibly and within your plan's allocated limits. Excessive or abusive resource usage that degrades the platform for other users may result in throttling, suspension, or termination." } },

  { id: "7", type: "text", content: { heading: "5. Security Requirements", body: "You are responsible for:\n\n• Maintaining the confidentiality of your login credentials\n• Enabling multi-factor authentication (MFA) for all administrative accounts\n• Promptly reporting any security vulnerabilities or breaches to security@dynime.com\n• Following industry-standard security practices when integrating with the Dynime API\n• Ensuring that any third-party integrations you enable comply with our security requirements" } },

  { id: "8", type: "text", content: { heading: "6. Enforcement", body: "Violation of this AUP may result in:\n\n• **Warning**: Written notification and a request to remedy the violation within a specified timeframe\n• **Suspension**: Temporary suspension of the offending Account or functionality\n• **Termination**: Permanent termination of your Account without refund\n• **Legal Action**: Reporting to law enforcement authorities where legally required or appropriate\n\nWe reserve the right to remove any content that violates this AUP without prior notice." } },

  { id: "9", type: "text", content: { heading: "7. Reporting Violations", body: "If you become aware of any violations of this AUP, please report them to:\n\n• **Email**: abuse@dynime.com\n• **Support**: support@dynime.com\n\nAll reports will be investigated promptly and handled confidentially." } },

  { id: "10", type: "text", content: { heading: "8. Changes to This Policy", body: "We may update this AUP at any time. Material changes will be communicated via email or in-app notification at least 15 days before taking effect. Continued use of the Service after the effective date constitutes acceptance." } },

  { id: "11", type: "text", content: { heading: "9. Contact", body: "| | |\n|---|---|\n| **General Contact** | contact@dynime.com |\n| **Support** | support@dynime.com |\n| **Abuse Reports** | abuse@dynime.com |\n| **Company** | Dynime LLC |\n| **Address** | 2B, 16, 16/1 Basubazar Lane, Dayaganj, Wari, Dhaka, 1100, Bangladesh |\n\n*Last Updated: June 1, 2025 · Version 1.0 · dynime.com/acceptable-use*" } },
];

export default function AcceptableUsePolicy() {
  return <DynamicPage slug="/acceptable-use" fallbackTitle="Acceptable Use Policy" fallbackBlocks={fallbackBlocks} />;
}
