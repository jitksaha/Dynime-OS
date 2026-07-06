import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GripVertical, X, Plus, Users, Target, DollarSign, Headphones, TrendingUp, TrendingDown, Minus, BarChart3, FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

interface Widget {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  link: string;
  getValue: (counts: any, cs: string) => string;
}

const allWidgets: Widget[] = [
  { id: "employees", label: "Total Employees", icon: Users, color: "text-primary", bgColor: "bg-primary/10", link: "/hrms/employees", getValue: (c) => c.employees?.toString() || "0" },
  { id: "deals", label: "Active Deals", icon: Target, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10", link: "/crm", getValue: (c, cs) => c.dealValue ? `${cs}${c.dealValue >= 1000 ? (c.dealValue / 1000).toFixed(0) + "K" : c.dealValue}` : `${cs}0` },
  { id: "revenue", label: "Revenue (Paid)", icon: DollarSign, color: "text-warning", bgColor: "bg-warning/10", link: "/accounting/invoices", getValue: (c, cs) => c.invoiceTotal ? `${cs}${c.invoiceTotal >= 1000 ? (c.invoiceTotal / 1000).toFixed(0) + "K" : c.invoiceTotal}` : `${cs}0` },
  { id: "tickets", label: "Open Tickets", icon: Headphones, color: "text-info", bgColor: "bg-info/10", link: "/helpdesk", getValue: (c) => c.tickets?.toString() || "0" },
  { id: "attendance", label: "Today's Attendance", icon: Clock, color: "text-primary", bgColor: "bg-primary/10", link: "/hrms/attendance", getValue: (c) => c.attendanceToday?.toString() || "0" },
  { id: "projects", label: "Active Projects", icon: BarChart3, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10", link: "/projects", getValue: (c) => c.activeProjects?.toString() || "0" },
  { id: "invoices", label: "Pending Invoices", icon: FileText, color: "text-warning", bgColor: "bg-warning/10", link: "/accounting/invoices", getValue: (c) => c.pendingInvoices?.toString() || "0" },
  { id: "campaigns", label: "Active Campaigns", icon: TrendingUp, color: "text-info", bgColor: "bg-info/10", link: "/marketing/campaigns", getValue: (c) => c.activeCampaigns?.toString() || "0" },
];

const DEFAULT_WIDGETS = ["employees", "deals", "revenue", "tickets"];

const ROLE_DEFAULTS: Record<string, string[]> = {
  hr_manager: ["employees", "attendance", "campaigns", "projects"],
  sales_manager: ["deals", "revenue", "tickets", "campaigns"],
  marketing_manager: ["campaigns", "deals", "revenue", "projects"],
  finance_manager: ["revenue", "invoices", "deals", "tickets"],
  support_agent: ["tickets", "projects", "employees", "attendance"],
  company_admin: ["employees", "deals", "revenue", "tickets"],
  super_admin: ["employees", "deals", "revenue", "tickets"],
  employee: ["attendance", "projects", "tickets", "invoices"],
};

interface DashboardWidgetsProps {
  counts: Record<string, any>;
  prevCounts?: Record<string, any>;
  loading: boolean;
  userRole?: string;
}

const getGrowthInfo = (current: number, previous: number) => {
  if (previous === 0 && current === 0) return { pct: 0, direction: "neutral" as const };
  if (previous === 0) return { pct: 100, direction: "up" as const };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "neutral" as const };
};

const GrowthBadge = ({ widgetId, counts, prevCounts }: { widgetId: string; counts: Record<string, any>; prevCounts?: Record<string, any> }) => {
  if (!prevCounts) return null;
  const keyMap: Record<string, string> = {
    employees: "employees", deals: "deals", revenue: "invoiceTotal", tickets: "tickets",
    attendance: "attendanceToday", projects: "activeProjects", invoices: "pendingInvoices", campaigns: "activeCampaigns",
  };
  const key = keyMap[widgetId];
  if (!key) return null;
  const current = Number(counts[key] || 0);
  const previous = Number(prevCounts[key] || 0);
  const { pct, direction } = getGrowthInfo(current, previous);

  if (direction === "neutral") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
        <Minus className="h-2.5 w-2.5" /> 0%
      </span>
    );
  }

  const isPositive = widgetId === "tickets" ? direction === "down" : direction === "up";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
      isPositive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
    )}>
      {direction === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {pct}%
    </span>
  );
};

// Mini sparkline SVG for visual flair
const MiniSparkline = ({ positive }: { positive: boolean }) => (
  <svg width="48" height="20" viewBox="0 0 48 20" fill="none" className="opacity-40">
    <path
      d={positive ? "M0 16 L8 12 L16 14 L24 8 L32 10 L40 4 L48 2" : "M0 4 L8 8 L16 6 L24 12 L32 10 L40 16 L48 18"}
      stroke={positive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export function DashboardWidgets({ counts, prevCounts, loading, userRole }: DashboardWidgetsProps) {
  const { symbol: cs } = useTenantCurrency();
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem("dashboard_widgets");
    if (saved) return JSON.parse(saved);
    if (userRole && ROLE_DEFAULTS[userRole]) return ROLE_DEFAULTS[userRole];
    return DEFAULT_WIDGETS;
  });
  const [editing, setEditing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("dashboard_widgets", JSON.stringify(activeWidgets));
  }, [activeWidgets]);

  const widgets = activeWidgets.map((id) => allWidgets.find((w) => w.id === id)).filter(Boolean) as Widget[];
  const availableWidgets = allWidgets.filter((w) => !activeWidgets.includes(w.id));

  const removeWidget = (id: string) => setActiveWidgets((prev) => prev.filter((w) => w !== id));
  const addWidget = (id: string) => setActiveWidgets((prev) => [...prev, id]);
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    setActiveWidgets((prev) => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(draggedId);
      const toIdx = newOrder.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedId);
      return newOrder;
    });
  };
  const handleDragEnd = () => setDraggedId(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Your Progress</h2>
        <button onClick={() => setEditing(!editing)} className="text-xs text-primary font-medium hover:underline transition-colors">
          {editing ? "Done" : "Customize"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {widgets.map((widget) => {
          const Wrapper = editing ? "div" : Link;
          const wrapperProps = editing ? {} : { to: widget.link };
          const displayValue = widget.getValue(counts, cs);

          // Determine growth direction for sparkline
          const keyMap: Record<string, string> = {
            employees: "employees", deals: "deals", revenue: "invoiceTotal", tickets: "tickets",
            attendance: "attendanceToday", projects: "activeProjects", invoices: "pendingInvoices", campaigns: "activeCampaigns",
          };
          const k = keyMap[widget.id];
          const isPositive = k && prevCounts ? Number(counts[k] || 0) >= Number(prevCounts[k] || 0) : true;

          return (
            <Wrapper
              key={widget.id}
              {...(wrapperProps as any)}
              draggable={editing}
              onDragStart={() => handleDragStart(widget.id)}
              onDragOver={(e: React.DragEvent) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group relative flex items-start gap-3 p-4 rounded-2xl border border-border bg-card",
                "hover:shadow-md hover:border-primary/15 transition-all duration-200",
                editing && "cursor-grab ring-1 ring-primary/20",
                draggedId === widget.id && "opacity-50"
              )}
            >
              {editing && (
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <button onClick={() => removeWidget(widget.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className={cn("p-2.5 rounded-xl shrink-0", widget.bgColor)}>
                <widget.icon className={cn("h-5 w-5", widget.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-medium truncate">{widget.label}</span>
                  {!loading && !editing && <GrowthBadge widgetId={widget.id} counts={counts} prevCounts={prevCounts} />}
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-xl font-bold text-foreground tracking-tight">
                    {loading ? <span className="inline-block h-6 w-14 bg-muted rounded-lg animate-pulse" /> : displayValue}
                  </p>
                  {!editing && <MiniSparkline positive={isPositive} />}
                </div>
              </div>
            </Wrapper>
          );
        })}

        {editing && availableWidgets.length > 0 && (
          <div className="border-2 border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] hover:border-primary/30 transition-colors">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1 justify-center">
              {availableWidgets.map((w) => (
                <button key={w.id} onClick={() => addWidget(w.id)} className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-card hover:bg-primary/10 hover:border-primary/30 text-foreground transition-all">
                  + {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
