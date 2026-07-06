import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";

export interface SocialMediaLink {
  platform: string;
  url: string;
  icon: string;
  enabled: boolean;
}

const DEFAULTS: SocialMediaLink[] = [];

let cached: SocialMediaLink[] | null = null;

export function useSocialMediaLinks() {
  const [links, setLinks] = useState<SocialMediaLink[]>(cached || DEFAULTS);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    (async () => {
      if (cached) { setLinks(cached); setLoading(false); return; }
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "social_media_links")
        .single();
      const parsed = (data?.value as unknown as SocialMediaLink[]) || DEFAULTS;
      cached = parsed;
      setLinks(parsed);
      setLoading(false);
    })();

    const channel = supabase
      .channel("social-media-links")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "platform_settings",
        filter: "key=eq.social_media_links",
      }, (payload: any) => {
        const val = payload.new?.value as unknown as SocialMediaLink[];
        if (val) { cached = val; setLinks(val); }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const enabledLinks = links.filter(l => l.enabled && l.url && l.url !== "#");

  return { links, enabledLinks, loading };
}
