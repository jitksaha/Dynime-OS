import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export function useSidebarOrder(sidebarKey: string, defaultOrder: string[]) {
  const { user } = useAuth();
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("user_sidebar_preferences")
        .select("item_order")
        .eq("user_id", user.id)
        .eq("sidebar_key", sidebarKey)
        .maybeSingle();

      if (data?.item_order && data.item_order.length > 0) {
        // Merge: keep saved order for known items, but inject new items at their
        // default position (so newly added menu items appear in the intended slot)
        const saved = (data.item_order as string[]).filter((id) => defaultOrder.includes(id));
        const savedSet = new Set(saved);
        const merged: string[] = [...saved];
        defaultOrder.forEach((id, idx) => {
          if (savedSet.has(id)) return;
          // Find the nearest preceding default item that is in saved order
          let insertAt = merged.length;
          for (let i = idx - 1; i >= 0; i--) {
            const prevId = defaultOrder[i];
            const prevPos = merged.indexOf(prevId);
            if (prevPos !== -1) {
              insertAt = prevPos + 1;
              break;
            }
          }
          merged.splice(insertAt, 0, id);
          savedSet.add(id);
        });
        setOrder(merged);
      }
      setLoaded(true);
    };
    fetch();
  }, [user?.id, sidebarKey]);

  const saveOrder = useCallback(
    async (newOrder: string[]) => {
      if (!user) return;
      setOrder(newOrder);
      await supabase
        .from("user_sidebar_preferences")
        .upsert(
          { user_id: user.id, sidebar_key: sidebarKey, item_order: newOrder, updated_at: new Date().toISOString() },
          { onConflict: "user_id,sidebar_key" }
        );
    },
    [user?.id, sidebarKey]
  );

  return { order, saveOrder, loaded };
}
