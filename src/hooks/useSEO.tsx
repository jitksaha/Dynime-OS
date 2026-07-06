// @ts-nocheck
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";

const SITE_NAME = "Dynime";

// Default titles for routes (fallback if DB has no entry)
const DEFAULT_TITLES: Record<string, string> = {
  "/": "Dynime – Simplify Growth Execution",
  "/pricing": "Pricing",
  "/login": "Login",
  "/signup": "Sign Up",
  "/contact": "Contact Us",
  "/about": "About Us",
  "/help": "Help Center",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
  "/refund": "Refund Policy",
  "/dashboard": "Dashboard",
  "/hrms/employees": "Employees",
  "/hrms/attendance": "Attendance",
  "/hrms/leave": "Leave Management",
  "/hrms/payroll": "Payroll",
  "/hrms/payroll-settings": "Payroll Settings",
  "/hrms/recruitment": "Recruitment",
  "/hrms/performance": "Performance",
  "/crm": "CRM",
  "/marketing/campaigns": "Campaigns",
  "/marketing/templates": "Email Templates",
  "/marketing/analytics": "Marketing Analytics",
  "/workflows": "Workflows",
  "/accounting/invoices": "Invoices",
  "/accounting/expenses": "Expenses",
  "/accounting/payments": "Payments",
  "/accounting/tax": "Tax Settings",
  "/accounting/tax-reports": "Tax Reports",
  "/helpdesk": "Helpdesk",
  "/projects": "Projects",
  "/documents": "Documents",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/subscription": "My Subscription",
  "/wallet": "Wallet",
  "/portal/employee": "Employee Portal",
  "/portal/customer": "Customer Portal",
  "/pos/dashboard": "Point of Sale",
  "/pos/products": "Products",
  "/pos/orders": "Orders",
  "/pos/send-courier": "Send to Courier",
  "/pos/settings": "POS Settings",
  "/pos/integrations": "Integrations",
  "/superadmin/dashboard": "Admin Dashboard",
  "/superadmin/seo": "SEO Management",
  "/admin-dashboard": "Company Dashboard",
  "/company-settings": "Company Settings",
  "/departments": "Departments",
  "/company-employees": "Employees",
  "/roles": "Roles",
};

interface SEOData {
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  meta_image: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  canonical_url: string | null;
  robots: string | null;
}

// Simple in-memory cache
const seoCache: Record<string, SEOData> = {};

function setMetaTag(name: string, content: string | null, property = false) {
  if (!content) return;
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string | null) {
  let el = document.querySelector('link[rel="canonical"]');
  if (url) {
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", url);
  } else if (el) {
    el.remove();
  }
}

export function useSEO() {
  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    const applyDefaults = () => {
      const defaultTitle = DEFAULT_TITLES[path];
      if (path === "/") {
        document.title = defaultTitle || SITE_NAME;
      } else {
        document.title = defaultTitle ? `${defaultTitle} – ${SITE_NAME}` : SITE_NAME;
      }
    };

    const applySEO = (seo: SEOData) => {
      const title = seo.meta_title || DEFAULT_TITLES[path] || "Page";
      document.title = path === "/" ? title : `${title} – ${SITE_NAME}`;

      setMetaTag("description", seo.meta_description);
      setMetaTag("keywords", seo.meta_keywords);
      setMetaTag("robots", seo.robots);
      setMetaTag("og:title", seo.og_title || title, true);
      setMetaTag("og:description", seo.og_description || seo.meta_description, true);
      setMetaTag("og:image", seo.og_image || seo.meta_image, true);
      setMetaTag("twitter:title", seo.twitter_title || title);
      setMetaTag("twitter:description", seo.twitter_description || seo.meta_description);
      setMetaTag("twitter:image", seo.twitter_image || seo.meta_image);
      setCanonical(seo.canonical_url);
    };

    // Check cache first
    if (seoCache[path]) {
      applySEO(seoCache[path]);
      return;
    }

    // Set default immediately
    applyDefaults();

    // Fetch from DB
    supabase
      .from("page_seo")
      .select("meta_title, meta_description, meta_keywords, meta_image, og_title, og_description, og_image, twitter_title, twitter_description, twitter_image, canonical_url, robots")
      .eq("route_path", path)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          seoCache[path] = data;
          applySEO(data);
        }
      });
  }, [path]);
}
