import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Bell, Search, UserCircle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { key: "notifications", icon: Bell, path: "/notifications" },
  { key: "search", icon: Search, path: null },
  { key: "profile", icon: UserCircle, path: "/settings" },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();

  const handleClick = (item: typeof navItems[0]) => {
    if (item.key === "search") {
      const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
      document.dispatchEvent(event);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = item.path ? location.pathname === item.path || location.pathname.startsWith(item.path + "/") : false;
          return (
            <button
              key={item.key}
              onClick={() => handleClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.key === "notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{t(item.key)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
