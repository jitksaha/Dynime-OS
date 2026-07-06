import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { KeepAliveOutlet } from "@/components/KeepAliveOutlet";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useMenuConfig, mergeMenuItems } from "@/hooks/useMenuConfig";
import {
  LogOut, Moon, Sun, Menu, X, LayoutDashboard, Briefcase, UsersRound, UserCircle2,
  CalendarDays, FileText, Wallet, ChevronLeft, ChevronRight, Megaphone, PartyPopper,
  ShieldCheck, Receipt, Boxes, GraduationCap, ClipboardList, Sparkles, Truck,
  MonitorSmartphone, BookOpen, FileBadge, Mail, Phone, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppInfo } from "@/hooks/useAppInfo";
import { PortalCurrencySelector } from "@/components/PortalCurrencySelector";

interface PortalLayoutProps {
  type: "employee" | "customer";
}

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const employeeNav: SidebarItem[] = [
  { label: "Dashboard", path: "/portal/employee", icon: LayoutDashboard },
  { label: "My Profile", path: "/portal/employee/profile", icon: UserCircle2 },
  { label: "My Payslips", path: "/portal/employee/payslips", icon: Receipt },
  { label: "Expense Claims", path: "/portal/employee/expenses", icon: FileBadge },
  { label: "My Assets", path: "/portal/employee/assets", icon: Boxes },
  { label: "Training", path: "/portal/employee/training", icon: GraduationCap },
  { label: "Surveys", path: "/portal/employee/surveys", icon: ClipboardList },
  { label: "Team Directory", path: "/portal/employee/team", icon: UsersRound },
  { label: "Holidays", path: "/portal/employee/holidays", icon: PartyPopper },
  { label: "Doc Requests", path: "/portal/employee/documents", icon: FileText },
  { label: "Announcements", path: "/portal/employee/announcements", icon: Megaphone },
  { label: "Verifications", path: "/portal/employee/verifications", icon: ShieldCheck },
  { label: "My Tracker", path: "/remote-tracking/employee", icon: MonitorSmartphone },
];

const customerNav: SidebarItem[] = [
  { label: "Dashboard", path: "/portal/customer", icon: LayoutDashboard },
  { label: "My Wallet", path: "/portal/customer/wallet", icon: Wallet },
  { label: "Invoices", path: "/portal/customer/invoices", icon: Receipt },
  { label: "Order Tracking", path: "/portal/customer/orders", icon: Truck },
  { label: "Knowledge Base", path: "/portal/customer/knowledge-base", icon: BookOpen },
  { label: "Loyalty & Rewards", path: "/portal/customer/loyalty", icon: Sparkles },
];

export function PortalLayout({ type }: PortalLayoutProps) {
  const { appInfo } = useAppInfo();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { contact } = useContactInfo();
  const { configs } = useMenuConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const portalColor = type === "employee" ? "text-primary" : "text-info";
  const portalBg = type === "employee" ? "bg-primary/10" : "bg-info/10";
  const portalAccent = type === "employee" ? "bg-primary" : "bg-info";
  const portalLabel = type === "employee" ? "Employee Portal" : "Customer Portal";
  const PortalIcon = type === "employee" ? Briefcase : UsersRound;

  const configKey = type === "employee" ? "employee_portal" : "customer_portal";
  const defaultNav = type === "employee" ? employeeNav : customerNav;
  const menuConfig = configs[configKey];
  const mergedNav = mergeMenuItems(
    defaultNav.map((item, i) => ({ ...item, id: item.path })),
    menuConfig
  );
  const navItems = mergedNav.filter((item) => item.visible);

  const handleNavClick = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-transform duration-300 md:transition-[width] md:duration-300",
          "w-60 md:sticky md:top-0 md:h-screen md:z-30",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <div className="flex items-center min-w-0">
            <img src="/brand/dynime-icon.png" alt={appInfo.app_name} className="h-8 w-8 rounded-lg shrink-0 object-contain" />
            {!collapsed && (
              <div className="ml-2.5 min-w-0">
                <span className="text-sm font-extrabold font-brand text-foreground block leading-tight truncate">
                  {appInfo.app_name}
                </span>
                <span className={`text-[10px] font-medium ${portalColor} uppercase`}>
                  {portalLabel}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-md text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 min-h-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? `${portalBg} ${portalColor}`
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="ml-2.5 truncate">{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Back to main app — only for customer portal */}
          {type === "customer" && (
            <div className="pt-3 mt-3 border-t border-border">
              <NavLink
                to="/dashboard"
                onClick={handleNavClick}
                className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="ml-2.5 truncate">Main Dashboard</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* Contact Info */}
        {!collapsed && (
          <div className="border-t border-border p-4 space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Need Help?</p>
            {contact.email && (
              <a href={`mailto:${contact.support_email || contact.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{contact.support_email || contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{contact.phone}</span>
              </a>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <div className="hidden md:block border-t border-border p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full rounded-md py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold text-foreground hidden sm:block">{portalLabel}</h2>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <PortalCurrencySelector />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className={`h-7 w-7 rounded-full ${portalBg} flex items-center justify-center`}>
                <UserCircle2 className={`h-5 w-5 ${portalColor}`} />
              </div>
              {profile?.full_name && (
                <span className="text-sm font-medium text-foreground hidden sm:block max-w-[140px] truncate">
                  {profile.full_name}
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto w-full">
          <KeepAliveOutlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-3 px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {appInfo.app_name} · {portalLabel}
          </p>
        </footer>
      </div>
    </div>
  );
}
