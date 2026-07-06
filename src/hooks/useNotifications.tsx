// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  module: string | null;
  read: boolean;
  created_at: string;
  tenant_id: string | null;
  priority: string;
  snoozed_until: string | null;
  group_key: string | null;
}

export interface NotificationGroup {
  key: string;
  label: string;
  notifications: Notification[];
  unreadCount: number;
}

export function useNotifications() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // Fetch notifications scoped to user: either user-specific OR tenant-scoped
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data } = await query;
    if (data) {
      // Filter out snoozed notifications
      const now = new Date().toISOString();
      const visible = (data as Notification[]).filter(
        (n) => !n.snoozed_until || n.snoozed_until <= now
      );
      setNotifications(visible);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}-${Math.random().toString(36).slice(2, 9)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (!newNotif.snoozed_until || newNotif.snoozed_until <= new Date().toISOString()) {
            setNotifications((prev) => [newNotif, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const bulkDelete = async (ids: string[]) => {
    await supabase.from("notifications").delete().in("id", ids);
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
  };

  const bulkMarkAsRead = async (ids: string[]) => {
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    );
  };

  const snoozeNotification = async (id: string, until: Date) => {
    const snoozed_until = until.toISOString();
    await supabase
      .from("notifications")
      .update({ snoozed_until } as any)
      .eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Group notifications by group_key or module
  const grouped: NotificationGroup[] = (() => {
    const groups = new Map<string, Notification[]>();
    notifications.forEach((n) => {
      const key = n.group_key || n.module || "general";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    });
    return Array.from(groups.entries()).map(([key, notifs]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      notifications: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    }));
  })();

  // Sort by priority
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedNotifications = [...notifications].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications: sortedNotifications,
    grouped,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkDelete,
    bulkMarkAsRead,
    snoozeNotification,
    refetch: fetchNotifications,
  };
}
