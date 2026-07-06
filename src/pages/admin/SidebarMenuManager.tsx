import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Eye, EyeOff, Pencil, Plus, Trash2, Save, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { MenuItemConfig } from "@/hooks/useMenuConfig";

// Default items per portal for initialization
const PORTAL_DEFAULTS: Record<string, MenuItemConfig[]> = {
  main_app: [
    { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", visible: true, order: 0 },
    { id: "hrm", label: "HRM", path: "/hrm", icon: "Users", visible: true, order: 1, children: [
      { id: "hrm-employees", label: "Employees", path: "/hrm/employees", icon: "UserCircle", visible: true, order: 0 },
      { id: "hrm-shifts", label: "Shifts", path: "/hrm/shifts", icon: "Clock", visible: true, order: 1 },
      { id: "hrm-attendance", label: "Attendance", path: "/hrm/attendance", icon: "Clock", visible: true, order: 2 },
      { id: "hrm-leave", label: "Leave", path: "/hrm/leave", icon: "CalendarDays", visible: true, order: 3 },
      { id: "hrm-late", label: "Late Tracking", path: "/hrm/late", icon: "Clock", visible: true, order: 4 },
      { id: "hrm-payroll", label: "Payroll", path: "/hrm/payroll", icon: "DollarSign", visible: true, order: 5 },
      { id: "hrm-salary-sheet", label: "Salary Sheet", path: "/hrm/salary-sheet", icon: "DollarSign", visible: true, order: 6 },
      { id: "hrm-salary-scaleup", label: "Salary Scaleup", path: "/hrm/salary-scaleup", icon: "Star", visible: true, order: 7 },
      { id: "hrm-loans", label: "Loans", path: "/hrm/loans", icon: "CreditCard", visible: true, order: 8 },
      { id: "hrm-training", label: "Training", path: "/hrm/training", icon: "GraduationCap", visible: true, order: 9 },
      { id: "hrm-warnings", label: "Warnings", path: "/hrm/warnings", icon: "AlertTriangle", visible: true, order: 10 },
      { id: "hrm-probation", label: "Probation", path: "/hrm/probation", icon: "UserCheck", visible: true, order: 11 },
      { id: "hrm-recruitment", label: "Recruitment", path: "/hrm/recruitment", icon: "Briefcase", visible: true, order: 12 },
      { id: "hrm-performance", label: "Performance", path: "/hrm/performance", icon: "Star", visible: true, order: 13 },
    ]},
    { id: "crm", label: "CRM", path: "/crm", icon: "Target", visible: true, order: 2, children: [
      { id: "crm-pipeline", label: "Pipeline", path: "/crm", icon: "Target", visible: true, order: 0 },
      { id: "crm-forecasting", label: "Forecasting", path: "/crm/forecasting", icon: "TrendingUp", visible: true, order: 1 },
      { id: "crm-timeline", label: "Deal Timeline", path: "/crm/timeline", icon: "MessageSquare", visible: true, order: 2 },
    ]},
    { id: "marketing", label: "Marketing", path: "/marketing", icon: "Megaphone", visible: true, order: 3, children: [
      { id: "mkt-campaigns", label: "Campaigns", path: "/marketing/campaigns", icon: "Layers", visible: true, order: 0 },
      { id: "mkt-templates", label: "Templates", path: "/marketing/templates", icon: "Mail", visible: true, order: 1 },
      { id: "mkt-analytics", label: "Analytics", path: "/marketing/analytics", icon: "BarChart2", visible: true, order: 2 },
    ]},
    { id: "workflows", label: "Workflows", path: "/workflows", icon: "GitBranch", visible: true, order: 4 },
    { id: "accounting", label: "Accounting", path: "/accounting", icon: "Receipt", visible: true, order: 5, children: [
      { id: "acc-invoices", label: "Invoices", path: "/accounting/invoices", icon: "FileText", visible: true, order: 0 },
      { id: "acc-recurring", label: "Recurring", path: "/accounting/recurring", icon: "RefreshCw", visible: true, order: 1 },
      { id: "acc-expenses", label: "Expenses", path: "/accounting/expenses", icon: "Wallet", visible: true, order: 2 },
      { id: "acc-payments", label: "Payments", path: "/accounting/payments", icon: "CreditCard", visible: true, order: 3 },
      { id: "acc-pl", label: "P&L", path: "/accounting/profit-loss", icon: "TrendingUp", visible: true, order: 4 },
      { id: "acc-budgets", label: "Budgets", path: "/accounting/budgets", icon: "PiggyBank", visible: true, order: 5 },
      { id: "acc-tax", label: "Tax & VAT", path: "/accounting/tax", icon: "Percent", visible: true, order: 6 },
      { id: "acc-tax-reports", label: "Tax Reports", path: "/accounting/tax-reports", icon: "BarChart3", visible: true, order: 7 },
    ]},
    { id: "tax-compliance", label: "Tax Compliance", path: "/tax", icon: "Percent", visible: true, order: 6, children: [
      { id: "tax-dashboard", label: "Dashboard", path: "/tax/dashboard", icon: "LayoutDashboard", visible: true, order: 0 },
      { id: "tax-profiles", label: "Country Profiles", path: "/tax/profiles", icon: "Globe", visible: true, order: 1 },
      { id: "tax-rates", label: "Tax Rates", path: "/tax/rates", icon: "Percent", visible: true, order: 2 },
      { id: "tax-compliance-tracker", label: "Compliance", path: "/tax/compliance", icon: "FileText", visible: true, order: 3 },
      { id: "tax-calculator", label: "Calculator", path: "/tax/calculator", icon: "Receipt", visible: true, order: 4 },
      { id: "tax-importer", label: "Import Codes", path: "/tax/importer", icon: "Globe", visible: true, order: 5 },
    ]},
    { id: "helpdesk", label: "Helpdesk", path: "/helpdesk", icon: "Headphones", visible: true, order: 7 },
    { id: "projects", label: "Projects", path: "/projects", icon: "FolderKanban", visible: true, order: 8 },
    { id: "documents", label: "Documents", path: "/documents", icon: "FileText", visible: true, order: 9 },
    { id: "reports", label: "Reports", path: "/reports", icon: "BarChart3", visible: true, order: 10 },
    { id: "product-hub", label: "Point of Sale", path: "/pos", icon: "ShoppingCart", visible: true, order: 11, children: [
      { id: "ph-dashboard", label: "Dashboard", path: "/pos/dashboard", icon: "LayoutDashboard", visible: true, order: 0 },
      { id: "ph-terminal", label: "POS Terminal", path: "/pos/terminal", icon: "Receipt", visible: true, order: 1 },
      { id: "ph-products", label: "Products", path: "/pos/products", icon: "Package", visible: true, order: 2 },
      { id: "ph-orders", label: "Orders", path: "/pos/orders", icon: "ShoppingCart", visible: true, order: 3 },
      { id: "ph-courier", label: "Send to Courier", path: "/pos/send-courier", icon: "Send", visible: true, order: 4 },
      { id: "ph-integrations", label: "Integrations", path: "/pos/integrations", icon: "Store", visible: true, order: 5 },
      { id: "ph-settings", label: "Settings", path: "/pos/settings", icon: "Settings", visible: true, order: 6 },
    ]},
    { id: "portals", label: "Portals", path: "/portal", icon: "Globe", visible: true, order: 12, children: [
      { id: "portal-customer", label: "Customer Portal", path: "/portal/customer", icon: "User", visible: true, order: 0 },
      { id: "portal-employee", label: "Employee Portal", path: "/portal/employee", icon: "UserCircle", visible: true, order: 1 },
    ]},
    { id: "wallet", label: "Wallet", path: "/wallet", icon: "Wallet", visible: true, order: 13, children: [
      { id: "wallet-main", label: "Wallet", path: "/wallet", icon: "Wallet", visible: true, order: 0 },
      { id: "wallet-methods", label: "Saved Methods", path: "/payment-methods", icon: "CreditCard", visible: true, order: 1 },
      { id: "wallet-auto", label: "Auto Payments", path: "/auto-payments", icon: "RefreshCw", visible: true, order: 2 },
    ]},
    { id: "calendar", label: "Calendar", path: "/calendar", icon: "Calendar", visible: true, order: 14 },
    { id: "team-chat", label: "Team Chat", path: "/team-chat", icon: "MessageSquare", visible: true, order: 15 },
    { id: "referrals", label: "Referrals", path: "/referrals", icon: "Gift", visible: true, order: 16 },
    { id: "subscription", label: "Subscription", path: "/subscription", icon: "Crown", visible: true, order: 17 },
    { id: "company-admin", label: "Company Admin", path: "/cadmin", icon: "Shield", visible: true, order: 18, children: [
      { id: "ca-dashboard", label: "Dashboard", path: "/cadmin/dashboard", icon: "LayoutDashboard", visible: true, order: 0 },
      { id: "ca-settings", label: "Company Settings", path: "/cadmin/settings", icon: "Building2", visible: true, order: 1 },
      { id: "ca-departments", label: "Departments", path: "/cadmin/departments", icon: "Layers", visible: true, order: 2 },
      { id: "ca-employees", label: "Employees", path: "/cadmin/employees", icon: "Users", visible: true, order: 3 },
      { id: "ca-approvals", label: "Approval Workflows", path: "/cadmin/approvals", icon: "GitBranch", visible: true, order: 4 },
      { id: "ca-roles", label: "Roles & Permissions", path: "/cadmin/roles", icon: "Shield", visible: true, order: 5 },
      { id: "ca-invite", label: "Invite Codes", path: "/cadmin/invite-codes", icon: "KeyRound", visible: true, order: 6 },
      { id: "ca-communication", label: "Communication", path: "/cadmin/communication", icon: "MessageSquare", visible: true, order: 7 },
      { id: "ca-coupons", label: "Coupons", path: "/cadmin/coupons", icon: "Ticket", visible: true, order: 8 },
      { id: "ca-wallet", label: "Wallet", path: "/cadmin/wallet", icon: "Wallet", visible: true, order: 9 },
      { id: "ca-wallet-settings", label: "Wallet Settings", path: "/cadmin/wallet-settings", icon: "CreditCard", visible: true, order: 10 },
      { id: "ca-referrals", label: "Referral Settings", path: "/cadmin/referral-settings", icon: "Gift", visible: true, order: 11 },
      { id: "ca-sms", label: "SMS Dashboard", path: "/cadmin/sms", icon: "Smartphone", visible: true, order: 12 },
      { id: "ca-api-keys", label: "API Keys", path: "/cadmin/api-keys", icon: "Code", visible: true, order: 13 },
      { id: "ca-webhooks", label: "Webhooks", path: "/cadmin/webhooks", icon: "GitBranch", visible: true, order: 14 },
      { id: "ca-branding", label: "Branding", path: "/cadmin/branding", icon: "Layers", visible: true, order: 15 },
      { id: "ca-notifications", label: "Notifications", path: "/cadmin/notifications", icon: "Megaphone", visible: true, order: 16 },
      { id: "ca-reports", label: "Reports", path: "/cadmin/scheduled-reports", icon: "BarChart3", visible: true, order: 17 },
      { id: "ca-kyb", label: "Business Verification", path: "/cadmin/kyb", icon: "BadgeCheck", visible: true, order: 18 },
    ]},
    { id: "settings", label: "Settings", path: "/settings", icon: "Settings", visible: true, order: 19 },
  ],
  company_admin: [
    { id: "ca-dashboard", label: "Dashboard", path: "/company-admin/dashboard", icon: "LayoutDashboard", visible: true, order: 0 },
    { id: "ca-settings", label: "Company Settings", path: "/company-admin/settings", icon: "Building2", visible: true, order: 1 },
    { id: "ca-departments", label: "Departments", path: "/company-admin/departments", icon: "Layers", visible: true, order: 2 },
    { id: "ca-employees", label: "Employees", path: "/company-admin/employees", icon: "Users", visible: true, order: 3 },
    { id: "ca-approvals", label: "Approval Workflows", path: "/company-admin/approvals", icon: "GitBranch", visible: true, order: 4 },
    { id: "ca-roles", label: "Roles & Permissions", path: "/company-admin/roles", icon: "Shield", visible: true, order: 5 },
    { id: "ca-invite", label: "Invite Codes", path: "/company-admin/invite-codes", icon: "KeyRound", visible: true, order: 6 },
    { id: "ca-communication", label: "Communication Hub", path: "/company-admin/communication", icon: "MessageSquare", visible: true, order: 7 },
    { id: "ca-coupons", label: "Coupons", path: "/company-admin/coupons", icon: "Ticket", visible: true, order: 8 },
    { id: "ca-api-keys", label: "API Keys", path: "/company-admin/api-keys", icon: "Code", visible: true, order: 9 },
    { id: "ca-webhooks", label: "Webhooks", path: "/company-admin/webhooks", icon: "GitBranch", visible: true, order: 10 },
    { id: "ca-branding", label: "Branding", path: "/company-admin/branding", icon: "Layers", visible: true, order: 11 },
    { id: "ca-notifications", label: "Notification Preferences", path: "/company-admin/notifications", icon: "MessageSquare", visible: true, order: 12 },
    { id: "ca-reports", label: "Scheduled Reports", path: "/company-admin/scheduled-reports", icon: "LayoutDashboard", visible: true, order: 13 },
    { id: "ca-wallet", label: "Company Wallet", path: "/company-admin/wallet", icon: "Wallet", visible: true, order: 14 },
    { id: "ca-wallet-settings", label: "Wallet Settings", path: "/company-admin/wallet-settings", icon: "KeyRound", visible: true, order: 15 },
    { id: "ca-referrals", label: "Referral Settings", path: "/company-admin/referral-settings", icon: "Gift", visible: true, order: 16 },
    { id: "ca-kyb", label: "Business Verification", path: "/company-admin/kyb", icon: "BadgeCheck", visible: true, order: 17 },
    { id: "ca-sms", label: "SMS Dashboard", path: "/cadmin/sms", icon: "Smartphone", visible: true, order: 18 },
    { id: "ca-analytics", label: "Advanced Analytics", path: "/company-admin/analytics", icon: "BarChart3", visible: true, order: 19 },
    { id: "ca-ai-hub", label: "AI Automation Hub", path: "/company-admin/ai-hub", icon: "Brain", visible: true, order: 20 },
    { id: "ca-integrations", label: "Integrations", path: "/company-admin/integrations", icon: "Layers", visible: true, order: 21 },
    { id: "ca-mobile-app", label: "Mobile App", path: "/company-admin/mobile-app", icon: "Smartphone", visible: true, order: 22 },
    { id: "ca-sms-settings", label: "SMS Settings", path: "/company-admin/sms-settings", icon: "MessageSquare", visible: true, order: 23 },
  ],
  customer_portal: [
    { id: "cp-dashboard", label: "Dashboard", path: "/portal/customer", icon: "Home", visible: true, order: 0 },
    { id: "cp-wallet", label: "My Wallet", path: "/portal/customer/wallet", icon: "Wallet", visible: true, order: 1 },
  ],
  employee_portal: [
    { id: "ep-dashboard", label: "Dashboard", path: "/portal/employee", icon: "Home", visible: true, order: 0 },
    { id: "ep-profile", label: "My Profile", path: "/portal/employee/profile", icon: "UserCircle", visible: true, order: 1 },
    { id: "ep-payslips", label: "My Payslips", path: "/portal/employee/payslips", icon: "FileText", visible: true, order: 2 },
    { id: "ep-team", label: "Team Directory", path: "/portal/employee/team", icon: "Users", visible: true, order: 3 },
    { id: "ep-holidays", label: "Holidays", path: "/portal/employee/holidays", icon: "PartyPopper", visible: true, order: 4 },
    { id: "ep-documents", label: "Doc Requests", path: "/portal/employee/documents", icon: "Briefcase", visible: true, order: 5 },
    { id: "ep-announcements", label: "Announcements", path: "/portal/employee/announcements", icon: "Megaphone", visible: true, order: 6 },
    { id: "ep-verifications", label: "Verifications", path: "/portal/employee/verifications", icon: "ShieldCheck", visible: true, order: 7 },
  ],
};

function AddItemDialog({ onAdd, isSubItem }: { onAdd: (item: MenuItemConfig) => void; isSubItem?: boolean }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [icon, setIcon] = useState("Link");

  const handleAdd = () => {
    if (!label || !path) return;
    onAdd({
      id: `custom-${Date.now()}`,
      label,
      path,
      icon,
      visible: true,
      order: 999,
      isCustom: true,
    });
    setLabel("");
    setPath("");
    setIcon("Link");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={isSubItem ? "h-7 text-xs" : ""}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {isSubItem ? "Add Sub-Item" : "Add Custom Link"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSubItem ? "Add Sub-Menu Item" : "Add Custom Menu Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="My Custom Page" />
          </div>
          <div>
            <Label>Path</Label>
            <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/custom-page" />
          </div>
          <div>
            <Label>Icon Name (Lucide)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Link" />
          </div>
          <Button onClick={handleAdd} disabled={!label || !path}>Add Item</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditableLabel({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(value);

  if (editing) {
    return (
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => { onSave(label); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onSave(label); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        className="h-7 text-sm flex-1"
        autoFocus
      />
    );
  }

  return (
    <span className="text-sm font-medium flex-1 truncate cursor-pointer" onDoubleClick={() => setEditing(true)}>
      {value}
    </span>
  );
}

/** Move-to dropdown: move a sub-item to another parent or promote to top-level */
function MoveToMenu({
  item,
  currentParentId,
  allParents,
  onMoveToParent,
  onPromoteToTopLevel,
  onDemoteToChild,
}: {
  item: MenuItemConfig;
  currentParentId?: string;
  allParents: MenuItemConfig[];
  onMoveToParent: (itemId: string, fromParentId: string | null, toParentId: string) => void;
  onPromoteToTopLevel: (itemId: string, fromParentId: string) => void;
  onDemoteToChild: (itemId: string, toParentId: string) => void;
}) {
  const isChild = !!currentParentId;
  const targets = allParents.filter((p) => p.id !== currentParentId && p.id !== item.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded hover:bg-muted text-muted-foreground" title="Move to...">
          <MoveRight className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto min-w-[180px]">
        {isChild && (
          <>
            <DropdownMenuItem onClick={() => onPromoteToTopLevel(item.id, currentParentId!)}>
              <ArrowUpRight className="h-3.5 w-3.5 mr-2" /> Promote to top-level
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {!isChild && targets.length > 0 && (
          <>
            <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Move as sub-item of:</p>
            {targets.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => onDemoteToChild(item.id, t.id)}>
                <ArrowDownRight className="h-3.5 w-3.5 mr-2" /> {t.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        {isChild && targets.length > 0 && (
          <>
            <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Move to another menu:</p>
            {targets.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => onMoveToParent(item.id, currentParentId!, t.id)}>
                <MoveRight className="h-3.5 w-3.5 mr-2" /> {t.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PortalEditor({ portalType, portalLabel }: { portalType: string; portalLabel: string }) {
  const [items, setItems] = useState<MenuItemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("sidebar_menu_configs")
        .select("menu_items")
        .eq("portal_type", portalType)
        .maybeSingle();

      const saved = data?.menu_items as unknown as MenuItemConfig[];
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setItems(saved);
      } else {
        setItems(PORTAL_DEFAULTS[portalType] || []);
      }
      setLoading(false);
    };
    load();
  }, [portalType]);

  // Helper: remove a child from its parent
  const removeChildFromParent = (list: MenuItemConfig[], childId: string, parentId: string): { list: MenuItemConfig[]; child: MenuItemConfig | null } => {
    let child: MenuItemConfig | null = null;
    const newList = list.map((item) => {
      if (item.id === parentId && item.children) {
        const found = item.children.find((c) => c.id === childId);
        if (found) child = { ...found };
        return { ...item, children: item.children.filter((c) => c.id !== childId).map((c, i) => ({ ...c, order: i })) };
      }
      return item;
    });
    return { list: newList, child };
  };

  // Helper: add a child to a parent
  const addChildToParent = (list: MenuItemConfig[], child: MenuItemConfig, parentId: string, index?: number): MenuItemConfig[] => {
    return list.map((item) => {
      if (item.id === parentId) {
        const children = [...(item.children || [])];
        const cleanChild = { ...child, children: undefined }; // sub-items shouldn't have children
        if (index !== undefined) {
          children.splice(index, 0, cleanChild);
        } else {
          children.push(cleanChild);
        }
        return { ...item, children: children.map((c, i) => ({ ...c, order: i })) };
      }
      return item;
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const srcDrop = source.droppableId;
    const destDrop = destination.droppableId;

    const topDropId = `portal-${portalType}`;
    const isTopSrc = srcDrop === topDropId;
    const isTopDest = destDrop === topDropId;

    // Case 1: Top-level reorder
    if (isTopSrc && isTopDest) {
      const reordered = [...items];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setItems(reordered.map((item, i) => ({ ...item, order: i })));
      return;
    }

    // Case 2: Same parent children reorder
    if (srcDrop === destDrop && srcDrop.startsWith("children-")) {
      const parentId = srcDrop.replace("children-", "");
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== parentId || !item.children) return item;
          const children = [...item.children];
          const [moved] = children.splice(source.index, 1);
          children.splice(destination.index, 0, moved);
          return { ...item, children: children.map((c, i) => ({ ...c, order: i })) };
        })
      );
      return;
    }

    // Case 3: Cross-parent sub-item move
    if (srcDrop.startsWith("children-") && destDrop.startsWith("children-")) {
      const srcParentId = srcDrop.replace("children-", "");
      const destParentId = destDrop.replace("children-", "");

      setItems((prev) => {
        const { list: afterRemove, child } = removeChildFromParent(prev, result.draggableId, srcParentId);
        if (!child) return prev;
        return addChildToParent(afterRemove, child, destParentId, destination.index);
      });
      toast.info("Sub-item moved to another menu");
      return;
    }

    // Case 4: Child → Top-level (promote via drag)
    if (srcDrop.startsWith("children-") && isTopDest) {
      const srcParentId = srcDrop.replace("children-", "");
      setItems((prev) => {
        const { list: afterRemove, child } = removeChildFromParent(prev, result.draggableId, srcParentId);
        if (!child) return prev;
        const promoted = { ...child, children: undefined };
        afterRemove.splice(destination.index, 0, promoted);
        return afterRemove.map((item, i) => ({ ...item, order: i }));
      });
      toast.info("Item promoted to top-level");
      return;
    }

    // Case 5: Top-level → Child (demote via drag)
    if (isTopSrc && destDrop.startsWith("children-")) {
      const destParentId = destDrop.replace("children-", "");
      setItems((prev) => {
        const itemToMove = prev[source.index];
        if (!itemToMove) return prev;
        // Don't allow moving a parent with children into another parent
        if (itemToMove.children && itemToMove.children.length > 0) {
          toast.error("Cannot move a parent with sub-items into another menu. Remove sub-items first.");
          return prev;
        }
        const afterRemove = prev.filter((_, i) => i !== source.index);
        const demoted = { ...itemToMove, children: undefined };
        return addChildToParent(afterRemove, demoted, destParentId, destination.index).map((item, i) => ({ ...item, order: i }));
      });
      toast.info("Item moved as sub-item");
      return;
    }
  };

  // Move-to menu handlers
  const handleMoveToParent = (itemId: string, fromParentId: string | null, toParentId: string) => {
    setItems((prev) => {
      if (fromParentId) {
        const { list: afterRemove, child } = removeChildFromParent(prev, itemId, fromParentId);
        if (!child) return prev;
        return addChildToParent(afterRemove, child, toParentId);
      }
      return prev;
    });
    toast.success("Item moved");
  };

  const handlePromoteToTopLevel = (itemId: string, fromParentId: string) => {
    setItems((prev) => {
      const { list: afterRemove, child } = removeChildFromParent(prev, itemId, fromParentId);
      if (!child) return prev;
      const promoted = { ...child, children: undefined };
      return [...afterRemove, promoted].map((item, i) => ({ ...item, order: i }));
    });
    toast.success("Item promoted to top-level");
  };

  const handleDemoteToChild = (itemId: string, toParentId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      if (item.children && item.children.length > 0) {
        toast.error("Cannot demote a parent with sub-items. Remove sub-items first.");
        return prev;
      }
      const afterRemove = prev.filter((i) => i.id !== itemId).map((i, idx) => ({ ...i, order: idx }));
      const demoted = { ...item, children: undefined };
      return addChildToParent(afterRemove, demoted, toParentId);
    });
    toast.success("Item moved as sub-item");
  };

  const toggleVisibility = (id: string, parentId?: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (!parentId && item.id === id) return { ...item, visible: !item.visible };
        if (parentId && item.id === parentId && item.children) {
          return { ...item, children: item.children.map((c) => c.id === id ? { ...c, visible: !c.visible } : c) };
        }
        if (!parentId && item.children) {
          return { ...item, children: item.children.map((c) => c.id === id ? { ...c, visible: !c.visible } : c) };
        }
        return item;
      })
    );
  };

  const renameItem = (id: string, newLabel: string, parentId?: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id && !parentId) return { ...item, label: newLabel };
        if (parentId && item.id === parentId && item.children) {
          return { ...item, children: item.children.map((c) => c.id === id ? { ...c, label: newLabel } : c) };
        }
        if (!parentId && item.children) {
          return { ...item, children: item.children.map((c) => c.id === id ? { ...c, label: newLabel } : c) };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string, parentId?: string) => {
    if (parentId) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === parentId && item.children) {
            return { ...item, children: item.children.filter((c) => c.id !== id) };
          }
          return item;
        })
      );
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const addItem = (item: MenuItemConfig) => {
    setItems((prev) => [...prev, { ...item, order: prev.length }]);
  };

  const addSubItem = (parentId: string, subItem: MenuItemConfig) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === parentId) {
          const children = item.children || [];
          return { ...item, children: [...children, { ...subItem, order: children.length }] };
        }
        return item;
      })
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("sidebar_menu_configs")
      .upsert(
        { portal_type: portalType, menu_items: items as any, updated_at: new Date().toISOString() },
        { onConflict: "portal_type" }
      );

    if (error) {
      toast.error("Failed to save menu configuration");
    } else {
      toast.success(`${portalLabel} menu saved successfully`);
    }
    setSaving(false);
  };

  const handleReset = () => {
    setItems(PORTAL_DEFAULTS[portalType] || []);
    toast.info("Reset to defaults — save to apply");
  };

  // Get parents that have children (for move-to targets)
  const parentsWithChildren = items.filter((i) => i.children && i.children.length > 0 || true); // all top-level items can receive children

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AddItemDialog onAdd={addItem} />
          <Button variant="ghost" size="sm" onClick={handleReset}>Reset Defaults</Button>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <MoveRight className="h-3.5 w-3.5 shrink-0" />
        <span>Drag items to reorder. Use the <strong>→ Move</strong> button to move sub-items between menus, promote to top-level, or demote into a parent.</span>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={`portal-${portalType}`} type="MENU_ITEM">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={snapshot.isDragging ? "opacity-80 shadow-lg" : ""}
                    >
                      {/* Parent item row */}
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card ${
                          !item.visible ? "opacity-50" : ""
                        }`}
                      >
                        <div {...dragProvided.dragHandleProps} className="cursor-grab text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        {item.children && item.children.length > 0 && (
                          <button onClick={() => toggleExpand(item.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground">
                            {expandedParents.has(item.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        )}

                        <EditableLabel value={item.label} onSave={(label) => renameItem(item.id, label)} />

                        {item.children && item.children.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] shrink-0">{item.children.length} sub</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] shrink-0">{item.icon}</Badge>
                        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{item.path}</span>

                        <MoveToMenu
                          item={item}
                          allParents={items}
                          onMoveToParent={handleMoveToParent}
                          onPromoteToTopLevel={handlePromoteToTopLevel}
                          onDemoteToChild={handleDemoteToChild}
                        />

                        <button onClick={() => renameItem(item.id, prompt("Rename:", item.label) || item.label)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => toggleVisibility(item.id)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                          {item.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </button>
                        {item.isCustom && (
                          <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Children section */}
                      {(expandedParents.has(item.id) || (item.children && item.children.length > 0 && expandedParents.has(item.id))) && (
                        <div className="mt-1 ml-8">
                          <Droppable droppableId={`children-${item.id}`} type="MENU_ITEM">
                            {(childProvided, childSnapshot) => (
                              <div
                                ref={childProvided.innerRef}
                                {...childProvided.droppableProps}
                                className={`space-y-1 min-h-[32px] rounded-md transition-colors ${
                                  childSnapshot.isDraggingOver ? "bg-primary/5 border border-dashed border-primary/30" : ""
                                }`}
                              >
                                {(item.children || []).map((child, ci) => (
                                  <Draggable key={child.id} draggableId={child.id} index={ci}>
                                    {(childDrag, childSnap) => (
                                      <div
                                        ref={childDrag.innerRef}
                                        {...childDrag.draggableProps}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50 bg-muted/30 ${
                                          childSnap.isDragging ? "opacity-80 shadow-lg" : ""
                                        } ${!child.visible ? "opacity-50" : ""}`}
                                      >
                                        <div {...childDrag.dragHandleProps} className="cursor-grab text-muted-foreground">
                                          <GripVertical className="h-3 w-3" />
                                        </div>
                                        <EditableLabel value={child.label} onSave={(label) => renameItem(child.id, label, item.id)} />
                                        <Badge variant="outline" className="text-[9px] shrink-0">{child.icon}</Badge>
                                        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{child.path}</span>

                                        <MoveToMenu
                                          item={child}
                                          currentParentId={item.id}
                                          allParents={items}
                                          onMoveToParent={handleMoveToParent}
                                          onPromoteToTopLevel={handlePromoteToTopLevel}
                                          onDemoteToChild={handleDemoteToChild}
                                        />

                                        <button onClick={() => toggleVisibility(child.id, item.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground">
                                          {child.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                        </button>
                                        <button onClick={() => renameItem(child.id, prompt("Rename sub-item:", child.label) || child.label, item.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground">
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        {child.isCustom && (
                                          <button onClick={() => removeItem(child.id, item.id)} className="p-0.5 rounded hover:bg-destructive/10 text-destructive">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {childProvided.placeholder}
                              </div>
                            )}
                          </Droppable>
                          <div className="mt-2">
                            <AddItemDialog
                              isSubItem
                              onAdd={(subItem) => addSubItem(item.id, subItem)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default function SidebarMenuManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sidebar Menu Manager</h1>
        <p className="text-muted-foreground mt-1">Customize navigation menus for all portals. Drag to reorder, toggle visibility, rename items, or add custom links. Sub-items can be dragged between menus or promoted/demoted via the Move button.</p>
      </div>

      <Tabs defaultValue="main_app" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="main_app">Main App</TabsTrigger>
          <TabsTrigger value="company_admin">Company Admin</TabsTrigger>
          <TabsTrigger value="employee_portal">Employee Portal</TabsTrigger>
          <TabsTrigger value="customer_portal">Customer Portal</TabsTrigger>
        </TabsList>
        <TabsContent value="main_app">
          <Card>
            <CardHeader><CardTitle>Main Application Sidebar</CardTitle></CardHeader>
            <CardContent><PortalEditor portalType="main_app" portalLabel="Main App" /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="company_admin">
          <Card>
            <CardHeader><CardTitle>Company Admin Panel</CardTitle></CardHeader>
            <CardContent><PortalEditor portalType="company_admin" portalLabel="Company Admin" /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="employee_portal">
          <Card>
            <CardHeader><CardTitle>Employee Portal</CardTitle></CardHeader>
            <CardContent><PortalEditor portalType="employee_portal" portalLabel="Employee Portal" /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="customer_portal">
          <Card>
            <CardHeader><CardTitle>Customer Portal</CardTitle></CardHeader>
            <CardContent><PortalEditor portalType="customer_portal" portalLabel="Customer Portal" /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}