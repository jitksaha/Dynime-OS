// @ts-nocheck
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNavigate, useLocation } from "react-router-dom";
import { KeepAliveOutlet } from "@/components/KeepAliveOutlet";
import { AppSidebar } from "./AppSidebar";
import { CreditCard, LogOut, Menu, Moon, Search, Sun, UserCircle, Settings, User, Wallet, BadgeCheck, Monitor } from "lucide-react";
import { usePayBrand } from "@/hooks/usePayBrand";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import GlobalSearch from "@/components/GlobalSearch";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { HeaderThemeDropdown } from "@/components/HeaderThemeDropdown";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { useLanguage } from "@/hooks/useLanguage";

// Lazy-load non-critical layout components
const MobileBottomNav = lazy(() => import("@/components/MobileBottomNav").then(m => ({ default: m.MobileBottomNav })));
const CopilotCommandBar = lazy(() => import("@/components/copilot/CopilotCommandBar").then(m => ({ default: m.CopilotCommandBar })));
import { KeyboardShortcutsOverlay } from "@/components/KeyboardShortcutsOverlay";
import { IdleTimeoutWarning } from "@/components/IdleTimeoutWarning";

import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { SubscriptionExpiredDialog } from "@/components/SubscriptionExpiredDialog";
import { useKybStatus } from "@/hooks/useKybStatus";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const accountRef = useRef<HTMLDivElement>(null);
  const { balance: walletBalance } = useWalletBalance();
  const { symbol: currencySymbol } = useTenantCurrency();
  const { hasAccess } = useModuleAccess();
  const { isExpired, hasPermanentModules, daysRemaining } = useSubscriptionGate();
  const walletModuleActive = hasAccess("wallet");
  const { isVerified } = useKybStatus();
  const { payBrand } = usePayBrand();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <ErrorBoundary moduleName="Sidebar">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </ErrorBoundary>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:bg-primary/8 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(event);
              }}
              className="sm:hidden p-2 rounded-md text-muted-foreground hover:bg-primary/8 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
            <LanguageSwitcher />
            <BranchSwitcher />
            <HeaderThemeDropdown />
            <button
              onClick={(e) => toggleTheme(e)}
              className="p-2 rounded-md text-muted-foreground hover:bg-primary/8 transition-colors"
              title="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <NotificationDropdown />

            {/* Remote Tracking Quick Access */}
            {hasAccess("remote_tracking") && (
              <button
                onClick={() => navigate("/remote-tracking")}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 transition-colors cursor-pointer"
                title="Remote Work Tracker"
              >
                <Monitor className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Tracker</span>
              </button>
            )}

            {/* Wallet Balance */}
            {walletModuleActive && walletBalance !== null && (
              <button
                onClick={() => navigate("/wallet")}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">{currencySymbol}{walletBalance.toLocaleString()}</span>
              </button>
            )}

            {/* Account dropdown */}
            <div ref={accountRef} className="relative">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                onMouseEnter={() => setAccountMenuOpen(true)}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-primary/8 transition-colors cursor-pointer"
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                {profile?.full_name && (
                  <span className="text-sm font-medium text-foreground hidden sm:flex items-center gap-1 max-w-[140px]">
                    <span className="truncate">{profile.full_name}</span>
                    {isVerified && <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
                  </span>
                )}
              </button>

              {accountMenuOpen && (
                <div
                  onMouseLeave={() => setAccountMenuOpen(false)}
                  className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card shadow-lg py-1.5 z-50 animate-fade-in"
                >
                  <div className="px-4 py-2.5 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("manage_account")}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setAccountMenuOpen(false); navigate("/settings", { state: { section: "profile" } }); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-primary/8 transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      {t("my_profile")}
                    </button>
                    <button
                      onClick={() => { setAccountMenuOpen(false); navigate("/settings"); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-primary/8 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      {t("account_settings")}
                    </button>
                    <button
                      onClick={() => { setAccountMenuOpen(false); navigate("/subscription"); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-primary/8 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {t("my_subscription")}
                    </button>
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      onClick={() => { setAccountMenuOpen(false); handleSignOut(); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/8 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("sign_out")}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
          <ErrorBoundary moduleName="Page">
            <KeepAliveOutlet />
          </ErrorBoundary>
        </main>
      </div>
      <Suspense fallback={null}>
        <MobileBottomNav />
        <CopilotCommandBar />
      </Suspense>
      <KeyboardShortcutsOverlay />
      <IdleTimeoutWarning />
      {isExpired && location.pathname !== "/subscription" && (
        <SubscriptionExpiredDialog
          hasPermanentModules={hasPermanentModules}
          daysRemaining={daysRemaining}
        />
      )}
    </div>
  );
}
