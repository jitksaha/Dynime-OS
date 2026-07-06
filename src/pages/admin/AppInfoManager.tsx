import { useState, useEffect } from "react";
import { Save, Upload, Globe, Type, FileText, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AppInfo {
  app_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  favicon_url: string;
  site_url: string;
}

const defaultInfo: AppInfo = {
  app_name: "Dynime",
  tagline: "Simplify Growth Execution",
  description: "All-in-one business management platform",
  logo_url: "",
  favicon_url: "",
  site_url: "",
};

export default function AppInfoManager() {
  const [info, setInfo] = useState<AppInfo>(defaultInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "app_info")
        .maybeSingle();
      if (data?.value) setInfo({ ...defaultInfo, ...(data.value as any) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        { key: "app_info", value: info as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) toast.error("Failed to save app info");
    else toast.success("App information updated! Changes reflect across the platform.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "favicon_url") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }

    setUploading(field);
    const ext = file.name.split(".").pop();
    const path = `app-branding/${field}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("mobile-app-assets")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error("Upload failed: " + uploadErr.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("mobile-app-assets").getPublicUrl(path);
    setInfo((prev) => ({ ...prev, [field]: urlData.publicUrl }));
    setUploading(null);
    toast.success("Image uploaded!");
  };

  const update = (field: keyof AppInfo, value: string) =>
    setInfo((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-xl sm:text-2xl font-bold text-foreground">App Information</h1></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">App Information</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your platform's identity — name, tagline, description &amp; logo. Changes apply globally.
        </p>
      </div>

      {/* Live Preview */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</h2>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border">
          {info.logo_url ? (
            <img src={info.logo_url} alt="App Logo" className="h-12 w-12 rounded-xl object-contain bg-secondary" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-extrabold font-brand text-foreground">{info.app_name || "App Name"}</h3>
            <p className="text-sm text-muted-foreground">{info.tagline || "Your tagline here"}</p>
          </div>
        </div>
      </div>

      {/* App Name */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Type className="h-4 w-4 text-primary" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Application Name</h2>
            <p className="text-xs text-muted-foreground">The brand name displayed across headers, emails &amp; documents.</p>
          </div>
        </div>
        <Input value={info.app_name} onChange={(e) => update("app_name", e.target.value)} placeholder="e.g. Dynime" />
      </div>

      {/* Tagline */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10"><FileText className="h-4 w-4 text-accent-foreground" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tagline</h2>
            <p className="text-xs text-muted-foreground">Short motto shown on login, landing pages &amp; meta tags.</p>
          </div>
        </div>
        <Input value={info.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="e.g. Simplify Growth Execution" />
      </div>

      {/* Description */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary"><FileText className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="text-xs text-muted-foreground">Used in SEO meta, API docs &amp; about pages.</p>
          </div>
        </div>
        <Textarea
          value={info.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Describe your platform..."
          rows={3}
        />
      </div>

      {/* Site URL */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Globe className="h-4 w-4 text-primary" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Site URL</h2>
            <p className="text-xs text-muted-foreground">Your platform's public domain (e.g. https://yourdomain.com). Used for referral links, emails &amp; sharing.</p>
          </div>
        </div>
        <Input value={info.site_url} onChange={(e) => update("site_url", e.target.value)} placeholder="https://yourdomain.com" />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Image className="h-4 w-4 text-primary" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">App Logo</h2>
            <p className="text-xs text-muted-foreground">Displayed in sidebar, navbar &amp; emails. Recommended 512×512 PNG.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {info.logo_url ? (
            <img src={info.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-contain border border-border bg-background" />
          ) : (
            <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <Label className="text-xs text-muted-foreground">Upload Image (max 2MB)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "logo_url")}
              disabled={uploading === "logo_url"}
              className="text-xs"
            />
            {uploading === "logo_url" && <p className="text-xs text-muted-foreground animate-pulse">Uploading...</p>}
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Or paste a URL</Label>
          <Input value={info.logo_url} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
      </div>

      {/* Favicon Upload */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Globe className="h-4 w-4 text-warning" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Favicon</h2>
            <p className="text-xs text-muted-foreground">Browser tab icon. Recommended 32×32 or 64×64 PNG/ICO.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {info.favicon_url ? (
            <img src={info.favicon_url} alt="Favicon" className="h-10 w-10 rounded-lg object-contain border border-border bg-background" />
          ) : (
            <div className="h-10 w-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "favicon_url")}
              disabled={uploading === "favicon_url"}
              className="text-xs"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Or paste a URL</Label>
          <Input value={info.favicon_url} onChange={(e) => update("favicon_url", e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save App Information"}
      </button>
    </div>
  );
}
