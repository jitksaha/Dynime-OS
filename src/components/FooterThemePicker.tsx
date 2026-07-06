import { useColorTheme, COLOR_THEMES } from "@/hooks/use-color-theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function FooterThemePicker() {
  const { colorTheme, setColorTheme } = useColorTheme();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Theme</span>
        {COLOR_THEMES.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setColorTheme(t.id)}
                className={cn(
                  "relative h-4 w-4 rounded-full border-2 transition-all duration-200 hover:scale-125",
                  colorTheme === t.id
                    ? "border-foreground scale-110 ring-2 ring-primary/30"
                    : "border-border hover:border-foreground/40"
                )}
                aria-label={t.name}
              >
                {t.isGlass ? (
                  <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-400/60 via-purple-300/40 to-pink-300/50" />
                ) : (
                  <div className="h-full w-full rounded-full" style={{ background: t.preview.primary }} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
              {t.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
