import { useState, useRef, useEffect } from "react";
import { Bell, Trash2, ExternalLink, AlarmClockOff, Zap, ArrowUp } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, snoozeNotification } = useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const recent = notifications.slice(0, 8);

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const typeColors: Record<string, string> = {
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    error: "bg-destructive/15 text-destructive",
  };

  const handleSnooze = async (id: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60000);
    await snoozeNotification(id, until);
    toast.success(`Snoozed for ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-muted-foreground hover:bg-primary/8 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 max-h-[28rem] rounded-xl border border-border bg-card shadow-xl z-50 animate-fade-in flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">{t("recent_notifications")}</h3>
            {unreadCount > 0 && (
              <button onClick={() => markAllAsRead()} className="text-xs text-primary hover:underline font-medium">
                {t("mark_all_read")}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">{t("no_notifications")}</div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-primary/5 transition-colors cursor-pointer",
                    !n.read && "bg-primary/3"
                  )}
                  onClick={() => { if (!n.read) markAsRead(n.id); }}
                >
                  <div className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", !n.read ? "bg-primary" : "bg-transparent")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", typeColors[n.type] || typeColors.info)}>
                        {n.type}
                      </span>
                      {n.priority === "urgent" && <Zap className="h-3 w-3 text-destructive" />}
                      {n.priority === "high" && <ArrowUp className="h-3 w-3 text-warning" />}
                      {n.module && <span className="text-[10px] text-muted-foreground capitalize">{n.module}</span>}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5 truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{getTimeAgo(n.created_at)}</span>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 self-start">
                    <div className="relative group">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-muted-foreground hover:text-muted-foreground/80 transition-colors"
                        title="Snooze"
                      >
                        <AlarmClockOff className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 hidden group-hover:block min-w-[100px]">
                        {[15, 30, 60, 1440].map((m) => (
                          <button
                            key={m}
                            onClick={(e) => { e.stopPropagation(); handleSnooze(n.id, m); }}
                            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                          >
                            {m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : "1 day"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); navigate("/notifications"); }}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-full justify-center"
            >
              View all notifications <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
