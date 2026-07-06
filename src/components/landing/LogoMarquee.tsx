import { motion } from "framer-motion";

// Placeholder logos — replace with real customer/partner logos
const logos = [
  { name: "TechCorp", className: "text-2xl font-bold text-foreground/70" },
  { name: "FinServ", className: "text-2xl font-bold text-foreground/70" },
  { name: "MediCare", className: "text-2xl font-bold text-foreground/70" },
  { name: "EduLabs", className: "text-2xl font-bold text-foreground/70" },
  { name: "RetailPro", className: "text-2xl font-bold text-foreground/70" },
  { name: "LogiTech", className: "text-2xl font-bold text-foreground/70" },
  { name: "AgriGrow", className: "text-2xl font-bold text-foreground/70" },
  { name: "Constructo", className: "text-2xl font-bold text-foreground/70" },
  { name: "SmartHR", className: "text-2xl font-bold text-foreground/70" },
  { name: "CloudPay", className: "text-2xl font-bold text-foreground/70" },
];

export function LogoMarquee() {
  // Double the logos for seamless loop
  const allLogos = [...logos, ...logos];

  return (
    <section className="py-12 lg:py-16 border-y border-border/30 overflow-hidden">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Trusted by 10,000+ businesses worldwide
        </p>
      </div>
      <div className="relative max-w-6xl mx-auto overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex gap-16 animate-logo-marquee">
          {allLogos.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex-shrink-0 flex items-center justify-center h-12 opacity-50 hover:opacity-80 transition-opacity cursor-default"
            >
              <span className={logo.className}>{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
