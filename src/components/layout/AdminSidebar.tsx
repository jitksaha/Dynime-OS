import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MessagesSquare, MessageCircle, MessageCircleMore,
  Building2, UsersRound, CreditCard, ShieldCheck, Boxes, FileText,
  Activity, SlidersHorizontal, ChevronLeft, ChevronRight, X, Globe2,
  Layers, KeyRound, Headphones, ToggleRight,
  ArrowLeftRight, PanelTop, PanelBottom, Menu as MenuIcon,
  FilePlus2, Smartphone, ChevronDown,
  Wallet, BadgePercent, UserCheck, FileSearch, Gauge, Percent,
  ServerCog, Wrench, GripVertical, Sparkles, Palette,
  ShoppingCart, Server, BarChart3, CircleDollarSign, Receipt,
  Bot, Inbox, BookOpen, AlertTriangle, MailOpen,
  Image as ImageIcon, Network, Cloud, ScrollText, Workflow,
  Briefcase, Lock, Fingerprint, CloudCog, AppWindow, Replace,
  Sliders, Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useSidebarOrder } from "@/hooks/useSidebarOrder";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: "sa-overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", path: "/superadmin/dashboard", icon: LayoutDashboard },
      { label: "System Status", path: "/superadmin/system", icon: ServerCog },
      { label: "Audit Logs", path: "/superadmin/audit-logs", icon: ScrollText },
    ],
  },
  {
    id: "sa-tenants",
    label: "Tenant Management",
    icon: Building2,
    items: [
      { label: "Tenants / Companies", path: "/superadmin/tenants", icon: Building2 },
      { label: "Portal Governance", path: "/superadmin/portal-governance", icon: Network },
      { label: "Departments", path: "/superadmin/departments", icon: Briefcase },
    ],
  },
  {
    id: "sa-users",
    label: "Users & Staff",
    icon: UsersRound,
    items: [
      { label: "Global Users", path: "/superadmin/users", icon: UsersRound },
      { label: "Staff Management", path: "/superadmin/staff-management", icon: Briefcase },
      { label: "Invite Users", path: "/superadmin/invite", icon: MailOpen },
      { label: "Role Management", path: "/superadmin/roles", icon: ShieldCheck },
      { label: "KYC Management", path: "/superadmin/kyc-management", icon: UserCheck },
      { label: "KYB Management", path: "/superadmin/kyb-management", icon: Building },
      { label: "Approval Workflows", path: "/superadmin/approvals", icon: Workflow },
    ],
  },
  {
    id: "sa-billing",
    label: "Billing & Payments",
    icon: CircleDollarSign,
    items: [
      { label: "Subscriptions", path: "/superadmin/subscriptions", icon: Receipt },
      { label: "Subscription Plans", path: "/superadmin/plans", icon: CreditCard },
      { label: "Free Plan Limits", path: "/superadmin/free-plan-limits", icon: ShieldCheck },
      { label: "Addon Pricing", path: "/superadmin/addon-pricing", icon: Boxes },
      { label: "Billing & Invoices", path: "/superadmin/billing", icon: FileText },
      { label: "Payment Gateway", path: "/superadmin/payment-gateway", icon: Globe2 },
      { label: "Platform Coupons", path: "/superadmin/coupons", icon: BadgePercent },
      { label: "Pay Fees", path: "/superadmin/wallet-fees", icon: Wallet },
      { label: "Payout Approvals", path: "/superadmin/payout-approvals", icon: CircleDollarSign },
      { label: "Tax Configuration", path: "/superadmin/tax-config", icon: Percent },
      { label: "Country Payment Flow", path: "/superadmin/country-payment-flow", icon: ArrowLeftRight },
      { label: "Cart Abandonment", path: "/superadmin/cart-abandonment", icon: ShoppingCart },
      { label: "Gateway Health", path: "/superadmin/gateway-health", icon: Activity },
    ],
  },
  {
    id: "sa-platform",
    label: "Platform Config",
    icon: SlidersHorizontal,
    items: [
      { label: "Dynamic Modules", path: "/superadmin/dynamic-modules", icon: Layers },
      { label: "Module Access", path: "/superadmin/modules", icon: Boxes },
      { label: "Feature Toggles", path: "/superadmin/features", icon: ToggleRight },
      { label: "AI Configuration", path: "/superadmin/ai-config", icon: Sparkles },
      { label: "Countries & Currency", path: "/superadmin/countries", icon: Globe2 },
      { label: "Industry Solutions", path: "/superadmin/solutions", icon: Layers },
      { label: "Features.", path: "/superadmin/features-menu", icon: Sliders },
      { label: "Partner Management", path: "/superadmin/partners", icon: UsersRound },
    ],
  },
  {
    id: "sa-content",
    label: "Content & CMS",
    icon: FilePlus2,
    items: [
      { label: "Blog Management", path: "/superadmin/blog", icon: FileText },
      { label: "Page Management", path: "/superadmin/pages", icon: FilePlus2 },
      { label: "Media Library", path: "/superadmin/media-library", icon: ImageIcon },
      { label: "Header Builder", path: "/superadmin/header-editor", icon: PanelTop },
      { label: "Footer Builder", path: "/superadmin/footer-editor", icon: PanelBottom },
      { label: "Social Media Links", path: "/superadmin/social-media", icon: Globe2 },
      { label: "Menu Editor", path: "/superadmin/menu-editor", icon: MenuIcon },
      { label: "Sidebar Menu Manager", path: "/superadmin/sidebar-menu-manager", icon: Layers },
      { label: "Contact Info", path: "/superadmin/contact-info", icon: Headphones },
      { label: "SEO Management", path: "/superadmin/seo", icon: FileSearch },
      { label: "Page Speed", path: "/superadmin/page-speed", icon: Gauge },
    ],
  },
  {
    id: "sa-ai-agent",
    label: "AI Social Agent",
    icon: Sparkles,
    items: [
      { label: "Social Inbox", path: "/superadmin/social-inbox", icon: Inbox },
      { label: "Knowledge Base", path: "/superadmin/knowledge-base", icon: BookOpen },
      { label: "Agent Settings", path: "/superadmin/agent-settings", icon: Bot },
      { label: "Escalation Manager", path: "/superadmin/escalation-manager", icon: AlertTriangle },
      { label: "Social Analytics", path: "/superadmin/social-analytics", icon: BarChart3 },
    ],
  },
  {
    id: "sa-comms",
    label: "Communication",
    icon: MessagesSquare,
    items: [
      { label: "Live Chat Management", path: "/superadmin/live-chat", icon: MessageCircle },
      { label: "Email Template Builder", path: "/superadmin/email-templates", icon: MailOpen },
      { label: "Communication Hub", path: "/superadmin/communication", icon: MessagesSquare },
      { label: "SMS Gateways", path: "/superadmin/sms-gateways", icon: Smartphone },
      { label: "SMS Pricing", path: "/superadmin/sms-pricing", icon: CreditCard },
      { label: "SMS Templates", path: "/superadmin/sms-templates", icon: MessageCircleMore },
      { label: "WhatsApp Gateways", path: "/superadmin/whatsapp-gateways", icon: MessageCircle },
      { label: "WhatsApp Templates", path: "/superadmin/whatsapp-templates", icon: MessageCircleMore },
      { label: "Contact Submissions", path: "/superadmin/contact", icon: Headphones },
    ],
  },
  {
    id: "sa-security",
    label: "Security",
    icon: ShieldCheck,
    items: [
      { label: "Security Settings", path: "/superadmin/security", icon: Lock },
      { label: "Security & Compliance", path: "/superadmin/security-suite", icon: ShieldCheck },
      { label: "Social Sign-In", path: "/superadmin/social-signin", icon: KeyRound },
      { label: "Verification Settings", path: "/superadmin/verification-settings", icon: Fingerprint },

    ],
  },
  {
    id: "sa-tools",
    label: "Tools",
    icon: Wrench,
    items: [
      { label: "Cloud Console", path: "/superadmin/cloud-console", icon: Cloud },
      { label: "Self-Hosting Guide", path: "/superadmin/self-hosting", icon: Server },
      { label: "Search & Replace", path: "/superadmin/search-replace", icon: Replace },
      { label: "Mobile App Builder", path: "/superadmin/mobile-app", icon: AppWindow },
      { label: "CDN Configuration", path: "/superadmin/cdn-config", icon: CloudCog },
    ],
  },
  {
    id: "sa-settings",
    label: "Settings",
    icon: SlidersHorizontal,
    items: [
      { label: "Platform Name Setting", path: "/superadmin/app-info", icon: Globe2 },
      { label: "Company Information", path: "/superadmin/company-info", icon: Building2 },
      { label: "SMTP Settings", path: "/superadmin/settings", icon: SlidersHorizontal },
      { label: "Theme Management", path: "/superadmin/theme-management", icon: Palette },
    ],
  },
];

const DEFAULT_ORDER = navGroups.map((g) => g.id);

function SingleItemGroup({ item, collapsed, dragHandleProps, onNavClick }: {
  item: NavItem; collapsed: boolean; dragHandleProps: any; onNavClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <div className="flex items-center">
      <div
        {...dragHandleProps}
        className={cn(
          "shrink-0 p-1 rounded text-sidebar-foreground/25 hover:text-sidebar-foreground/60 cursor-grab active:cursor-grabbing",
          collapsed && "hidden"
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <NavLink
        to={item.path}
        onClick={onNavClick}
        className={({ isActive: linkActive }) =>
          cn(
            "flex items-center flex-1 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
            linkActive
              ? "bg-destructive/10 text-destructive"
              : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="ml-2.5 truncate">{item.label}</span>}
      </NavLink>
    </div>
  );
}

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { appInfo } = useAppInfo();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const { order, saveOrder } = useSidebarOrder("superadmin", DEFAULT_ORDER);

  const orderedGroups = order
    .map((id) => navGroups.find((g) => g.id === id))
    .filter((g): g is NavGroup => !!g);

  // Auto-expand groups containing active route
  const activeGroupId = orderedGroups.find(g => g.items.some(i => currentPath.startsWith(i.path)))?.id || "";
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set([activeGroupId]));

  const handleNavClick = () => {
    if (window.innerWidth < 768) onClose();
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isGroupActive = (group: NavGroup) => group.items.some(i => currentPath.startsWith(i.path));

  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const ids = orderedGroups.map((g) => g.id);
    const [moved] = ids.splice(result.source.index, 1);
    ids.splice(result.destination.index, 0, moved);
    saveOrder(ids);
  };

  const content = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center">
          <img src="/brand/dynime-icon.png" alt={appInfo.app_name} className="h-7 w-7 rounded-lg shrink-0 object-contain" />
          {!collapsed && (
            <div className="ml-2.5">
              <span className="text-sm font-extrabold font-brand text-sidebar-foreground block leading-tight">
                {appInfo.app_name}
              </span>
              <span className="text-[10px] font-medium text-destructive">
                SUPER ADMIN
              </span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="md:hidden p-1 rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="superadmin-sidebar">
          {(provided) => (
            <nav
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 min-h-0 scrollbar-thin"
            >
              {orderedGroups.map((group, index) => {
                const isActive = isGroupActive(group);
                const isExpanded = expandedGroups.has(group.id);
                const isSingleItem = group.items.length === 1;

                return (
                  <Draggable key={group.id} draggableId={group.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={cn(
                          "relative",
                          snapshot.isDragging && "z-50 opacity-90"
                        )}
                        onMouseEnter={() => collapsed && setHoveredGroup(group.id)}
                        onMouseLeave={() => setHoveredGroup(null)}
                      >
                        {/* Single-item groups render as a direct link */}
                        {isSingleItem ? (
                          <SingleItemGroup
                            item={group.items[0]}
                            collapsed={collapsed}
                            dragHandleProps={dragProvided.dragHandleProps}
                            onNavClick={handleNavClick}
                          />
                        ) : (
                          <>
                            {/* Group header */}
                            <div className="flex items-center">
                              <div
                                {...dragProvided.dragHandleProps}
                                className={cn(
                                  "shrink-0 p-1 rounded text-sidebar-foreground/25 hover:text-sidebar-foreground/60 cursor-grab active:cursor-grabbing",
                                  collapsed && "hidden"
                                )}
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </div>
                              <button
                                onClick={() => {
                                  if (collapsed) return;
                                  toggleGroup(group.id);
                                }}
                                className={cn(
                                  "flex items-center flex-1 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-150 group",
                                  isActive
                                    ? "text-destructive"
                                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                )}
                              >
                                <group.icon className={cn("h-4 w-4 shrink-0", isActive && "text-destructive")} />
                                {!collapsed && (
                                  <>
                                    <span className="ml-2.5 truncate flex-1 text-left">{group.label}</span>
                                    <ChevronDown
                                      className={cn(
                                        "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 transition-transform duration-200",
                                        isExpanded && "rotate-180"
                                      )}
                                    />
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Submenu items — expanded state */}
                            {!collapsed && isExpanded && (
                              <div className="ml-6 pl-3 border-l border-sidebar-border/50 mt-0.5 mb-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                                {group.items.map((item) => (
                                  <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={handleNavClick}
                                    className={({ isActive: linkActive }) =>
                                      cn(
                                        "flex items-center rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-all duration-150",
                                        linkActive
                                          ? "bg-destructive/10 text-destructive"
                                          : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/90"
                                      )
                                    }
                                  >
                                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="ml-2 truncate">{item.label}</span>
                                  </NavLink>
                                ))}
                              </div>
                            )}

                            {/* Collapsed hover flyout */}
                            {collapsed && hoveredGroup === group.id && (
                              <div className="absolute left-full top-0 ml-2 z-[60] min-w-[200px] py-1.5 px-1 bg-sidebar border border-sidebar-border rounded-lg shadow-xl animate-in fade-in slide-in-from-left-1 duration-150">
                                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-sidebar-foreground/40 tracking-wider">
                                  {group.label}
                                </div>
                                {group.items.map((item) => (
                                  <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={handleNavClick}
                                    className={({ isActive: linkActive }) =>
                                      cn(
                                        "flex items-center rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                                        linkActive
                                          ? "bg-destructive/10 text-destructive"
                                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                      )
                                    }
                                  >
                                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="ml-2 truncate">{item.label}</span>
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}

              {/* Back to User Panel */}
              <div className="pt-3 mt-3 border-t border-sidebar-border">
                <NavLink
                  to="/dashboard"
                  onClick={handleNavClick}
                  className="flex items-center rounded-lg px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  <ArrowLeftRight className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="ml-2.5 truncate">User Panel</span>}
                </NavLink>
              </div>
            </nav>
          )}
        </Droppable>
      </DragDropContext>

      {/* Collapse toggle */}
      <div className="hidden md:block border-t border-sidebar-border p-2 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full rounded-md py-2 text-sidebar-foreground/50 hover:bg-destructive/8 hover:text-destructive transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </>
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden" onClick={onClose} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:transition-[width] md:duration-300",
        "w-64 md:sticky md:top-0 md:h-screen md:z-30 min-h-0",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed ? "md:w-16" : "md:w-64"
      )}>
        {content}
      </aside>
    </>
  );
}
