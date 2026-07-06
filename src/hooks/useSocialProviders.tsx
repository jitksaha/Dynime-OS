// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/db";

interface SocialProvider {
  provider_key: string;
  provider_name: string;
  is_enabled: boolean;
}

export function useSocialProviders() {
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("social_signin_providers")
        .select("provider_key, provider_name, is_enabled")
        .eq("is_enabled", true)
        .in("provider_key", ["google", "apple"]);

      setProviders((data as SocialProvider[]) || []);
      setLoading(false);
    })();
  }, []);

  const initiateOAuth = async (providerKey: string) => {
    const redirectUri = `${window.location.origin}/auth/oauth-callback`;

    const { data, error } = await supabase.functions.invoke("social-oauth-init", {
      body: { provider_key: providerKey, redirect_uri: redirectUri },
    });

    if (error || data?.error) {
      throw new Error(data?.error || error?.message || "Failed to initiate sign-in");
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  return { providers, loading, initiateOAuth };
}
