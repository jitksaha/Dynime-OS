import FeaturePageLayout from "@/components/FeaturePageLayout";
import {
  ShoppingCart, Package, Receipt, BarChart3, Truck, CreditCard,
  Globe, Building2, Briefcase, Heart, Store, Keyboard,
} from "lucide-react";

export default function POSFeature() {
  return (
    <FeaturePageLayout
      title="Complete Point of Sale"
      subtitle="Commerce & Inventory"
      description="A powerful POS terminal with inventory management, order tracking, and courier integrations — everything you need to sell smarter."
      icon={ShoppingCart}
      gradient="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600"
      features={[
        { title: "POS Terminal", description: "Fast, intuitive checkout with keyboard shortcuts (F2, F9) and hold/recall functionality.", icon: Receipt },
        { title: "Product Catalog", description: "Manage products with images, variants, pricing, and real-time inventory tracking.", icon: Package },
        { title: "Order Management", description: "Track orders from placement to delivery with status updates and bulk operations.", icon: ShoppingCart },
        { title: "Courier Integration", description: "Send orders to Steadfast, Pathao, or RedX couriers directly from the dashboard.", icon: Truck },
        { title: "Sales Analytics", description: "Real-time profit tracking, sales trends, and product performance dashboards.", icon: BarChart3 },
        { title: "Multiple Payments", description: "Accept cash, card, mobile wallet, and bank transfers at checkout.", icon: CreditCard },
      ]}
      detailSections={[
        {
          id: "terminal",
          label: "POS Terminal",
          icon: Keyboard,
          color: "hsl(38,92%,50%)",
          title: "Lightning-fast checkout experience",
          description: "Process sales in seconds with an optimized terminal interface. Hold orders, recall them later, and use keyboard shortcuts for power-user speed.",
          points: [
            "Keyboard shortcuts for rapid checkout",
            "Hold & recall orders during peak hours",
            "Real-time profit calculation per sale",
            "Multiple payment method support",
            "Quick product search with barcode support",
          ],
        },
        {
          id: "inventory",
          label: "Inventory Control",
          icon: Package,
          color: "hsl(200,80%,55%)",
          title: "Never run out of stock again",
          description: "Track inventory levels in real-time, set low-stock alerts, and manage product images with bulk edit tools for efficient catalog management.",
          points: [
            "Real-time stock level tracking",
            "Low-stock alerts and notifications",
            "Bulk product import and editing",
            "Image uploads (up to 5MB per product)",
            "Variant management for sizes/colors",
          ],
        },
        {
          id: "fulfillment",
          label: "Order Fulfillment",
          icon: Truck,
          color: "hsl(142,71%,45%)",
          title: "From order to doorstep, automated",
          description: "Send single or bulk orders to integrated courier partners. Track delivery status and manage customer zones for accurate shipping.",
          points: [
            "Bulk fulfillment for multiple orders",
            "Steadfast, Pathao, RedX integration",
            "Customer zone & area mapping",
            "Delivery status tracking",
            "Optimistic UI for instant updates",
          ],
        },
      ]}
      stats={[
        { value: "60%", label: "Faster checkout speed" },
        { value: "3x", label: "More orders processed daily" },
        { value: "25%", label: "Reduction in stock issues" },
        { value: "99.9%", label: "Order accuracy rate" },
      ]}
      useCases={[
        { title: "Retail Stores", description: "Fast in-store checkout with inventory sync, receipt generation, and end-of-day reports.", icon: Store },
        { title: "E-Commerce", description: "Manage online orders, process payments, and ship via integrated courier partners.", icon: Globe },
        { title: "Wholesale", description: "Handle bulk orders, tiered pricing, and B2B invoicing from a unified dashboard.", icon: Building2 },
        { title: "Food & Beverage", description: "Quick-service checkout with held orders, kitchen displays, and daily sales tracking.", icon: Heart },
      ]}
      benefits={[
        "Keyboard-driven speed at checkout",
        "Hold & recall orders seamlessly",
        "Integrated courier dispatch",
        "Real-time profit per transaction",
        "Bulk order fulfillment",
        "Product image management",
        "Multi-payment support",
        "Sales & inventory analytics",
      ]}
      faqs={[
        { q: "Which courier services are integrated?", a: "We currently support Steadfast, Pathao, and RedX. More integrations are being added regularly." },
        { q: "Can I manage multiple store locations?", a: "Yes. Each tenant can manage products and orders across locations with centralized reporting." },
        { q: "Does it support barcode scanning?", a: "Yes. The POS terminal supports barcode input for rapid product lookup during checkout." },
        { q: "How does bulk fulfillment work?", a: "Select multiple eligible orders, choose a courier, and dispatch them all in a single batch. Customer zone and area fields are required for shipping." },
      ]}
    />
  );
}
