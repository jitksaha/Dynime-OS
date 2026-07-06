// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export interface FavoriteItem {
  id: string;
  item_type: string;
  item_id: string | null;
  item_label: string;
  item_path: string;
  item_icon: string | null;
  position: number;
}

export function useFavorites() {
  const { user, profile } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    if (data) setFavorites(data as FavoriteItem[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = async (item: {
    item_type: string;
    item_id?: string;
    item_label: string;
    item_path: string;
    item_icon?: string;
  }) => {
    if (!user) return;
    const position = favorites.length;
    const { data, error } = await supabase
      .from("user_favorites")
      .insert({
        user_id: user.id,
        tenant_id: profile?.tenant_id || null,
        item_type: item.item_type,
        item_id: item.item_id || null,
        item_label: item.item_label,
        item_path: item.item_path,
        item_icon: item.item_icon || null,
        position,
      } as any)
      .select()
      .single();
    if (data) setFavorites((prev) => [...prev, data as FavoriteItem]);
    return !error;
  };

  const removeFavorite = async (path: string) => {
    if (!user) return;
    await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("item_path", path);
    setFavorites((prev) => prev.filter((f) => f.item_path !== path));
  };

  const isFavorite = (path: string) => favorites.some((f) => f.item_path === path);

  const toggleFavorite = async (item: {
    item_type: string;
    item_id?: string;
    item_label: string;
    item_path: string;
    item_icon?: string;
  }) => {
    if (isFavorite(item.item_path)) {
      await removeFavorite(item.item_path);
    } else {
      await addFavorite(item);
    }
  };

  return { favorites, loading, addFavorite, removeFavorite, isFavorite, toggleFavorite, refetch: fetchFavorites };
}
