import { useColorTheme, type ColorThemeId } from "@/hooks/use-color-theme";
import { Check, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  compact?: boolean;
  onSelect?: (id: ColorThemeId) => void;
}

export function ColorThemePicker({ compact, onSelect }: Props) {
  const { colorTheme, setColorTheme, themes } = useColorTheme();

  const handleSelect = (id: ColorThemeId) => {
    setColorTheme(id);
    onSelect?.(id);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            title={t.name}
            className={cn(
              "relative h-6 w-6 rounded-full border-2 transition-all duration-200 hover:scale-110",
              colorTheme === t.id
                ? "border-foreground ring-2 ring-foreground/20 scale-110"
                : "border-transparent"
            )}
          >
            {t.isGlass ? (
              <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-400/60 via-purple-300/40 to-pink-300/50 backdrop-blur-sm border border-white/30" />
            ) : (
              <div
                className="h-full w-full rounded-full"
                style={{ background: t.preview.primary }}
              />
            )}
            {colorTheme === t.id && (
              <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => handleSelect(t.id)}
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-200 text-left group hover:shadow-md",
            colorTheme === t.id
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30"
          )}
        >
          {/* Preview swatch */}
          <div className="flex items-center gap-2 mb-3">
            {t.isGlass ? (
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400/50 via-purple-300/30 to-pink-300/40 backdrop-blur-sm border border-white/40 flex items-center justify-center">
                <Droplets className="h-4 w-4 text-indigo-600" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: t.preview.primary }}>
                <div className="h-4 w-4 rounded-full" style={{ background: t.preview.accent, opacity: 0.7 }} />
              </div>
            )}
            {colorTheme === t.id && (
              <span className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>

          {/* Mini preview bar */}
          <div className="flex gap-1 mt-3">
            <div className="h-1.5 flex-1 rounded-full" style={{ background: t.preview.primary }} />
            <div className="h-1.5 w-6 rounded-full" style={{ background: t.preview.accent }} />
            <div className="h-1.5 w-4 rounded-full bg-muted" />
          </div>
        </button>
      ))}
    </div>
  );
}
