import { useState } from "react";
import {
  Bell, CheckCircle2, Clock, AlertCircle, Trash2, CheckCheck, Search,
  AlarmClockOff, ChevronDown, ChevronRight, Zap, ArrowUp, ArrowDown,
} from "lucide-react";
import { useNotifications, type NotificationGroup } from "@/hooks/useNotifications";
import { useBulkSelection, BulkActionsToolbar } from "@/components/BulkActionsToolbar";
import { FeatureTooltip } from "@/components/ContextualTooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  info: { icon: Bell, color: "text-info", bg: "bg-info/10", label: "Info" },
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Success" },
  warning: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Warning" },
  alert: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Alert" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Error" },
};

const priorityConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  urgent: { label: "Urgent", color: "text-destructive bg-destructive/10", icon: Zap },
  high: { label: "High", color: "text-warning bg-warning/10", icon: ArrowUp },
  normal: { label: "Normal", color: "text-muted-foreground bg-muted", icon: ArrowDown },
  low: { label: "Low", color: "text-muted-foreground/50 bg-muted/50", icon: ArrowDown },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const {
    notifications, grouped, loading, unreadCount,
    markAsRead, markAllAsRead, deleteNotification,
    bulkDelete, bulkMarkAsRead, snoozeNotification,
  } = useNotifications();

  const { selectedIds, selectedCount, toggle, selectAll, deselectAll, isSelected, selectedArray } = useBulkSelection();

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["general"]));

  const filtered = notifications.filter((n) => {
    if (filter === "unread" && n.read) return false;
    if (filter === "read" && !n.read) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSnooze = async (id: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60000);
    await snoozeNotification(id, until);
    toast.success(`Snoozed for ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`);
  };

  const renderNotification = (notif: typeof notifications[0], showCheckbox = true) => {
    const cfg = typeConfig[notif.type] || typeConfig.info;
    const pCfg = priorityConfig[notif.priority] || priorityConfig.normal;
    const Icon = cfg.icon;
    const PIcon = pCfg.icon;

    return (
      <div
        key={notif.id}
        className={cn(
          "flex items-start gap-3 p-4 rounded-xl border transition-all",
          notif.read ? "border-border bg-card hover:bg-primary/5" : "border-primary/20 bg-primary/5 hover:bg-primary/10",
          isSelected(notif.id) && "ring-2 ring-primary/40"
        )}
      >
        {showCheckbox && (
          <input
            type="checkbox"
            checked={isSelected(notif.id)}
            onChange={() => toggle(notif.id)}
            className="mt-1 rounded border-border"
          />
        )}
        <div
          className={cn("p-2 rounded-lg shrink-0", cfg.bg)}
          onClick={() => !notif.read && markAsRead(notif.id)}
        >
          <Icon className={cn("h-4 w-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !notif.read && markAsRead(notif.id)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-medium text-foreground">
                  {notif.title}
                  {!notif.read && <span className="inline-block h-2 w-2 rounded-full bg-primary ml-2" />}
                </p>
                {notif.priority !== "normal" && (
                  <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium", pCfg.color)}>
                    <PIcon className="h-2.5 w-2.5" />
                    {pCfg.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Snooze dropdown */}
              <div className="relative group">
                <button
                  className="p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
                  title="Snooze"
                >
                  <AlarmClockOff className="h-3.5 w-3.5" />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 hidden group-hover:block min-w-[120px]">
                  {[15, 30, 60, 240, 1440].map((m) => (
                    <button
                      key={m}
                      onClick={(e) => { e.stopPropagation(); handleSnooze(notif.id, m); }}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                    >
                      {m < 60 ? `${m} minutes` : m < 1440 ? `${m / 60} hours` : "1 day"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {notif.module && <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium">{notif.module}</span>}
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", cfg.bg, cfg.color)}>{cfg.label}</span>
            <span>{timeAgo(notif.created_at)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
          </div>
          <FeatureTooltip feature="bulk_actions" className="mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "flat" ? "grouped" : "flat")}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
          >
            {viewMode === "flat" ? "Group by module" : "Flat view"}
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "unread", "read"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize", filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/10")}>
              {f}
            </button>
          ))}
          <span className="w-px bg-border mx-1" />
          {["all", ...Object.keys(typeConfig)].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize", typeFilter === t ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/10")}>
              {t === "all" ? "All Types" : typeConfig[t]?.label || t}
            </button>
          ))}
          <span className="w-px bg-border mx-1" />
          {["all", "urgent", "high", "normal", "low"].map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize", priorityFilter === p ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/10")}>
              {p === "all" ? "All Priority" : p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{notifications.length === 0 ? "No notifications yet. You'll receive live alerts here." : "No notifications match your filters."}</p>
        </div>
      ) : viewMode === "grouped" ? (
        <div className="space-y-4">
          {grouped
            .filter((g) => g.notifications.some((n) => filtered.includes(n)))
            .map((group) => (
              <div key={group.key} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedGroups.has(group.key) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-semibold text-foreground">{group.label}</span>
                    {group.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{group.unreadCount}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{group.notifications.length} notifications</span>
                </button>
                {expandedGroups.has(group.key) && (
                  <div className="p-3 space-y-2">
                    {group.notifications
                      .filter((n) => filtered.includes(n))
                      .map((n) => renderNotification(n))}
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => renderNotification(notif))}
        </div>
      )}

      <BulkActionsToolbar
        selectedCount={selectedCount}
        totalCount={filtered.length}
        onSelectAll={() => selectAll(filtered as any)}
        onDeselectAll={deselectAll}
        onBulkDelete={async () => {
          await bulkDelete(selectedArray);
          deselectAll();
          toast.success(`Deleted ${selectedArray.length} notifications`);
        }}
        customActions={[
          {
            label: "Mark Read",
            icon: CheckCheck,
            onClick: async () => {
              await bulkMarkAsRead(selectedArray);
              deselectAll();
              toast.success("Marked as read");
            },
          },
        ]}
      />
    </div>
  );
}
