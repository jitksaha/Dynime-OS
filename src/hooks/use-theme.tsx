import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "light", toggleTheme: () => {} });

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  localStorage.setItem("b360-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("b360-theme") as Theme) || "light";
    }
    return "light";
  });

  useEffect(() => {
    applyThemeClass(theme);
  }, []);

  const toggleTheme = useCallback((e?: React.MouseEvent) => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";

    // Get click coordinates (default to top-right corner)
    const x = e?.clientX ?? window.innerWidth - 40;
    const y = e?.clientY ?? 28;

    // Calculate the max radius needed to cover the entire page from (x, y)
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        setTheme(nextTheme);
        applyThemeClass(nextTheme);
      });

      // Set CSS custom properties for the animation origin
      document.documentElement.style.setProperty("--theme-toggle-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-toggle-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-toggle-radius", `${maxRadius}px`);
    } else {
      setTheme(nextTheme);
      applyThemeClass(nextTheme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
