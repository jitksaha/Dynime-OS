import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/db";

interface AppInfo {
  app_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  favicon_url: string;
  site_url: string;
}

import dynimeLogoDefault from "@/assets/dynime-logo.png";

const defaultAppInfo: AppInfo = {
  app_name: "Dynime",
  tagline: "Simplify Growth Execution",
  description: "All-in-one business management platform",
  logo_url: dynimeLogoDefault,
  favicon_url: "",
  site_url: "",
};

const AppInfoContext = createContext<{ appInfo: AppInfo; loading: boolean; refetch: () => void }>({
  appInfo: defaultAppInfo,
  loading: true,
  refetch: () => {},
});

export function AppInfoProvider({ children }: { children: ReactNode }) {
  const [appInfo, setAppInfo] = useState<AppInfo>(defaultAppInfo);
  const [loading, setLoading] = useState(true);

  const fetchAppInfo = useCallback(async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "app_info")
      .maybeSingle();

    if (data?.value) {
      setAppInfo({ ...defaultAppInfo, ...(data.value as any) });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppInfo();
  }, [fetchAppInfo]);

  // Subscribe to realtime changes on platform_settings for app_info
  useEffect(() => {
    const channel = supabase
      .channel("app-info-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_settings",
          filter: "key=eq.app_info",
        },
        (payload) => {
          const newVal = (payload.new as any)?.value;
          if (newVal) {
            setAppInfo({ ...defaultAppInfo, ...newVal });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update document title & favicon dynamically
  useEffect(() => {
    if (!loading && appInfo.app_name) {
      const titleEl = document.querySelector("title");
      if (titleEl && !titleEl.textContent?.includes(" - ")) {
        titleEl.textContent = appInfo.app_name;
      }
    }
    if (!loading && appInfo.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = appInfo.favicon_url;
    }
  }, [loading, appInfo]);

  // Auto-sync public hosted URL (no manual admin input needed)
  const siteUrlSynced = useRef(false);
  useEffect(() => {
    if (loading || siteUrlSynced.current || typeof window === "undefined") return;

    const host = window.location.hostname.toLowerCase();
    const isPreviewHost = host.includes("preview--");
    const isLocal = host === "localhost" || host === "127.0.0.1";

    if (isPreviewHost || isLocal) return;

    const normalizedOrigin = window.location.origin.replace(/\/+$/, "");
    const currentSiteUrl = (appInfo.site_url || "").replace(/\/+$/, "");
    if (!normalizedOrigin || normalizedOrigin === currentSiteUrl) return;

    siteUrlSynced.current = true;
    const nextInfo = { ...appInfo, site_url: normalizedOrigin };
    setAppInfo(nextInfo);

    supabase
      .from("platform_settings")
      .upsert(
        { key: "app_info", value: nextInfo as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
  }, [loading, appInfo]);

  return (
    <AppInfoContext.Provider value={{ appInfo, loading, refetch: fetchAppInfo }}>
      {children}
    </AppInfoContext.Provider>
  );
}

export function useAppInfo() {
  return useContext(AppInfoContext);
}
