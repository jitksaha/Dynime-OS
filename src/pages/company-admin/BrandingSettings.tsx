import { useState, useEffect } from "react";
import { Palette, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

interface Branding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
  custom_css: string;
  font_family: string;
}

const FONTS = ["Inter", "Comfortaa", "Poppins", "Roboto", "Open Sans", "Lato", "Montserrat", "Nunito", "Raleway", "Source Sans Pro"];

const DEFAULT_BRANDING: Branding = {
  primary_color: "#6366f1",
  secondary_color: "#8b5cf6",
  accent_color: "#f59e0b",
  logo_url: "",
  favicon_url: "",
  custom_css: "",
  font_family: "Inter",
};

export default function BrandingSettings() {
  const { tenantId, supabase } = useTenant();
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      const { data } = await supabase.from("tenant_branding").select("*").eq("tenant_id", tenantId).maybeSingle();
      if (data) {
        setBranding({
          primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
          accent_color: data.accent_color || DEFAULT_BRANDING.accent_color,
          logo_url: data.logo_url || "",
          favicon_url: data.favicon_url || "",
          custom_css: data.custom_css || "",
          font_family: data.font_family || "Inter",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);

    const { data: existing } = await supabase.from("tenant_branding").select("id").eq("tenant_id", tenantId).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("tenant_branding").update({ ...branding }).eq("tenant_id", tenantId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("tenant_branding").insert({ tenant_id: tenantId, ...branding });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success("Branding saved successfully");
    setSaving(false);
  };

  const handleReset = () => setBranding(DEFAULT_BRANDING);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">White-Label Branding</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize your company's look and feel</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-card text-sm font-medium hover:bg-secondary">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colors */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Brand Colors</h2>
          {[
            { label: "Primary Color", key: "primary_color" as const },
            { label: "Secondary Color", key: "secondary_color" as const },
            { label: "Accent Color", key: "accent_color" as const },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={branding[key]}
                onChange={(e) => setBranding({ ...branding, [key]: e.target.value })}
                className="h-10 w-14 rounded-lg border border-input cursor-pointer"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground">{label}</label>
                <input
                  value={branding[key]}
                  onChange={(e) => setBranding({ ...branding, [key]: e.target.value })}
                  className="text-xs text-muted-foreground mt-0.5 w-24 bg-transparent border-none outline-none"
                />
              </div>
              <div className="h-8 w-16 rounded-lg" style={{ backgroundColor: branding[key] }} />
            </div>
          ))}
        </div>

        {/* Typography */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Typography</h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Font Family</label>
            <select
              value={branding.font_family}
              onChange={(e) => setBranding({ ...branding, font_family: e.target.value })}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30" style={{ fontFamily: branding.font_family }}>
            <p className="text-lg font-bold text-foreground">Preview Text</p>
            <p className="text-sm text-muted-foreground mt-1">The quick brown fox jumps over the lazy dog.</p>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Logo & Favicon</h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Logo URL</label>
            <input
              value={branding.logo_url}
              onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Favicon URL</label>
            <input
              value={branding.favicon_url}
              onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
              placeholder="https://example.com/favicon.ico"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          {branding.logo_url && (
            <div className="p-4 bg-secondary/30 rounded-lg flex items-center justify-center">
              <img src={branding.logo_url} alt="Logo preview" className="max-h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </div>

        {/* Custom CSS */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Custom CSS</h2>
          <textarea
            value={branding.custom_css}
            onChange={(e) => setBranding({ ...branding, custom_css: e.target.value })}
            placeholder={`:root {\n  --primary: 240 5.9% 10%;\n}`}
            rows={8}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Live Preview</h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ fontFamily: branding.font_family }}>
          <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: branding.primary_color }}>
            {branding.logo_url && <img src={branding.logo_url} alt="" className="h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
            <span className="text-sm font-bold text-white">Your Company</span>
          </div>
          <div className="p-6 bg-background space-y-4">
            <h3 className="text-lg font-bold" style={{ color: branding.primary_color }}>Dashboard Overview</h3>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: branding.primary_color }}>Primary Button</button>
              <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: branding.secondary_color }}>Secondary</button>
              <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: branding.accent_color }}>Accent</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
