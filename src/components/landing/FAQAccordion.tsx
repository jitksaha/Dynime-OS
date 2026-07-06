import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes! You can start with a full-featured 14-day free trial. No credit card required. Explore all modules, invite your team, and see if Dynime is right for your business.",
  },
  {
    question: "Can I migrate data from my existing tools?",
    answer:
      "Absolutely. We support CSV imports, API integrations, and direct migrations from most popular platforms including Zoho, QuickBooks, Salesforce, and more. Our support team will help you through the process at no extra cost.",
  },
  {
    question: "How does pricing work as I add more users?",
    answer:
      "Pricing is per-user, per-month. You only pay for active users. There are no per-module fees — every plan includes access to all modules. Annual billing gives you 2 months free.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security is our top priority. We are SOC 2 Type II compliant, use AES-256 encryption at rest and TLS 1.3 in transit, and offer SSO, 2FA, audit logs, and role-based access control. We also offer on-premise deployment for Enterprise customers.",
  },
  {
    question: "Do you offer custom modules or integrations?",
    answer:
      "Yes. Enterprise customers can request custom modules built to their specifications. We also provide a REST API, webhooks, and Zapier integration so you can connect Dynime to 5000+ other tools.",
  },
  {
    question: "What kind of support do you provide?",
    answer:
      "Starter plans include email support with a 24-hour SLA. Business plans get priority chat support with a 4-hour SLA. Enterprise customers get a dedicated account manager with a 1-hour response SLA and quarterly business reviews.",
  },
];

export function FAQAccordion() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-8 section-alt">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Frequently asked{" "}
            <span className="text-gradient-hero">questions</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <AccordionItem
                value={`item-${i}`}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-5 overflow-hidden"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                  <span className="flex-1">{faq.question}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
