import FeaturePageLayout from "@/components/FeaturePageLayout";
import {
  Wallet, CreditCard, RefreshCw, Shield, BarChart3, Zap,
  Globe, Building2, ShoppingCart, Briefcase, PiggyBank, ArrowUpDown,
} from "lucide-react";
import { usePayBrand } from "@/hooks/usePayBrand";

export default function WalletFeature() {
  const { payBrand } = usePayBrand();

  return (
    <FeaturePageLayout
      title={`${payBrand} — Digital Payments`}
      subtitle="Financial Management"
      description={`A built-in ${payBrand} system for companies and customers — top-up, pay, manage recurring charges, and track every transaction.`}
      icon={Wallet}
      gradient="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600"
      features={[
        { title: "Wallet Balance", description: "Real-time balance display with instant top-up via multiple payment gateways.", icon: Wallet },
        { title: "Saved Payment Methods", description: "Securely store credit cards and payment methods for one-click transactions.", icon: CreditCard },
        { title: "Auto Payments", description: "Set up recurring payments for subscriptions, services, and regular charges.", icon: RefreshCw },
        { title: "Transaction History", description: "Complete audit trail of all credits, debits, and transfers with filtering.", icon: BarChart3 },
        { title: "Secure Transactions", description: "Bank-grade encryption and PCI compliance for every payment operation.", icon: Shield },
        { title: "Instant Settlements", description: "Fast payment processing with real-time balance updates and notifications.", icon: Zap },
      ]}
      detailSections={[
        {
          id: "topup",
          label: "Top-Up & Payments",
          icon: ArrowUpDown,
          color: "hsl(142,71%,45%)",
          title: "Fund your wallet, pay with ease",
          description: "Multiple top-up methods including credit card, bank transfer, and mobile payments. Pay for services instantly from your wallet balance.",
          points: [
            "Multiple payment gateway support",
            "Instant balance reflection",
            "One-click payment from wallet",
            "Payment receipt generation",
            "Multi-currency support",
          ],
        },
        {
          id: "recurring",
          label: "Recurring Payments",
          icon: RefreshCw,
          color: "hsl(270,80%,60%)",
          title: "Set it and forget it",
          description: "Automate subscription payments, service charges, and regular expenses. Get notified before charges and manage all recurring payments from one dashboard.",
          points: [
            "Flexible billing intervals",
            "Pre-charge notifications",
            "Automatic retry on failure",
            "Easy pause and cancel",
            "Full payment schedule visibility",
          ],
        },
      ]}
      stats={[
        { value: "50%", label: "Faster payment processing" },
        { value: "99.9%", label: "Payment success rate" },
        { value: "0", label: "Payment data breaches" },
        { value: "24/7", label: "Transaction availability" },
      ]}
      useCases={[
        { title: "SaaS Subscriptions", description: "Automate monthly subscription charges and manage customer billing cycles.", icon: Globe },
        { title: "Company Expenses", description: "Pre-fund company wallets for team purchases with approval workflows.", icon: Building2 },
        { title: "E-Commerce Credits", description: "Offer store credits, refund to wallet, and enable wallet checkout.", icon: ShoppingCart },
        { title: "Service Retainers", description: "Manage client retainer balances with automatic deductions per service.", icon: Briefcase },
      ]}
      benefits={[
        "Instant payment processing",
        "Saved payment methods",
        "Automated recurring charges",
        "Complete transaction history",
        "Multi-currency support",
        "Bank-grade security",
        "Real-time balance updates",
        "Payment receipt generation",
      ]}
      faqs={[
        { q: "Which payment gateways are supported?", a: "We support Stripe, SSLCommerz, bKash, and more. Additional gateways can be configured by your admin." },
        { q: "Is wallet data secure?", a: "Yes. All payment data is encrypted with bank-grade security. We never store raw card details on our servers." },
        { q: "Can customers refund to wallet?", a: "Yes. Refunds can be directed to the wallet balance for instant credit, making future purchases faster." },
        { q: "How do recurring payments work?", a: "Set up a payment schedule with amount, frequency, and payment method. Charges process automatically with pre-charge notifications." },
      ]}
    />
  );
}
