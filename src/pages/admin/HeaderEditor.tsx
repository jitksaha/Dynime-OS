import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, Eye, GripVertical, ChevronDown, ExternalLink, Layers, PanelTop, Palette, MousePointer, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface SubItem {
  label: string;
  href: string;
  description?: string;
}

interface NavItem {
  label: string;
  href: string;
  type: "link" | "dropdown" | "mega";
  open_new_tab?: boolean;
  children?: SubItem[];
}

interface HeaderConfig {
  logo_text: string;
  logo_url: string;
  show_logo: boolean;
  show_text_icon: boolean;
  nav_items: NavItem[];
  cta_text: string;
  cta_link: string;
  cta_style: "solid" | "outline" | "gradient";
  sticky: boolean;
  transparent_on_hero: boolean;
  show_top_bar: boolean;
  top_bar_text: string;
  top_bar_bg: string;
}

const DEFAULT: HeaderConfig = {
  logo_text: "Dynime",
  logo_url: "",
  show_logo: true,
  show_text_icon: true,
  nav_items: [],
  cta_text: "Get Started Free",
  cta_link: "/signup",
  cta_style: "solid",
  sticky: true,
  transparent_on_hero: false,
  show_top_bar: false,
  top_bar_text: "🎉 New features released — See what's new",
  top_bar_bg: "primary",
};

type Tab = "branding" | "navigation" | "cta" | "behavior";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "branding", label: "Branding", icon: Palette },
  { id: "navigation", label: "Navigation", icon: Layers },
  { id: "cta", label: "CTA Button", icon: MousePointer },
  { id: "behavior", label: "Behavior", icon: PanelTop },
];

export default function HeaderEditor() {
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("branding");
  const [expandedNav, setExpandedNav] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "header").single();
      if (data?.value) setConfig({ ...DEFAULT, ...(data.value as unknown as HeaderConfig) });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ value: config as any }).eq("key", "header");
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Header saved — changes are live!");
  };

  // Nav item helpers
  const addNavItem = (type: NavItem["type"] = "link") => {
    setConfig(c => ({
      ...c,
      nav_items: [...c.nav_items, { label: "New Link", href: type === "link" ? "#" : "", type, children: type !== "link" ? [] : undefined }],
    }));
    setExpandedNav(config.nav_items.length);
  };
  const removeNavItem = (idx: number) => {
    setConfig(c => ({ ...c, nav_items: c.nav_items.filter((_, i) => i !== idx) }));
    if (expandedNav === idx) setExpandedNav(null);
  };
  const updateNavItem = (idx: number, updates: Partial<NavItem>) => {
    setConfig(c => {
      const items = [...c.nav_items];
      items[idx] = { ...items[idx], ...updates };
      return { ...c, nav_items: items };
    });
  };

  // Sub-item helpers
  const addSubItem = (navIdx: number) => {
    setConfig(c => {
      const items = [...c.nav_items];
      const children = [...(items[navIdx].children || []), { label: "Sub Link", href: "#", description: "" }];
      items[navIdx] = { ...items[navIdx], children };
      return { ...c, nav_items: items };
    });
  };
  const removeSubItem = (navIdx: number, subIdx: number) => {
    setConfig(c => {
      const items = [...c.nav_items];
      items[navIdx] = { ...items[navIdx], children: items[navIdx].children?.filter((_, i) => i !== subIdx) };
      return { ...c, nav_items: items };
    });
  };
  const updateSubItem = (navIdx: number, subIdx: number, updates: Partial<SubItem>) => {
    setConfig(c => {
      const items = [...c.nav_items];
      const children = [...(items[navIdx].children || [])];
      children[subIdx] = { ...children[subIdx], ...updates };
      items[navIdx] = { ...items[navIdx], children };
      return { ...c, nav_items: items };
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    setConfig(c => {
      const items = [...c.nav_items];
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination!.index, 0, moved);
      return { ...c, nav_items: items };
    });
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Header Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Design your public website header with drag-and-drop navigation</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save & Publish"}
        </Button>
      </div>

      {/* Live Preview */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-card px-5 py-2.5 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" /> Live Preview
        </div>
        <div className="bg-background">
          {/* Top bar preview */}
          {config.show_top_bar && (
            <div className="bg-primary px-4 py-1.5 text-center">
              <p className="text-[10px] font-medium text-primary-foreground">{config.top_bar_text}</p>
            </div>
          )}
          <div className={cn("px-6 py-3", config.transparent_on_hero && "bg-background/80 backdrop-blur-sm")}>
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div className="flex items-center gap-2">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="h-7 w-auto object-contain" />
                ) : (
                  <div className="h-7 px-2 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-muted-foreground">No Logo</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-5">
                {config.nav_items.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      {item.label}
                      {item.type !== "link" && <ChevronDown className="h-2.5 w-2.5" />}
                    </span>
                  </div>
                ))}
                <span className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium",
                  config.cta_style === "outline" ? "border border-primary text-primary" :
                  config.cta_style === "gradient" ? "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground" :
                  "bg-primary text-primary-foreground"
                )}>{config.cta_text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Branding Tab */}
      {activeTab === "branding" && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-5">
          {/* Logo Image Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" /> Logo Image
            </h3>
            <p className="text-xs text-muted-foreground">
              Paste a URL to your logo image. This will be displayed in the header, footer, and auth pages.
            </p>
            <div className="space-y-1.5">
              <Label>Logo Image URL</Label>
              <Input
                value={config.logo_url}
                onChange={e => setConfig(c => ({ ...c, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
            {config.logo_url ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                <img
                  src={config.logo_url}
                  alt="Logo preview"
                  className="h-12 w-auto max-w-[200px] object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Logo loaded ✓</p>
                  <p>This logo will appear across the entire platform.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-border text-center">
                <Image className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No logo set — the default Dynime logo will be used.</p>
              </div>
            )}
          </div>
          {/* Top Bar */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Announcement Bar</p>
                <p className="text-xs text-muted-foreground">Show a colored bar above the header</p>
              </div>
              <Switch checked={config.show_top_bar} onCheckedChange={v => setConfig(c => ({ ...c, show_top_bar: v }))} />
            </div>
            {config.show_top_bar && (
              <div className="pl-4 border-l-2 border-primary/20">
                <Label>Announcement Text</Label>
                <Input value={config.top_bar_text} onChange={e => setConfig(c => ({ ...c, top_bar_text: e.target.value }))} className="mt-1.5" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tab */}
      {activeTab === "navigation" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{config.nav_items.length} navigation item{config.nav_items.length !== 1 ? "s" : ""}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addNavItem("link")}><Plus className="h-3.5 w-3.5 mr-1" /> Link</Button>
              <Button variant="outline" size="sm" onClick={() => addNavItem("dropdown")}><Plus className="h-3.5 w-3.5 mr-1" /> Dropdown</Button>
              <Button variant="outline" size="sm" onClick={() => addNavItem("mega")}><Plus className="h-3.5 w-3.5 mr-1" /> Mega Menu</Button>
            </div>
          </div>

          {config.nav_items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No navigation items. Add links, dropdowns, or mega menus above.</p>
            </div>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="header-nav">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {config.nav_items.map((item, idx) => (
                    <Draggable key={`nav-${idx}`} draggableId={`nav-${idx}`} index={idx}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(
                            "border border-border rounded-xl bg-card overflow-hidden",
                            snapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
                          )}
                        >
                          {/* Item header */}
                          <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                            <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                            <span className={cn(
                              "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                              item.type === "link" ? "bg-primary/10 text-primary" :
                              item.type === "dropdown" ? "bg-accent text-accent-foreground" :
                              "bg-secondary text-secondary-foreground"
                            )}>{item.type}</span>
                            <Input
                              value={item.label}
                              onChange={e => updateNavItem(idx, { label: e.target.value })}
                              className="h-8 max-w-[160px] text-sm font-semibold"
                            />
                            {item.type === "link" && (
                              <Input
                                value={item.href}
                                onChange={e => updateNavItem(idx, { href: e.target.value })}
                                placeholder="/path"
                                className="h-8 max-w-[180px] text-xs font-mono"
                              />
                            )}
                            {item.type === "link" && (
                              <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                                <input
                                  type="checkbox"
                                  checked={item.open_new_tab || false}
                                  onChange={e => updateNavItem(idx, { open_new_tab: e.target.checked })}
                                  className="rounded border-input h-3 w-3"
                                />
                                <ExternalLink className="h-3 w-3" />
                              </label>
                            )}
                            {item.type !== "link" && (
                              <button
                                onClick={() => setExpandedNav(expandedNav === idx ? null : idx)}
                                className="text-xs text-primary font-medium hover:underline ml-auto"
                              >
                                {expandedNav === idx ? "Collapse" : `${item.children?.length || 0} items ▾`}
                              </button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 ml-auto" onClick={() => removeNavItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Sub-items for dropdown/mega */}
                          {item.type !== "link" && expandedNav === idx && (
                            <div className="p-3 border-t border-border space-y-2">
                              {item.children?.map((sub, subIdx) => (
                                <div key={subIdx} className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground/50 w-4 text-center shrink-0">{subIdx + 1}</span>
                                  <Input value={sub.label} onChange={e => updateSubItem(idx, subIdx, { label: e.target.value })} placeholder="Label" className="h-8 text-xs" />
                                  <Input value={sub.href} onChange={e => updateSubItem(idx, subIdx, { href: e.target.value })} placeholder="/path" className="h-8 text-xs font-mono" />
                                  {item.type === "mega" && (
                                    <Input value={sub.description || ""} onChange={e => updateSubItem(idx, subIdx, { description: e.target.value })} placeholder="Description..." className="h-8 text-xs flex-1" />
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeSubItem(idx, subIdx)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="outline" size="sm" className="text-xs" onClick={() => addSubItem(idx)}>
                                <Plus className="h-3 w-3 mr-1" /> Add Sub-Item
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* CTA Tab */}
      {activeTab === "cta" && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Button Text</Label>
              <Input value={config.cta_text} onChange={e => setConfig(c => ({ ...c, cta_text: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Button Link</Label>
              <Input value={config.cta_link} onChange={e => setConfig(c => ({ ...c, cta_link: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Button Style</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "solid", label: "Solid", preview: "bg-primary text-primary-foreground" },
                { value: "outline", label: "Outline", preview: "border-2 border-primary text-primary bg-transparent" },
                { value: "gradient", label: "Gradient", preview: "bg-gradient-to-r from-primary to-primary/60 text-primary-foreground" },
              ] as const).map(style => (
                <button
                  key={style.value}
                  onClick={() => setConfig(c => ({ ...c, cta_style: style.value }))}
                  className={cn(
                    "p-3 rounded-lg border-2 text-center transition-all",
                    config.cta_style === style.value ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn("h-8 rounded-md flex items-center justify-center text-xs font-medium mb-1.5", style.preview)}>
                    {config.cta_text}
                  </div>
                  <p className="text-xs text-muted-foreground">{style.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Behavior Tab */}
      {activeTab === "behavior" && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Sticky Header</p>
              <p className="text-xs text-muted-foreground">Header stays visible when scrolling down</p>
            </div>
            <Switch checked={config.sticky} onCheckedChange={v => setConfig(c => ({ ...c, sticky: v }))} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Transparent on Hero</p>
              <p className="text-xs text-muted-foreground">Header becomes transparent over hero sections</p>
            </div>
            <Switch checked={config.transparent_on_hero} onCheckedChange={v => setConfig(c => ({ ...c, transparent_on_hero: v }))} />
          </div>
        </div>
      )}
    </div>
  );
}
