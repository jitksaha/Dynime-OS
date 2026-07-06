// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

interface ThemeScheduleConfig {
  enabled: boolean;
  darkStart: string; // "HH:MM"
  darkEnd: string;   // "HH:MM"
}

export function useThemeSchedule() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [config, setConfig] = useState<ThemeScheduleConfig>({
    enabled: false,
    darkStart: "18:00",
    darkEnd: "06:00",
  });

  // Load preferences
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig({
            enabled: (data as any).theme_schedule_enabled || false,
            darkStart: (data as any).theme_dark_start || "18:00",
            darkEnd: (data as any).theme_dark_end || "06:00",
          });
        }
      });
  }, [user?.id]);

  // Auto-switch based on schedule
  useEffect(() => {
    if (!config.enabled) return;

    const check = () => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();
      const currentTime = hours * 60 + mins;

      const [dh, dm] = config.darkStart.split(":").map(Number);
      const [lh, lm] = config.darkEnd.split(":").map(Number);
      const darkStart = dh * 60 + dm;
      const darkEnd = lh * 60 + lm;

      let shouldBeDark: boolean;
      if (darkStart < darkEnd) {
        shouldBeDark = currentTime >= darkStart && currentTime < darkEnd;
      } else {
        shouldBeDark = currentTime >= darkStart || currentTime < darkEnd;
      }

      if (shouldBeDark && theme === "light") {
        toggleTheme();
      } else if (!shouldBeDark && theme === "dark") {
        toggleTheme();
      }
    };

    check();
    const interval = setInterval(check, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [config, theme, toggleTheme]);

  const updateSchedule = async (updates: Partial<ThemeScheduleConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    if (!user) return;
    await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        theme_schedule_enabled: newConfig.enabled,
        theme_dark_start: newConfig.darkStart,
        theme_dark_end: newConfig.darkEnd,
      } as any,
      { onConflict: "user_id" }
    );
  };

  return { config, updateSchedule };
}
