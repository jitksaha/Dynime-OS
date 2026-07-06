import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { CountryCurrencySelector } from "@/components/CountryCurrencySelector";
import { supabase } from "@/integrations/supabase/db";
import { FooterThemePicker } from "@/components/FooterThemePicker";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useSocialMediaLinks } from "@/hooks/useSocialMediaLinks";
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Sparkles,
  ShieldCheck,
  Globe,
  Layers,
  BookOpen,
  Headphones,
  FileText,
  CreditCard,
  Briefcase,
  Building2,
  Zap,
  Heart,
} from "lucide-react";
import dynimeLogo from "@/assets/dynime-logo.png";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface FooterLink {
  label: string;
  href: string;
  badge?: string;
}

interface FooterColumn {
  title: string;
  icon?: React.ReactNode;
  links: FooterLink[];
}

interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

interface FooterConfig {
  company_name: string;
  tagline: string;
  copyright: string;
  columns: FooterColumn[];
  bottom_links: FooterLink[];
  social_links: SocialLink[];
  logo_url?: string;
  show_logo?: boolean;
  show_text_icon?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Comprehensive default footer — 7 columns, 55+ links
// ═══════════════════════════════════════════════════════════════

const FULL_FOOTER: FooterConfig = {
  company_name: "Dynime OS",
  tagline:
    "The all-in-one business platform. CRM, HRM, Accounting, Projects, AI — everything you need to run and grow your business, in one place.",
  copyright: `© ${new Date().getFullYear()} Dynime LLC.`,
  social_links: [
    { label: "Twitter", href: "https://twitter.com/dynime", icon: "X" },
    { label: "LinkedIn", href: "https://linkedin.com/company/dynime", icon: "in" },
    { label: "Instagram", href: "https://instagram.com/dynime", icon: "ig" },
    { label: "Facebook", href: "https://facebook.com/dynime", icon: "f" },
    { label: "YouTube", href: "https://youtube.com/@dynime", icon: "yt" },
  ],
  columns: [
    {
      title: "Product",
      icon: <Layers className="w-3 h-3" />,
      links: [
        { label: "Features", href: "/features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Integrations", href: "/features/integrations" },
        { label: "What's New", href: "/blog", badge: "New" },
        { label: "Compare Plans", href: "/pricing" },
        { label: "App Marketplace", href: "/app-marketplace" },
        { label: "Mobile App", href: "/app-download" },
        { label: "API & Webhooks", href: "/help" },
      ],
    },
    {
      title: "Solutions",
      icon: <Zap className="w-3 h-3" />,
      links: [
        { label: "CRM & Sales Pipeline", href: "/features/crm" },
        { label: "HR & Payroll", href: "/features/hrm" },
        { label: "Accounting & Tax", href: "/features/accounting" },
        { label: "Marketing Automation", href: "/features/marketing" },
        { label: "Project Management", href: "/features/projects" },
        { label: "POS & Inventory", href: "/features/pos" },
        { label: "Logistics & Fleet", href: "/features/logistics" },
        { label: "AI Assistant", href: "/features/ai", badge: "AI" },
      ],
    },
    {
      title: "Platform",
      icon: <Building2 className="w-3 h-3" />,
      links: [
        { label: "Document Management", href: "/features/documents" },
        { label: "E-Signatures", href: "/features/e-signatures" },
        { label: "Knowledge Base", href: "/features/knowledge-base" },
        { label: "OKR & Goals", href: "/features/okr" },
        { label: "Asset Management", href: "/features/assets" },
        { label: "Procurement", href: "/features/procurement" },
        { label: "Compliance & KYC", href: "/features/compliance" },
        { label: "Bookings & Scheduling", href: "/features/bookings" },
      ],
    },
    {
      title: "Resources",
      icon: <BookOpen className="w-3 h-3" />,
      links: [
        { label: "Help Center", href: "/help" },
        { label: "API Documentation", href: "/help" },
        { label: "Blog", href: "/blog" },
        { label: "Community Forum", href: "/contact" },
        { label: "Partners Program", href: "/partners" },
        { label: "Become a Partner", href: "/partners/apply" },
        { label: "System Status", href: "/contact" },
        { label: "ROI Calculator", href: "/tools/roi-calculator" },
      ],
    },
    {
      title: "Company",
      icon: <Briefcase className="w-3 h-3" />,
      links: [
        { label: "About Us", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Contact Sales", href: "/contact" },
        { label: "Customer Stories", href: "/testimonials" },
        { label: "Press & Media", href: "/about" },
        { label: "Brand Assets", href: "/about" },
        { label: "Trust Center", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      icon: <FileText className="w-3 h-3" />,
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
        { label: "Refund Policy", href: "/refund" },
        { label: "Disclaimer", href: "/disclaimer" },
        { label: "Acceptable Use", href: "/acceptable-use" },
        { label: "DPA (GDPR)", href: "/dpa" },
      ],
    },
  ],
  bottom_links: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
    { label: "Refund", href: "/refund" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Acceptable Use", href: "/acceptable-use" },
    { label: "DPA", href: "/dpa" },
    { label: "Sitemap", href: "/sitemap" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// Config fetching (from Supabase, with fallback)
// ═══════════════════════════════════════════════════════════════

let cachedConfig: FooterConfig | null = null;
let fetchPromise: Promise<FooterConfig> | null = null;

async function fetchFooterConfig(): Promise<FooterConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "footer")
        .single();
      if (data?.value) {
        const remote = data.value as unknown as Partial<FooterConfig>;
        cachedConfig = {
          ...FULL_FOOTER,
          ...remote,
          columns: remote.columns || FULL_FOOTER.columns,
          bottom_links: remote.bottom_links || FULL_FOOTER.bottom_links,
          social_links: remote.social_links || FULL_FOOTER.social_links,
        };
        return cachedConfig;
      }
    } catch {
      // use fallback
    }
    cachedConfig = FULL_FOOTER;
    return cachedConfig;
  })();
  return fetchPromise;
}

// ═══════════════════════════════════════════════════════════════
// Social icons (real SVG paths)
// ═══════════════════════════════════════════════════════════════

const SOCIAL_PATHS: Record<string, string> = {
  f: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  ig: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m.2 2A3.6 3.6 0 0 0 4.4 8v8a3.6 3.6 0 0 0 3.6 3.6h8a3.6 3.6 0 0 0 3.6-3.6V8a3.6 3.6 0 0 0-3.6-3.6zm9.65 1.5a1.25 1.25 0 0 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  X: "M4 4l6.5 7.7L4 18h1.5l5.2-6 4.3 6H22l-7-8.2L21 4h-1.5l-4.8 5.5L11 4zm2.2 1h2.6l9.3 12.6h-2.6z",
  in: "M6.5 21.5h-4v-13h4v13zM4.5 7a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM21.5 21.5h-4v-6.5c0-1.5 0-3.5-2-3.5s-2.5 1.5-2.5 3v7h-4v-13h3.8v1.8h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6v7.2z",
  yt: "M19.6 6.2C19.4 5.5 19 4.9 18.3 4.7 16.9 4.3 12 4.3 12 4.3s-4.9 0-6.3.4c-.7.2-1.1.8-1.3 1.5C4 7.5 4 10 4 10s0 2.5.4 3.8c.2.7.6 1.3 1.3 1.5 1.4.4 6.3.4 6.3.4s4.9 0 6.3-.4c.7-.2 1.1-.8 1.3-1.5.4-1.3.4-3.8.4-3.8s0-2.5-.4-3.8M10.4 12.5V7.5L14.5 10z",
};

function SocialSvg({ icon }: { icon: string }) {
  const d = SOCIAL_PATHS[icon];
  if (!d) return null;
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// Footer link (internal + external)
// ═══════════════════════════════════════════════════════════════

function FooterLinkItem({ link }: { link: FooterLink }) {
  const inner = (
    <span className="group/link inline-flex items-center gap-1">
      <span className="text-[13px] text-muted-foreground group-hover/link:text-foreground transition-colors duration-200">
        {link.label}
      </span>
      {link.badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
          {link.badge}
        </span>
      )}
    </span>
  );

  if (link.href.startsWith("http")) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group/link inline-flex items-center gap-0.5"
      >
        {inner}
        <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 opacity-0 -ml-0.5 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all" />
      </a>
    );
  }
  return <Link to={link.href}>{inner}</Link>;
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function PublicFooter() {
  const [config, setConfig] = useState<FooterConfig>(cachedConfig || FULL_FOOTER);
  const { appInfo } = useAppInfo();
  const { companyInfo } = useCompanyInfo();
  const { enabledLinks: globalSocialLinks } = useSocialMediaLinks();

  useEffect(() => {
    fetchFooterConfig().then(setConfig);
  }, []);

  const displayName =
    companyInfo.company_name || appInfo.app_name || config.company_name;
  const displayLogo = config.logo_url || appInfo.logo_url || dynimeLogo;
  const showLogo = config.show_logo !== false;
  const showTextIcon = config.show_text_icon !== false;
  const socialLinks =
    globalSocialLinks.length > 0 ? globalSocialLinks : config.social_links;

  return (
    <footer className="relative bg-card/20 border-t border-border/20">
      {/* ── Gradient top bar ── */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* ── Subtle background glow orb ── */}
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[180px] opacity-[0.04] pointer-events-none"
        style={{ background: "hsl(var(--primary) / 0.4)" }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-8">

        {/* ═══════════════ TOP: Brand + Columns ═══════════════ */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-8 lg:gap-10">

            {/* ── Brand column (lg: 3 cols) ── */}
            <div className="col-span-2 sm:col-span-4 lg:col-span-3 flex flex-col gap-5">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 group">
                {showLogo && displayLogo ? (
                  <img
                    src={displayLogo}
                    alt={displayName}
                    className="h-8 w-auto rounded-md object-contain"
                  />
                ) : showTextIcon ? (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-extrabold font-brand text-xs">
                    {displayName.charAt(0)}
                  </div>
                ) : null}
                <span className="footer-brand">
                  {displayName}
                </span>
              </Link>

              {/* Tagline */}
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">
                {config.tagline}
              </p>

              {/* Trust badges — creative visual element */}
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  SOC 2
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  GDPR
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                  PCI DSS
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <Zap className="w-3.5 h-3.5 text-violet-500" />
                  99.9% SLA
                </div>
              </div>

              {/* Social icons */}
              {socialLinks.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  {socialLinks.map((s: any, i: number) => {
                    const href = s.url || s.href || "#";
                    const label = s.platform || s.label || `social-${i}`;
                    return (
                      <a
                        key={label}
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                        aria-label={label}
                        title={label}
                        className="h-8 w-8 rounded-full bg-muted/30 hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                      >
                        <SocialSvg icon={s.icon} />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Theme + locale */}
              <div className="flex items-center gap-2">
                <FooterThemePicker />
                <CountryCurrencySelector compact />
              </div>
            </div>

            {/* ── Link columns (lg: 9 cols) ── */}
            <div className="col-span-2 sm:col-span-4 lg:col-span-9">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-8">
                {config.columns.map((col) => (
                  <div key={col.title}>
                    <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em] mb-4">
                      {col.icon && (
                        <span className="text-primary/60">{col.icon}</span>
                      )}
                      {col.title}
                    </h4>
                    <ul className="space-y-2">
                      {col.links.map((link) => (
                        <li key={link.label}>
                          <FooterLinkItem link={link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ Bottom bar ═══════════════ */}
        <div className="border-t border-border/20 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Copyright */}
          <p className="text-[12px] text-muted-foreground/50 flex items-center gap-1">
            &copy;{new Date().getFullYear()}{" "}
            {companyInfo.registered_name || displayName}
            {" · "}Made with{" "}
            <Heart className="w-3 h-3 fill-red-400/30 text-red-400/50 inline" />
          </p>

          {/* Legal links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {config.bottom_links?.map((link) => (
              <FooterLinkItem key={link.label} link={link} />
            ))}
          </div>
        </div>

        {/* ═══════════════ Fine print ═══════════════ */}
        {(companyInfo.address || companyInfo.support_email) && (
          <div className="border-t border-border/10 py-5 text-[11px] leading-relaxed text-muted-foreground/40">
            <div className="max-w-3xl space-y-2.5">
              <p>
                {displayName} is a cloud-based business management platform
                providing CRM, HR, accounting, projects, AI-powered automation,
                and workflow tools for businesses worldwide.
              </p>
              {companyInfo.address && (
                <p className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    {companyInfo.address}{" "}
                    <Link
                      to="/terms"
                      className="underline hover:text-muted-foreground/70 transition-colors"
                    >
                      Terms & policies
                    </Link>
                  </span>
                </p>
              )}
              {companyInfo.support_email && (
                <p className="flex items-start gap-1.5">
                  <Mail className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Questions? Reach us at{" "}
                    <a
                      href={`mailto:${companyInfo.support_email}`}
                      className="underline hover:text-muted-foreground/70 transition-colors"
                    >
                      {companyInfo.support_email}
                    </a>
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
