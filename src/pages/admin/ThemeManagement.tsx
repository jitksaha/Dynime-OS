import { useState, useEffect } from "react";
import { Palette, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import { COLOR_THEMES, type ColorThemeId } from "@/hooks/use-color-theme";
import { ColorThemePicker } from "@/components/ColorThemePicker";

export default function ThemeManagement() {
  const [platformDefault, setPlatformDefault] = useState<ColorThemeId>("indigo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "default_color_theme")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const val = typeof data.value === "string" ? data.value : (data.value as any)?.theme;
          if (val && COLOR_THEMES.some((t) => t.id === val)) {
            setPlatformDefault(val as ColorThemeId);
          }
        }
        setLoading(false);
      });
  }, []);

  const saveDefault = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        {
          key: "default_color_theme",
          value: { theme: platformDefault } as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) toast.error("Failed to save default theme");
    else toast.success("Platform default theme updated! New users will see this theme.");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Theme Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set the default color theme for the platform. Users can override this in their own settings.
        </p>
      </div>

      {/* Current platform default */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Platform Default Theme</h2>
            <p className="text-xs text-muted-foreground">
              This theme is applied to new visitors and users who haven't chosen their own theme.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setPlatformDefault(t.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                platformDefault === t.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {t.isGlass ? (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-400/50 via-purple-300/30 to-pink-300/40 border border-white/40" />
                ) : (
                  <div className="h-8 w-8 rounded-lg" style={{ background: t.preview.primary }} />
                )}
                {platformDefault === t.id && (
                  <span className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          ))}
        </div>

        <button
          onClick={saveDefault}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save as Platform Default"}
        </button>
      </div>

      {/* Live preview */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Live Preview</h2>
        <p className="text-xs text-muted-foreground">
          Select a theme below to preview it on this page. This only changes your own view.
        </p>
        <ColorThemePicker />
      </div>
    </div>
  );
}
