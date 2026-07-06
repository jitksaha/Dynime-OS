import DynamicPage, { type Block } from "@/components/DynamicPage";

const fallbackBlocks: Block[] = [
  { id: "1", type: "hero", content: { heading: "Refund Policy", subheading: "Subscriptions & Billing · Effective Date: June 1, 2025" } },

  { id: "2", type: "text", content: { heading: "", body: "*Dynime offers a fair and transparent refund policy. Please read carefully to understand your eligibility. For questions, contact billing@dynime.com within the applicable timeframe.*" } },

  { id: "3", type: "text", content: { heading: "1. Overview", body: "Dynime LLC is committed to customer satisfaction. This Refund Policy governs all refund requests for subscriptions and services purchased through dynime.com and is compliant with Stripe, PayPal, and Paddle refund processing requirements." } },

  { id: "4", type: "text", content: { heading: "2. Money-Back Guarantee", body: "All new paid subscriptions are eligible for a full refund within **30 days** of the initial purchase date — no questions asked. This applies to monthly and annual plans.\n\n• Full refund of the subscription fee paid\n• No cancellation fee or penalty\n• Refund issued to the original payment method within 5–10 business days\n• Applies only to first-time purchases per customer account" } },

  { id: "5", type: "text", content: { heading: "3. Subscription Cancellation & Billing", body: "**3.1 Monthly Subscriptions**\nMonthly subscriptions auto-renew on the same calendar date each month. If you cancel before your renewal date, you retain access until the end of the current billing period. No partial-month refunds are issued after the 30-day money-back window.\n\n**3.2 Annual Subscriptions**\nAnnual subscriptions are billed upfront for a 12-month period. Cancellations within 30 days of the annual renewal date are eligible for a full refund of the renewed amount. Cancellations after 30 days of renewal are not eligible for refund, but access continues for the remainder of the annual period.\n\n**3.3 Downgrades**\nDowngrading your plan mid-cycle will apply the new plan at the start of your next billing period. No refund is issued for the difference in the current cycle." } },

  { id: "6", type: "text", content: { heading: "4. Eligible Refund Scenarios", body: "• Initial purchase within the 30-day money-back guarantee window\n• Annual renewal refund requested within 30 days of renewal charge\n• Duplicate charges caused by a technical or billing error\n• Service outages exceeding 99.9% SLA thresholds (SLA credits applied; cash refunds at Dynime's discretion)\n• Unauthorized charges resulting from fraud or compromised account (subject to investigation)\n• Feature unavailability that was explicitly promised in writing at time of purchase" } },

  { id: "7", type: "text", content: { heading: "5. Non-Refundable Items", body: "• Subscriptions beyond the 30-day money-back window\n• Add-on purchases (additional users, storage, API credits) once consumed\n• One-time setup, onboarding, or professional services fees\n• Partner or reseller purchases (governed by the partner's own refund terms)\n• Accounts terminated for violation of our Acceptable Use Policy or Terms\n• Promotionally discounted or free upgrade periods" } },

  { id: "8", type: "text", content: { heading: "6. How to Request a Refund", body: "To request a refund, follow these steps:\n\n1. Email billing@dynime.com with subject line: \"Refund Request – [Your Account Email]\"\n2. Include your account email, invoice number, and reason for the refund request\n3. Our billing team will respond within 2 business days\n4. Approved refunds are processed to the original payment method within 5–10 business days" } },

  { id: "9", type: "text", content: { heading: "7. Payment Processor-Specific Information", body: "**7.1 Stripe**\nRefunds processed via Stripe will appear on your statement within 5–10 business days. The exact timing depends on your card issuer. Stripe's transaction fee ($0.30 + 2.9%) is non-recoverable and may be deducted from refunds on non-error-based requests.\n\n**7.2 PayPal**\nRefunds via PayPal are credited to your PayPal account or original funding source within 5–7 business days. If your PayPal account is closed, contact PayPal support for alternative resolution. PayPal's fees are non-refundable by PayPal's policy and may be reflected in net refund amounts.\n\n**7.3 Paddle**\nPaddle acts as the Merchant of Record for certain transactions. Refunds for Paddle-processed payments are subject to Paddle's refund policy (paddle.com/legal). Dynime will coordinate with Paddle on your behalf. VAT/taxes remitted by Paddle may not be fully refundable depending on jurisdiction." } },

  { id: "10", type: "text", content: { heading: "8. Currency & Taxes", body: "All refunds are issued in the same currency as the original transaction. We cannot control exchange rate differences for international payments. Tax refunds (VAT, GST) are issued where legally required and depend on your jurisdiction." } },

  { id: "11", type: "text", content: { heading: "9. Chargebacks", body: "If you initiate a chargeback or payment dispute with your bank or card issuer before contacting us, your account may be suspended pending resolution. We encourage you to contact us first — we resolve most billing issues quickly and without the need for formal disputes." } },

  { id: "12", type: "text", content: { heading: "10. Contact", body: "| | |\n|---|---|\n| **General Contact** | contact@dynime.com |\n| **Support** | support@dynime.com |\n| **Sales Inquiry** | sales@dynime.com |\n| **Address** | 2B, 16, 16/1 Basubazar Lane, Dayaganj, Wari, Dhaka, 1100, Bangladesh |\n| **Response Time** | Within 2 business days |\n\n*Last Updated: June 1, 2025 · Version 1.0 · dynime.com/refunds*" } },
];

export default function Refund() {
  return <DynamicPage slug="/refund" fallbackTitle="Refund Policy" fallbackBlocks={fallbackBlocks} />;
}
