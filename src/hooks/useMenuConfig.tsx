// @ts-nocheck
import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export interface MenuItemConfig {
  id: string;
  label: string;
  path: string;
  icon: string;
  visible: boolean;
  order: number;
  children?: MenuItemConfig[];
  isCustom?: boolean;
}

interface MenuConfigContextType {
  configs: Record<string, MenuItemConfig[]>;
  loading: boolean;
  refetch: () => void;
}

const MenuConfigContext = createContext<MenuConfigContextType>({
  configs: {},
  loading: true,
  refetch: () => {},
});

export function MenuConfigProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<Record<string, MenuItemConfig[]>>({});
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchConfigs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("sidebar_menu_configs")
        .select("portal_type, menu_items");

      if (error) {
        console.error("Menu config fetch error:", error);
        setLoading(false);
        return;
      }

      const map: Record<string, MenuItemConfig[]> = {};
      for (const row of data || []) {
        const items = row.menu_items as unknown as MenuItemConfig[];
        if (Array.isArray(items) && items.length > 0) {
          map[row.portal_type] = items;
        }
      }
      setConfigs(map);
      fetchedRef.current = true;
    } catch (err) {
      console.error("Menu config exception:", err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const refetch = useCallback(() => {
    fetchedRef.current = false;
    fetchConfigs();
  }, [fetchConfigs]);

  return (
    <MenuConfigContext.Provider value={{ configs, loading, refetch }}>
      {children}
    </MenuConfigContext.Provider>
  );
}

export const useMenuConfig = () => useContext(MenuConfigContext);

/**
 * Merges default nav items with dynamic config from super admin.
 * If config is empty (not customized yet), returns defaults as-is.
 * If config exists, applies visibility, order, label overrides, and adds custom items.
 */
export function mergeMenuItems<T extends { id: string; label: string }>(
  defaults: T[],
  config: MenuItemConfig[] | undefined
): (T & { visible: boolean })[] {
  if (!config || config.length === 0) {
    return defaults.map((d) => ({ ...d, visible: true }));
  }

  const configMap = new Map(config.map((c) => [c.id, c]));
  const result: (T & { visible: boolean; order: number; label: string })[] = [];

  // Process items from config (preserves order)
  for (const cfg of config) {
    const defaultItem = defaults.find((d) => d.id === cfg.id);
    if (defaultItem) {
      result.push({
        ...defaultItem,
        label: cfg.label || defaultItem.label,
        visible: cfg.visible !== false,
        order: cfg.order,
      });
    } else if (cfg.isCustom) {
      // Custom item added by super admin — cast to T shape
      result.push({
        id: cfg.id,
        label: cfg.label,
        path: cfg.path,
        icon: cfg.icon,
        visible: cfg.visible !== false,
        order: cfg.order,
      } as any);
    }
  }

  // Add any new defaults not in config
  for (const d of defaults) {
    if (!configMap.has(d.id)) {
      result.push({ ...d, visible: true, order: result.length });
    }
  }

  result.sort((a, b) => a.order - b.order);
  return result;
}
