import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Menu, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/db";
import { useAppInfo } from "@/hooks/useAppInfo";
import dynimeLogo from "@/assets/dynime-logo.png";
import { ProductsMegaMenu } from "@/components/landing/ProductsMegaMenu";
import { SolutionsDropdown } from "@/components/SolutionsDropdown";
import { ResourcesMegaMenu } from "@/components/landing/ResourcesMegaMenu";
import { MobileMegaMenu } from "@/components/MobileMegaMenu";

interface HeaderBranding {
  logo_url?: string;
  logo_text?: string;
  show_logo?: boolean;
  show_text_icon?: boolean;
}

let cachedHeaderBranding: HeaderBranding | null = null;
let fetchPromise: Promise<void> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

function fetchHeaderData(force = false): Promise<void> {
  if (fetchPromise && !force) return fetchPromise;
  if (!force && cachedHeaderBranding && Date.now() - cacheTimestamp < CACHE_TTL) return Promise.resolve();
  fetchPromise = (async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "header")
        .maybeSingle();
      if (data?.value) {
        cachedHeaderBranding = data.value as unknown as HeaderBranding;
      }
      cacheTimestamp = Date.now();
    } catch {}
  })();
  return fetchPromise;
}

export function PublicNavbar() {
  const [mobileMenu, setMobileMenu] = useState(false);
  
  const [headerBranding, setHeaderBranding] = useState<HeaderBranding>(cachedHeaderBranding || {});
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { theme, toggleTheme } = useTheme();
  const { appInfo } = useAppInfo();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (cachedHeaderBranding && Date.now() - cacheTimestamp < CACHE_TTL) {
      setHeaderBranding(cachedHeaderBranding);
      return;
    }
    fetchHeaderData(true).then(() => {
      if (cachedHeaderBranding) setHeaderBranding(cachedHeaderBranding);
    });
  }, []);

  const closeMobile = () => setMobileMenu(false);

  const logoSrc = appInfo.logo_url || headerBranding.logo_url || dynimeLogo;

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "navbar-frosted"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[64px]">
          {/* Left: Logo */}
          <Link
            to={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <img
              src={logoSrc}
              alt={appInfo.app_name}
              className="h-9 w-auto min-w-[36px] object-contain transition-transform duration-200 group-hover:scale-105"
              loading="eager"
              fetchPriority="high"
              width={36}
              height={36}
            />
            <span className="brand-text hidden sm:block">
              Dynime OS
            </span>
          </Link>

          {/* Center: Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            <ProductsMegaMenu />
            <SolutionsDropdown />
            <Link
              to="/pricing"
              className="px-3.5 py-2 rounded-lg text-[13.5px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Pricing
            </Link>
            <ResourcesMegaMenu />
          </div>

          {/* Right: Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
            </button>

            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
              >
                Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-[13.5px] font-medium text-foreground hover:bg-muted/40 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5"
                >
                  Start Free Trial
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenu ? "max-h-[calc(100vh-64px)] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="px-3 py-3 max-h-[calc(100vh-140px)] overflow-y-auto">
            <MobileMegaMenu onNavigate={closeMobile} />

            <button
              onClick={toggleTheme}
              className="mt-2 flex items-center gap-2.5 w-full px-3 py-3 rounded-xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center">
                {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </span>
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
          </div>

          <div className="border-t border-border/60 px-4 py-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                onClick={closeMobile}
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm"
              >
                Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="block w-full text-center px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMobile}
                  className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm"
                >
                  Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
