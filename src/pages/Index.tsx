import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { NewHero } from "@/components/landing/NewHero";
import { LogoMarquee } from "@/components/landing/LogoMarquee";
import LiveChatWidget from "@/components/LiveChatWidget";

// Eager above-fold sections. Everything below fold is lazy-loaded.
const ValueProps = lazy(() =>
  import("@/components/landing/ValueProps").then((m) => ({ default: m.ValueProps }))
);
const UseCasesGrid = lazy(() =>
  import("@/components/landing/UseCasesGrid").then((m) => ({ default: m.UseCasesGrid }))
);
const ProductDemo = lazy(() =>
  import("@/components/landing/ProductDemo").then((m) => ({ default: m.ProductDemo }))
);
const AISection = lazy(() =>
  import("@/components/landing/AISection").then((m) => ({ default: m.AISection }))
);
const StatsCounter = lazy(() =>
  import("@/components/landing/StatsCounter").then((m) => ({ default: m.StatsCounter }))
);
const ModuleShowcase = lazy(() =>
  import("@/components/landing/ModuleShowcase").then((m) => ({ default: m.ModuleShowcase }))
);
const HowItWorks = lazy(() =>
  import("@/components/landing/HowItWorks").then((m) => ({ default: m.HowItWorks }))
);
const TestimonialCarousel = lazy(() =>
  import("@/components/landing/TestimonialCarousel").then((m) => ({ default: m.TestimonialCarousel }))
);
const PricingTiers = lazy(() =>
  import("@/components/landing/PricingTiers").then((m) => ({ default: m.PricingTiers }))
);
const FAQAccordion = lazy(() =>
  import("@/components/landing/FAQAccordion").then((m) => ({ default: m.FAQAccordion }))
);
const CTABanner = lazy(() =>
  import("@/components/landing/CTABanner").then((m) => ({ default: m.CTABanner }))
);

function SectionFallback() {
  return <div className="py-12" />;
}

export default function Index() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <div className="landing-dark min-h-screen bg-background">
      <PublicNavbar />
      <NewHero isLoggedIn={isLoggedIn} />
      <LogoMarquee />

      <Suspense fallback={<SectionFallback />}>
        <ValueProps />
        <UseCasesGrid />
        <ProductDemo />
        <AISection />
        <StatsCounter />
        <ModuleShowcase />
        <HowItWorks />
        <TestimonialCarousel />
        <PricingTiers isLoggedIn={isLoggedIn} />
        <FAQAccordion />
        <CTABanner isLoggedIn={isLoggedIn} />
      </Suspense>

      <PublicFooter />
      <LiveChatWidget />
    </div>
  );
}
