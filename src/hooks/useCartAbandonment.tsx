// @ts-nocheck
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook to track cart abandonment. Call `trackCartView` when user
 * enters the checkout page. Call `clearCart` when purchase completes.
 * If user leaves without completing, it auto-saves as abandoned.
 */
export function useCartAbandonment() {
  const { user } = useAuth();
  const cartRef = useRef<{
    id?: string;
    item_name: string;
    cart_type: string;
    amount: number;
    currency: string;
    plan_id?: string;
    billing_cycle?: string;
    addon_id?: string;
    description?: string;
    metadata?: any;
  } | null>(null);
  const savedRef = useRef(false);

  const saveAbandonment = useCallback(async () => {
    if (!user || !cartRef.current || savedRef.current) return;
    savedRef.current = true;
    try {
      const payload: any = {
        user_id: user.id,
        cart_type: cartRef.current.cart_type,
        item_name: cartRef.current.item_name,
        item_description: cartRef.current.description || null,
        plan_id: cartRef.current.plan_id || null,
        billing_cycle: cartRef.current.billing_cycle || null,
        addon_id: cartRef.current.addon_id || null,
        amount: cartRef.current.amount,
        currency: cartRef.current.currency,
        status: "abandoned",
        metadata: cartRef.current.metadata || {},
      };

      if (cartRef.current.id) {
        await supabase.from("abandoned_carts").update(payload).eq("id", cartRef.current.id);
      } else {
        await supabase.from("abandoned_carts").insert(payload);
      }
    } catch (err) {
      console.error("Failed to save abandoned cart:", err);
    }
  }, [user]);

  // When user navigates away or closes tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cartRef.current && !savedRef.current) {
        // Use sendBeacon for reliability
        const payload: any = {
          user_id: user?.id,
          cart_type: cartRef.current.cart_type,
          item_name: cartRef.current.item_name,
          item_description: cartRef.current.description || null,
          amount: cartRef.current.amount,
          currency: cartRef.current.currency,
          status: "abandoned",
          metadata: cartRef.current.metadata || {},
        };
        // Fallback: we'll save on next visit instead
        try {
          localStorage.setItem("pending_abandoned_cart", JSON.stringify(payload));
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Component unmount = user navigated away from checkout
      if (cartRef.current && !savedRef.current) {
        saveAbandonment();
      }
    };
  }, [user, saveAbandonment]);

  // On mount, check for pending abandoned carts from previous session
  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem("pending_abandoned_cart");
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data.user_id === user.id) {
          supabase.from("abandoned_carts").insert(data).then(() => {
            localStorage.removeItem("pending_abandoned_cart");
          });
        } else {
          localStorage.removeItem("pending_abandoned_cart");
        }
      } catch {
        localStorage.removeItem("pending_abandoned_cart");
      }
    }
  }, [user]);

  const trackCartView = useCallback((data: {
    item_name: string;
    cart_type: "subscription" | "addon" | "wallet_topup";
    amount: number;
    currency: string;
    plan_id?: string;
    billing_cycle?: string;
    addon_id?: string;
    description?: string;
    metadata?: any;
  }) => {
    cartRef.current = data;
    savedRef.current = false;
  }, []);

  const clearCart = useCallback(() => {
    savedRef.current = true;
    cartRef.current = null;
    localStorage.removeItem("pending_abandoned_cart");
  }, []);

  const markRecovered = useCallback(async (cartId: string) => {
    savedRef.current = true;
    cartRef.current = null;
    await supabase.from("abandoned_carts").update({
      status: "recovered",
      recovered_at: new Date().toISOString(),
    } as any).eq("id", cartId);
  }, []);

  return { trackCartView, clearCart, markRecovered };
}
