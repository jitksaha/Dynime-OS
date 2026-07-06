import { Star, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface FavoritesSidebarWidgetProps {
  collapsed?: boolean;
}

export function FavoritesSidebarWidget({ collapsed = false }: FavoritesSidebarWidgetProps) {
  const { favorites, removeFavorite } = useFavorites();

  if (favorites.length === 0) return null;

  return (
    <div className="px-2 py-2">
      {!collapsed && (
        <div className="flex items-center gap-1.5 px-3 mb-1.5">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pinned</span>
        </div>
      )}
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {favorites.slice(0, collapsed ? 5 : 10).map((fav) => (
            <motion.div
              key={fav.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <NavLink
                to={fav.item_path}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{fav.item_label}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFavorite(fav.item_path);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
