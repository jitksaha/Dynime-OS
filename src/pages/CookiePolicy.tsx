import DynamicPage, { type Block } from "@/components/DynamicPage";

const fallbackBlocks: Block[] = [
  { id: "1", type: "hero", content: { heading: "Cookie Policy", subheading: "How We Use Cookies & Tracking Technologies · Effective Date: June 1, 2025" } },

  { id: "2", type: "text", content: { heading: "", body: "*This Cookie Policy explains what cookies are, how Dynime uses them, and how you can control them. We are committed to transparency and compliance with ePrivacy Directive (EU), UK PECR, and CCPA requirements.*" } },

  { id: "3", type: "text", content: { heading: "1. What Are Cookies?", body: "Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, authenticate users, analyze traffic, and deliver personalized experiences. Dynime uses both first-party cookies (set by us) and third-party cookies (set by external services)." } },

  { id: "4", type: "text", content: { heading: "2. Types of Cookies We Use", body: "**2.1 Strictly Necessary Cookies**\nThese cookies are essential for the platform to function. They cannot be disabled. They enable:\n• User authentication and session management\n• Security tokens (CSRF protection)\n• Load balancing and server routing\n• Remembering consent preferences\n\n**2.2 Functional Cookies**\nThese enhance your experience but are not essential. They enable:\n• Remembering language and regional preferences\n• Saving UI layout and dashboard configurations\n• Auto-fill and form persistence\n\n**2.3 Analytics & Performance Cookies**\nUsed to understand how users interact with our platform. Data is anonymized.\n• Google Analytics 4 – traffic analysis and feature usage\n• Mixpanel – user behavior analytics and funnel analysis\n\n**2.4 Marketing & Advertising Cookies**\nUsed only with your consent for targeted advertising:\n• Google Ads – remarketing campaigns\n• LinkedIn Insight Tag – B2B advertising targeting\n• Facebook Pixel – social media advertising" } },

  { id: "5", type: "text", content: { heading: "3. Cookie Lifespan", body: "| **Cookie Name** | **Duration** | **Purpose** |\n|---|---|---|\n| dynime_session | Session | Authentication |\n| dynime_csrf | Session | Security protection |\n| dynime_prefs | 1 year | User preferences |\n| _ga (Google) | 2 years | Analytics |\n| mp_* (Mixpanel) | 1 year | Behavioral analytics |\n| _fbp (Facebook) | 3 months | Marketing (consent) |" } },

  { id: "6", type: "text", content: { heading: "4. Managing Your Cookie Preferences", body: "You can manage cookie preferences in several ways:\n\n• **Cookie Banner**: Click \"Manage Preferences\" on the consent banner shown at first visit\n• **Account Settings**: Go to Settings > Privacy > Cookie Preferences\n• **Browser Settings**: Most browsers allow you to block or delete cookies\n• **Opt-Out Links**: Google Analytics Opt-Out (tools.google.com/dlpage/gaoptout)\n\nDisabling strictly necessary cookies will impair platform functionality. Analytics and marketing cookies can be disabled without affecting core features." } },

  { id: "7", type: "text", content: { heading: "5. Do Not Track (DNT)", body: "Dynime respects browser-level Do Not Track (DNT) signals. When DNT is enabled, we disable non-essential analytics and marketing cookies automatically." } },

  { id: "8", type: "text", content: { heading: "6. Changes to This Policy", body: "We may update this Cookie Policy. Significant changes will be communicated via the consent banner or email. Check dynime.com/cookies for the latest version." } },

  { id: "9", type: "text", content: { heading: "7. Contact", body: "| | |\n|---|---|\n| **General Contact** | contact@dynime.com |\n| **Support** | support@dynime.com |\n| **Company** | Dynime LLC |\n| **Address** | 2B, 16, 16/1 Basubazar Lane, Dayaganj, Wari, Dhaka, 1100, Bangladesh |\n\n*Last Updated: June 1, 2025 · Version 1.0 · dynime.com/cookies*" } },
];

export default function CookiePolicy() {
  return <DynamicPage slug="/cookies" fallbackTitle="Cookie Policy" fallbackBlocks={fallbackBlocks} />;
}
