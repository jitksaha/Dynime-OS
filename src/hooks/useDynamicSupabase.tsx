import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/db";
import { useEffect, useState, useCallback } from "react";

interface ExternalDbConfig {
  enabled: boolean;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  label: string;
}

let cachedExternalClient: SupabaseClient | null = null;
let cachedConfig: ExternalDbConfig | null = null;

/**
 * Hook that returns either the default Supabase client or a dynamic external one
 * based on the admin-configured `external_db_connection` setting.
 *
 * Usage:
 *   const { client, isExternal, label, refresh } = useDynamicSupabase();
 *   // Use `client` instead of `supabase` for data queries
 */
export function useDynamicSupabase() {
  const [externalConfig, setExternalConfig] = useState<ExternalDbConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "external_db_connection")
        .maybeSingle();

      const cfg = data?.value as unknown as ExternalDbConfig | null;
      cachedConfig = cfg;
      setExternalConfig(cfg);

      if (cfg?.enabled && cfg.supabase_url && cfg.supabase_anon_key) {
        cachedExternalClient = createClient(cfg.supabase_url, cfg.supabase_anon_key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } else {
        cachedExternalClient = null;
      }
    } catch {
      cachedExternalClient = null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedConfig) fetchConfig();
  }, [fetchConfig]);

  const isExternal = externalConfig?.enabled && !!cachedExternalClient;

  return {
    /** The active Supabase client (external if configured, otherwise default) */
    client: isExternal ? cachedExternalClient! : supabase,
    /** Whether we're using an external database */
    isExternal: !!isExternal,
    /** Human-readable label for the active connection */
    label: isExternal ? externalConfig?.label || "External DB" : "Cloud",
    /** Reload the config (e.g. after admin changes settings) */
    refresh: fetchConfig,
    /** True while initial config is loading */
    loading,
    /** Raw config for installer generator use */
    config: externalConfig,
  };
}

/**
 * Get external DB config synchronously (for installer generator).
 * Must call after useDynamicSupabase has loaded.
 */
export function getExternalDbConfig(): ExternalDbConfig | null {
  return cachedConfig;
}
