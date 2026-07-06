import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
  business_hours: string;
  whatsapp: string;
  support_email: string;
  sales_email: string;
}

const FALLBACK: ContactInfo = {
  email: "support@dynime.com",
  phone: "+880 1700-000000",
  address: "Dhaka, Bangladesh",
  business_hours: "Sun-Thu, 9AM-6PM",
  whatsapp: "",
  support_email: "support@dynime.com",
  sales_email: "sales@dynime.com",
};

let cachedInfo: ContactInfo | null = null;
let fetchPromise: Promise<ContactInfo> | null = null;

async function fetchContactInfo(): Promise<ContactInfo> {
  if (cachedInfo) return cachedInfo;
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "contact_info")
        .single();
      cachedInfo = data?.value ? { ...FALLBACK, ...(data.value as unknown as ContactInfo) } : FALLBACK;
      return cachedInfo;
    } catch {
      return FALLBACK;
    }
  })();
  return fetchPromise;
}

/** Invalidate cache so next mount re-fetches */
export function invalidateContactInfoCache() {
  cachedInfo = null;
  fetchPromise = null;
}

// Global listeners for real-time updates
const listeners = new Set<(info: ContactInfo) => void>();
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function ensureRealtimeChannel() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel("contact-info-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "site_settings",
        filter: "key=eq.contact_info",
      },
      (payload) => {
        const newVal = (payload.new as any)?.value;
        if (newVal) {
          cachedInfo = { ...FALLBACK, ...newVal };
          listeners.forEach((fn) => fn(cachedInfo!));
        }
      }
    )
    .subscribe();
}

export function useContactInfo() {
  const [info, setInfo] = useState<ContactInfo>(cachedInfo || FALLBACK);
  const [loading, setLoading] = useState(!cachedInfo);

  useEffect(() => {
    fetchContactInfo().then((c) => {
      setInfo(c);
      setLoading(false);
    });

    // Subscribe to real-time updates
    ensureRealtimeChannel();
    const handler = (updated: ContactInfo) => setInfo(updated);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return { contact: info, loading };
}
