// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { FavoritesSidebarWidget } from "@/components/FavoritesSidebarWidget";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Target, Megaphone, GitBranch, Receipt,
  Headphones, FolderKanban, FileText, BarChart3, Settings,
  ChevronLeft, ChevronRight, Building2, ChevronDown,
  Clock, CalendarDays, DollarSign, Briefcase, Star,
  UserCircle, X, CreditCard, Wallet, Mail, BarChart2,
  Layers, Crown, Globe, User, GripVertical, Shield, Percent,
  ShoppingCart, Gift, BadgeCheck,
  GraduationCap, AlertTriangle, UserCheck, RefreshCw, PiggyBank, TrendingUp, MessageSquare,
  KeyRound, Ticket, Code, Smartphone, Bot, CalendarCheck, PenTool, BookOpen,
  MapPin, ClipboardCheck, Banknote, Landmark, LineChart, Share2, MessageSquareHeart, Monitor,
  UserCog, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DynimeAIIcon } from "@/components/icons/DynimeAIIcon";
import { DynimePayIcon } from "@/components/icons/DynimePayIcon";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { useSidebarOrder } from "@/hooks/useSidebarOrder";
import { useMenuConfig, mergeMenuItems } from "@/hooks/useMenuConfig";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { usePayBrand } from "@/hooks/usePayBrand";
import { registerSidebarTree } from "@/lib/search-index";

interface NavChildItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  moduleKey?: string;
  children?: NavChildItem[];
}

const buildNavItems = (payBrand: string, isCompanyAdmin: boolean): NavItem[] => {
  const adminOnly = (items: NavChildItem[]) => (isCompanyAdmin ? items : []);

  return [
    {
      id: "dashboard",
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "hrm",
      label: "HRM",
      path: "/hrm",
      icon: Users,
      moduleKey: "hrms",
      children: [
        { label: "Employees", path: "/hrm/employees", icon: UserCircle },
        { label: "Shifts", path: "/hrm/shifts", icon: Clock },
        { label: "Shift Planner", path: "/shift-planner", icon: CalendarDays },
        { label: "Attendance", path: "/hrm/attendance", icon: Clock },
        { label: "Leave", path: "/hrm/leave", icon: CalendarDays },
        { label: "Late Tracking", path: "/hrm/late", icon: Clock },
        { label: "Payroll", path: "/hrm/payroll", icon: DollarSign },
        { label: "Salary Sheet", path: "/hrm/salary-sheet", icon: DollarSign },
        { label: "Salary Scaleup", path: "/hrm/salary-scaleup", icon: Star },
        { label: "Loans", path: "/hrm/loans", icon: CreditCard },
        { label: "Training", path: "/hrm/training", icon: GraduationCap },
        { label: "Warnings", path: "/hrm/warnings", icon: AlertTriangle },
        { label: "Probation", path: "/hrm/probation", icon: UserCheck },
        { label: "Recruitment", path: "/hrm/recruitment", icon: Briefcase },
        { label: "Performance", path: "/hrm/performance", icon: Star },
        { label: "Remote Tracking", path: "/remote-tracking", icon: Monitor },
        ...adminOnly([
          { label: "Departments", path: "/departments", icon: Layers },
          { label: "Company Employees", path: "/company-employees", icon: Users },
          { label: "Staff Management", path: "/staff-management", icon: UserCog },
        ]),
      ],
    },
    {
      id: "crm",
      label: "CRM",
      path: "/crm",
      icon: Target,
      moduleKey: "crm",
      children: [
        { label: "Pipeline", path: "/crm", icon: Target },
        { label: "Forecasting", path: "/crm/forecasting", icon: TrendingUp },
        { label: "Deal Timeline", path: "/crm/timeline", icon: MessageSquare },
        { label: "Client Portal", path: "/client-portal", icon: Globe },
        { label: "Feedback & NPS", path: "/feedback-nps", icon: MessageSquareHeart },
        { label: "Referral Program", path: "/referral-program", icon: Share2 },
        { label: "Bookings", path: "/bookings", icon: CalendarCheck },
      ],
    },
    {
      id: "dynime-ai",
      label: "Dynime AI",
      path: "/dynime-ai",
      icon: DynimeAIIcon,
      children: [
        { label: "AI Chat", path: "/dynime-ai", icon: Bot },
        { label: "Prompt Library", path: "/dynime-ai/prompts", icon: FileText },
        { label: "AI Usage", path: "/dynime-ai/usage", icon: BarChart3 },
        ...adminOnly([
          { label: "Social Inbox", path: "/social-inbox", icon: MessageSquare },
          { label: "Social Channels", path: "/social-channels", icon: Layers },
          { label: "Agent Settings", path: "/agent-settings", icon: Bot },
          { label: "Agent Knowledge Base", path: "/agent-knowledge-base", icon: BookOpen },
          { label: "Escalation Manager", path: "/escalation-manager", icon: Shield },
          { label: "Social Analytics", path: "/social-analytics", icon: BarChart3 },
          { label: "AI Automation", path: "/ai-automation", icon: Bot },
          { label: "Churn Detection", path: "/ai-churn", icon: TrendingUp },
          { label: "Doc Generator", path: "/ai-documents", icon: FileText },
          { label: "Threat Detection", path: "/ai-threats", icon: Shield },
          { label: "NLP Workflows", path: "/ai-workflows", icon: GitBranch },
        ]),
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      path: "/marketing",
      icon: Megaphone,
      moduleKey: "marketing",
      children: [
        { label: "Campaigns", path: "/marketing/campaigns", icon: Layers },
        { label: "Templates", path: "/marketing/templates", icon: Mail },
        { label: "Analytics", path: "/marketing/analytics", icon: BarChart2 },
        { label: "Referrals", path: "/referrals", icon: Gift },
        { label: "Loyalty & Rewards", path: "/loyalty", icon: Gift },
        ...adminOnly([
          { label: "Coupons", path: "/coupons", icon: Ticket },
          { label: "Referral Settings", path: "/referral-settings", icon: Gift },
          { label: "Branding", path: "/branding", icon: Layers },
        ]),
      ],
    },
    {
      id: "workflows",
      label: "Workflows",
      path: "/workflows",
      icon: GitBranch,
      moduleKey: "workflows",
      children: [
        { label: "All Workflows", path: "/workflows", icon: GitBranch },
        ...adminOnly([{ label: "Approval Workflows", path: "/approvals", icon: GitBranch }]),
      ],
    },
    {
      id: "accounting",
      label: "Accounting",
      path: "/accounting",
      icon: Receipt,
      moduleKey: "accounting",
      children: [
        { label: "Invoices", path: "/accounting/invoices", icon: FileText },
        { label: "Recurring", path: "/accounting/recurring", icon: RefreshCw },
        { label: "Expenses", path: "/accounting/expenses", icon: Wallet },
        { label: "Payments", path: "/accounting/payments", icon: CreditCard },
        { label: "P&L", path: "/accounting/profit-loss", icon: TrendingUp },
        { label: "Budgets", path: "/accounting/budgets", icon: PiggyBank },
        { label: "Tax & VAT", path: "/accounting/tax", icon: Percent },
        { label: "Tax Reports", path: "/accounting/tax-reports", icon: BarChart3 },
        { label: "Tax Compliance", path: "/tax/dashboard", icon: Percent },
        { label: "Expense Claims", path: "/expense-claims", icon: Receipt },
        { label: "Revenue Recognition", path: "/revenue-recognition", icon: BookOpen },
        { label: "Treasury", path: "/treasury", icon: Landmark },
        { label: "Collections", path: "/collections", icon: Banknote },
        { label: "Point of Sale", path: "/pos/dashboard", icon: ShoppingCart },
      ],
    },
    {
      id: "helpdesk",
      label: "Helpdesk",
      path: "/helpdesk",
      icon: Headphones,
      moduleKey: "helpdesk",
      children: [
        { label: "Tickets", path: "/helpdesk", icon: Headphones },
        { label: "SLA Manager", path: "/sla-manager", icon: Shield },
        { label: "Knowledge Base", path: "/knowledge-base", icon: BookOpen },
        { label: "Field Service", path: "/field-service", icon: MapPin },
        ...adminOnly([
          { label: "Communication", path: "/communication", icon: MessageSquare },
          { label: "Live Chat", path: "/live-chat", icon: Headphones },
          { label: "SMS Dashboard", path: "/sms", icon: Smartphone },
          { label: "WhatsApp", path: "/whatsapp", icon: MessageCircle },
          { label: "Notifications", path: "/notification-settings", icon: Megaphone },
        ]),
      ],
    },
    {
      id: "projects",
      label: "Projects",
      path: "/projects",
      icon: FolderKanban,
      moduleKey: "projects",
      children: [
        { label: "All Projects", path: "/projects", icon: FolderKanban },
        { label: "Resource Planner", path: "/resource-planner", icon: Users },
        { label: "Quality Control", path: "/quality-control", icon: ClipboardCheck },
      ],
    },
    {
      id: "documents",
      label: "Documents",
      path: "/documents",
      icon: FileText,
      moduleKey: "documents",
      children: [
        { label: "All Documents", path: "/documents", icon: FileText },
        { label: "Doc Automation", path: "/doc-automation", icon: FileText },
        { label: "E-Signatures", path: "/e-signatures", icon: PenTool },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      path: "/reports",
      icon: BarChart3,
      moduleKey: "reports",
      children: [
        { label: "All Reports", path: "/reports", icon: BarChart3 },
        { label: "Sub Analytics", path: "/sub-analytics", icon: TrendingUp },
        { label: "Forecasting", path: "/financial-forecasting", icon: LineChart },
        ...adminOnly([
          { label: "Scheduled Reports", path: "/scheduled-reports", icon: BarChart3 },
          { label: "Advanced Analytics", path: "/advanced-analytics", icon: BarChart3 },
        ]),
      ],
    },
    {
      id: "portals",
      label: "Portals",
      path: "/portal",
      icon: Globe,
      children: [
        { label: "Customer Portal", path: "/portal/customer", icon: User },
        { label: "Employee Portal", path: "/portal/employee", icon: UserCircle },
      ],
    },
    {
      id: "dynime",
      label: `${payBrand}`,
      path: "/wallet",
      icon: DynimePayIcon,
      children: [
        { label: `${payBrand} Wallet`, path: "/wallet", icon: Wallet },
        { label: "Saved Methods", path: "/payment-methods", icon: CreditCard },
        { label: "Auto Payments", path: "/auto-payments", icon: RefreshCw },
        ...adminOnly([{ label: `${payBrand} Settings`, path: "/wallet/settings", icon: CreditCard }]),
      ],
    },
    { id: "subscription", label: "Subscription", path: "/subscription", icon: Crown },
    {
      id: "settings",
      label: "Settings",
      path: "/settings",
      icon: Settings,
      children: [
        { label: "General Settings", path: "/settings", icon: Settings },
        ...adminOnly([
          { label: "Admin Dashboard", path: "/admin-dashboard", icon: LayoutDashboard },
          { label: "Company Settings", path: "/company-settings", icon: Building2 },
          { label: "Roles & Permissions", path: "/roles", icon: Shield },
          { label: "Invite Codes", path: "/invite-codes", icon: KeyRound },
          { label: "API Keys", path: "/api-keys", icon: Code },
          { label: "Webhooks", path: "/webhooks", icon: GitBranch },
          { label: "Integrations", path: "/integrations", icon: GitBranch },
          { label: "App Marketplace", path: "/app-marketplace", icon: Layers },
          { label: "Zapier Automation", path: "/zapier", icon: GitBranch },
          { label: "Business Verification", path: "/kyb", icon: BadgeCheck },
        ]),
      ],
    },
  ];
};

const DEFAULT_ORDER = buildNavItems("Pay", true).map((i) => i.id);

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const showFull = !collapsed || hovered;
  const location = useLocation();
  const { hasAccess } = useModuleAccess();
  const { isCompanyAdmin } = useUserRole();
  const { configs } = useMenuConfig();
  const { payBrand } = usePayBrand();
  const allNavItems = useMemo(() => buildNavItems(payBrand, isCompanyAdmin), [payBrand, isCompanyAdmin]);
  const { order, saveOrder } = useSidebarOrder("main", DEFAULT_ORDER);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const orderedNavItems = useMemo(() => {
    const menuConfig = configs["main_app"];
    const mergedItems = mergeMenuItems(allNavItems, menuConfig);
    return order
      .map((id) => mergedItems.find((i) => i.id === id))
      .filter((i): i is NavItem & { visible: boolean } => {
        if (!i) return false;
        if (!i.visible) return false;
        if (i.moduleKey && !hasAccess(i.moduleKey)) return false;
        return true;
      });
  }, [configs, order, hasAccess, allNavItems]);

  useEffect(() => {
    const activeParents = orderedNavItems
      .filter((item) => item.children?.some((child) => isActive(child.path)))
      .map((item) => item.label);

    if (activeParents.length === 0) return;

    setExpandedItems((prev) => Array.from(new Set([...prev, ...activeParents])));
  }, [location.pathname, orderedNavItems]);

  // Auto-register sidebar items into the global search index.
  // New nav items added to buildNavItems become searchable automatically.
  useEffect(() => {
    const flat: Array<{ label: string; path: string; group: string; icon: any }> = [];
    for (const item of allNavItems) {
      flat.push({ label: item.label, path: item.path, group: item.label, icon: item.icon });
      if (item.children) {
        for (const child of item.children) {
          flat.push({ label: child.label, path: child.path, group: item.label, icon: child.icon });
        }
      }
    }
    registerSidebarTree(flat);
  }, [allNavItems]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) onClose();
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const ids = orderedNavItems.map((i) => i.id);
    const [moved] = ids.splice(result.source.index, 1);
    ids.splice(result.destination.index, 0, moved);
    const fullOrder = [...ids, ...order.filter((id) => !ids.includes(id))];
    saveOrder(fullOrder);
  };

  const sidebarContent = (
    <>
      <div className="relative">
        <CompanySwitcher collapsed={!showFull} />
        <button
          onClick={onClose}
          className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <FavoritesSidebarWidget collapsed={!showFull} />

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="main-sidebar">
          {(provided) => (
            <nav
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
            >
              {orderedNavItems.map((item, index) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedItems.includes(item.label);
                const active = isActive(item.path) || item.children?.some((child) => isActive(child.path));

                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(snapshot.isDragging && "opacity-80")}
                      >
                        {hasChildren ? (
                          <>
                            <div className="flex items-center">
                              {showFull && (
                                <div {...provided.dragHandleProps} className="p-0.5 text-sidebar-foreground/30 hover:text-sidebar-foreground/60 cursor-grab">
                                  <GripVertical className="h-3 w-3" />
                                </div>
                              )}
                              <button
                                onClick={() => toggleExpand(item.label)}
                                className={cn(
                                  "flex items-center flex-1 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                                  active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-primary/8 hover:text-primary"
                                )}
                              >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {showFull && (
                                  <>
                                    <span className="ml-2.5 flex-1 text-left truncate">{item.label}</span>
                                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                                  </>
                                )}
                              </button>
                            </div>
                            {showFull && isExpanded && (
                              <div className="ml-6 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                                {item.children!.map((child) => (
                                  <NavLink
                                    key={child.path}
                                    to={child.path}
                                    onClick={handleNavClick}
                                    className={({ isActive: linkActive }) =>
                                      cn(
                                        "flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                                        linkActive || isActive(child.path)
                                          ? "bg-primary/15 text-primary"
                                          : "text-sidebar-foreground/60 hover:bg-primary/8 hover:text-primary"
                                      )
                                    }
                                  >
                                    <child.icon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="ml-2 truncate">{child.label}</span>
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center">
                            {showFull && (
                              <div {...provided.dragHandleProps} className="p-0.5 text-sidebar-foreground/30 hover:text-sidebar-foreground/60 cursor-grab">
                                <GripVertical className="h-3 w-3" />
                              </div>
                            )}
                            <NavLink
                              to={item.path}
                              onClick={handleNavClick}
                              className={({ isActive: linkActive }) =>
                                cn(
                                  "flex items-center flex-1 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                                  linkActive ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-primary/8 hover:text-primary"
                                )
                              }
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {showFull && <span className="ml-2.5 truncate">{item.label}</span>}
                            </NavLink>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </nav>
          )}
        </Droppable>
      </DragDropContext>

      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <div className="hidden md:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full rounded-md py-2 text-sidebar-foreground/50 hover:bg-primary/8 hover:text-primary transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}
      <aside
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 md:transition-[width] md:duration-300",
          "md:sticky md:top-0 md:h-screen md:z-30",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed && !hovered ? "w-16 md:w-16" : "w-60 md:w-60"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
