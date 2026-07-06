import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Save, Eye, GripVertical, Copy } from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  visible: boolean;
  type: "link" | "features" | "solutions";
}

interface MenuConfig {
  items: MenuItem[];
}

export default function MenuEditor() {
  const [config, setConfig] = useState<MenuConfig>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<{ title: string; slug: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [settingsRes, pagesRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "menu").single(),
        supabase.from("managed_pages").select("title, slug").eq("status", "published"),
      ]);
      if (settingsRes.data?.value) {
        const raw = settingsRes.data.value as unknown as MenuConfig;
        // Migrate old items that don't have type
        const items = (raw.items || []).map((item: any) => ({
          ...item,
          type: item.type || "link",
        }));
        setConfig({ items });
      }
      setPages((pagesRes.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ value: config as any }).eq("key", "menu");
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Menu saved!");
  };

  const addItem = () => setConfig(c => ({ items: [...c.items, { label: "New Item", href: "/", visible: true, type: "link" }] }));
  const addFeatures = () => setConfig(c => ({ items: [...c.items, { label: "Features", href: "#", visible: true, type: "features" }] }));
  const addSolutions = () => setConfig(c => ({ items: [...c.items, { label: "Solutions", href: "#", visible: true, type: "solutions" }] }));

  const removeItem = (idx: number) => setConfig(c => ({ items: c.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, key: keyof MenuItem, value: any) => {
    setConfig(c => {
      const items = [...c.items];
      items[idx] = { ...items[idx], [key]: value };
      return { items };
    });
  };

  const addFromPage = (page: { title: string; slug: string }) => {
    setConfig(c => ({ items: [...c.items, { label: page.title, href: page.slug, visible: true, type: "link" as const }] }));
    toast.success(`Added "${page.title}" to menu`);
  };

  const copyLink = (href: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${href}`);
    toast.success("Link copied!");
  };

  const hasFeatures = config.items.some(i => i.type === "features");
  const hasSolutions = config.items.some(i => i.type === "solutions");

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage navigation menus for the public site and app</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Preview */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-card px-6 py-3 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" /> Menu Preview
        </div>
        <div className="bg-background px-6 py-4">
          <div className="flex items-center gap-6 justify-center">
            {config.items.filter(i => i.visible).map((item, idx) => (
              <span key={idx} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {item.label}
                {(item.type === "features" || item.type === "solutions") && (
                  <span className="ml-1 text-[10px] text-primary/60">▾</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-medium text-foreground">Menu Items</h3>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Link</Button>
            {!hasFeatures && (
              <Button variant="outline" size="sm" onClick={addFeatures}><Plus className="h-3.5 w-3.5 mr-1" /> Features Dropdown</Button>
            )}
            {!hasSolutions && (
              <Button variant="outline" size="sm" onClick={addSolutions}><Plus className="h-3.5 w-3.5 mr-1" /> Solutions Dropdown</Button>
            )}
          </div>
        </div>
        {config.items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No menu items yet.</p>
        )}
        <div className="space-y-2">
          {config.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-wrap">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input value={item.label} onChange={e => updateItem(idx, "label", e.target.value)} placeholder="Label" className="max-w-[160px]" />
              {item.type === "link" ? (
                <Input value={item.href} onChange={e => updateItem(idx, "href", e.target.value)} placeholder="/path" className="max-w-[200px]" />
              ) : (
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md font-medium capitalize">
                  {item.type} dropdown
                </span>
              )}
              <Select value={item.type} onValueChange={v => updateItem(idx, "type", v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="features" disabled={hasFeatures && item.type !== "features"}>Features</SelectItem>
                  <SelectItem value="solutions" disabled={hasSolutions && item.type !== "solutions"}>Solutions</SelectItem>
                </SelectContent>
              </Select>
              {item.type === "link" && (
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => copyLink(item.href)} title="Copy link">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch checked={item.visible} onCheckedChange={v => updateItem(idx, "visible", v)} />
                <span className="text-xs text-muted-foreground">{item.visible ? "Visible" : "Hidden"}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive" onClick={() => removeItem(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Add from Published Pages */}
      {pages.length > 0 && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-medium text-foreground">Quick Add from Published Pages</h3>
          <div className="flex flex-wrap gap-2">
            {pages.map(page => (
              <Button key={page.slug} variant="outline" size="sm" onClick={() => addFromPage(page)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {page.title}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
