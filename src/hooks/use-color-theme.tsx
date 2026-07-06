import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";

export type ColorThemeId = "indigo" | "teal" | "rose" | "amber" | "emerald" | "liquid-glass";

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
  preview: { primary: string; accent: string; bg: string };
  isGlass?: boolean;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "indigo",
    name: "Midnight Pulse",
    description: "Deep electric indigo with cosmic energy",
    preview: { primary: "#6366f1", accent: "#818cf8", bg: "#f8fafc" },
  },
  {
    id: "teal",
    name: "Arctic Wave",
    description: "Cool ocean breeze, calm & collected",
    preview: { primary: "#0d9488", accent: "#2dd4bf", bg: "#f0fdfa" },
  },
  {
    id: "rose",
    name: "Neon Bloom",
    description: "Vibrant coral fire, bold & fearless",
    preview: { primary: "#e11d48", accent: "#fb7185", bg: "#fff1f2" },
  },
  {
    id: "amber",
    name: "Solar Flare",
    description: "Warm golden radiance, rich & luxurious",
    preview: { primary: "#d97706", accent: "#fbbf24", bg: "#fffbeb" },
  },
  {
    id: "emerald",
    name: "Jade Forest",
    description: "Lush emerald canopy, fresh & alive",
    preview: { primary: "#059669", accent: "#34d399", bg: "#ecfdf5" },
  },
  {
    id: "liquid-glass",
    name: "Liquid Glass",
    description: "iOS-inspired translucent frost",
    preview: { primary: "#6366f1", accent: "#a78bfa", bg: "#f1f0ff" },
    isGlass: true,
  },
];

interface ColorThemeContextType {
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
  themes: ColorTheme[];
}

const ColorThemeContext = createContext<ColorThemeContextType>({
  colorTheme: "indigo",
  setColorTheme: () => {},
  themes: COLOR_THEMES,
});

function applyColorTheme(id: ColorThemeId) {
  const root = document.documentElement;
  // Remove all theme classes
  COLOR_THEMES.forEach((t) => root.classList.remove(`color-theme-${t.id}`));
  // Add selected
  root.classList.add(`color-theme-${id}`);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("b360-color-theme") as ColorThemeId) || "indigo";
    }
    return "indigo";
  });

  // Load platform default theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("b360-color-theme");
    if (stored) return; // user already chose
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "default_color_theme")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const val = typeof data.value === "string" ? data.value : (data.value as any)?.theme;
          if (val && COLOR_THEMES.some((t) => t.id === val)) {
            setColorThemeState(val as ColorThemeId);
            applyColorTheme(val as ColorThemeId);
          }
        }
      });
  }, []);

  useEffect(() => {
    applyColorTheme(colorTheme);
  }, [colorTheme]);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    setColorThemeState(id);
    localStorage.setItem("b360-color-theme", id);
    applyColorTheme(id);
  }, []);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme, themes: COLOR_THEMES }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export const useColorTheme = () => useContext(ColorThemeContext);
