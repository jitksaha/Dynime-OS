import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Save, Eye, GripVertical, Link as LinkIcon, Globe, Mail, Type, Hash, Palette, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

interface FooterConfig {
  company_name: string;
  tagline: string;
  copyright: string;
  newsletter_enabled: boolean;
  newsletter_title: string;
  newsletter_subtitle: string;
  social_links: SocialLink[];
  columns: FooterColumn[];
  bottom_links: FooterLink[];
  logo_url: string;
  show_logo: boolean;
  show_text_icon: boolean;
  layout: "standard" | "centered" | "minimal";
  bg_style: "default" | "dark" | "gradient";
}

const DEFAULT: FooterConfig = {
  company_name: "Dynime",
  tagline: "The all-in-one platform for managing your entire business.",
  copyright: "© 2026 Dynime, Inc. All rights reserved.",
  newsletter_enabled: true,
  newsletter_title: "Stay in the loop",
  newsletter_subtitle: "Get product updates, tips, and insights delivered weekly.",
  social_links: [],
  columns: [],
  bottom_links: [],
  logo_url: "",
  show_logo: true,
  show_text_icon: true,
  layout: "standard",
  bg_style: "default",
};

type Tab = "general" | "columns" | "social" | "bottom" | "style";

const SOCIAL_PRESETS = [
  { icon: "𝕏", label: "X / Twitter" },
  { icon: "📘", label: "Facebook" },
  { icon: "📸", label: "Instagram" },
  { icon: "💼", label: "LinkedIn" },
  { icon: "📺", label: "YouTube" },
  { icon: "🐙", label: "GitHub" },
];

export default function FooterEditor() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("general");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "footer").single();
      if (data?.value) setConfig({ ...DEFAULT, ...(data.value as unknown as FooterConfig) });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ value: config as any }).eq("key", "footer");
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Footer saved — changes are live!");
  };

  // Column helpers
  const addColumn = () => setConfig(c => ({ ...c, columns: [...c.columns, { title: "New Section", links: [] }] }));
  const removeColumn = (idx: number) => setConfig(c => ({ ...c, columns: c.columns.filter((_, i) => i !== idx) }));
  const updateColumnTitle = (idx: number, title: string) => {
    setConfig(c => { const cols = [...c.columns]; cols[idx] = { ...cols[idx], title }; return { ...c, columns: cols }; });
  };
  const addLink = (colIdx: number) => {
    setConfig(c => {
      const cols = [...c.columns];
      cols[colIdx] = { ...cols[colIdx], links: [...cols[colIdx].links, { label: "New Link", href: "#" }] };
      return { ...c, columns: cols };
    });
  };
  const removeLink = (colIdx: number, linkIdx: number) => {
    setConfig(c => {
      const cols = [...c.columns];
      cols[colIdx] = { ...cols[colIdx], links: cols[colIdx].links.filter((_, i) => i !== linkIdx) };
      return { ...c, columns: cols };
    });
  };
  const updateLink = (colIdx: number, linkIdx: number, key: keyof FooterLink, value: string) => {
    setConfig(c => {
      const cols = [...c.columns];
      const links = [...cols[colIdx].links];
      links[linkIdx] = { ...links[linkIdx], [key]: value };
      cols[colIdx] = { ...cols[colIdx], links };
      return { ...c, columns: cols };
    });
  };

  // Social helpers
  const addSocial = (preset?: typeof SOCIAL_PRESETS[0]) => {
    setConfig(c => ({
      ...c,
      social_links: [...(c.social_links || []), { label: preset?.label || "New", href: "#", icon: preset?.icon || "🔗" }],
    }));
  };
  const removeSocial = (idx: number) => setConfig(c => ({ ...c, social_links: c.social_links.filter((_, i) => i !== idx) }));
  const updateSocial = (idx: number, key: keyof SocialLink, value: string) => {
    setConfig(c => {
      const links = [...(c.social_links || [])];
      links[idx] = { ...links[idx], [key]: value };
      return { ...c, social_links: links };
    });
  };

  // Bottom link helpers
  const addBottomLink = () => setConfig(c => ({ ...c, bottom_links: [...(c.bottom_links || []), { label: "New Link", href: "#" }] }));
  const removeBottomLink = (idx: number) => setConfig(c => ({ ...c, bottom_links: c.bottom_links.filter((_, i) => i !== idx) }));
  const updateBottomLink = (idx: number, key: keyof FooterLink, value: string) => {
    setConfig(c => {
      const links = [...(c.bottom_links || [])];
      links[idx] = { ...links[idx], [key]: value };
      return { ...c, bottom_links: links };
    });
  };

  // Drag-drop for columns
  const onColumnDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    setConfig(c => {
      const cols = [...c.columns];
      const [moved] = cols.splice(result.source.index, 1);
      cols.splice(result.destination!.index, 0, moved);
      return { ...c, columns: cols };
    });
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "general", label: "General", icon: Type },
    { id: "columns", label: "Columns", icon: Hash, count: config.columns.length },
    { id: "social", label: "Social", icon: Globe, count: config.social_links?.length || 0 },
    { id: "bottom", label: "Bottom Links", icon: LinkIcon, count: config.bottom_links?.length || 0 },
    { id: "style", label: "Style", icon: Palette },
  ];

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Footer Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Design your public website footer with drag-and-drop columns</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="shrink-0">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save & Publish"}
        </Button>
      </div>

      {/* Live Preview */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-card px-5 py-2.5 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" /> Live Preview
        </div>
        <div className={cn(
          "p-5 sm:p-6",
          config.bg_style === "dark" ? "bg-card" : config.bg_style === "gradient" ? "bg-gradient-to-br from-card to-muted" : "bg-background"
        )}>
          <div className="max-w-5xl mx-auto">
            {config.newsletter_enabled && (
              <div className="mb-6 pb-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{config.newsletter_title}</p>
                    <p className="text-[10px] text-muted-foreground">{config.newsletter_subtitle}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-7 w-36 bg-muted rounded border border-border" />
                  <div className="h-7 w-16 bg-primary/20 rounded" />
                </div>
              </div>
            )}
            <div className={cn(
              "gap-5 mb-5",
              config.layout === "centered" ? "flex flex-col items-center text-center" : "grid grid-cols-2 md:grid-cols-4"
            )}>
              <div className={cn(config.layout === "standard" && "col-span-2 md:col-span-1")}>
                <div className="flex items-center gap-2 mb-1">
                  {config.show_logo && config.logo_url ? (
                    <img src={config.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
                  ) : config.show_text_icon ? (
                    <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                      <span className="text-[9px] font-extrabold font-brand text-primary">{config.company_name.charAt(0)}</span>
                    </div>
                  ) : null}
                  <p className="font-extrabold font-brand text-foreground text-sm">{config.company_name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{config.tagline}</p>
                {(config.social_links?.length || 0) > 0 && (
                  <div className={cn("flex gap-1 mt-2", config.layout === "centered" && "justify-center")}>
                    {config.social_links.map((s, i) => (
                      <div key={i} className="h-6 w-6 rounded bg-muted flex items-center justify-center text-[9px]">{s.icon}</div>
                    ))}
                  </div>
                )}
              </div>
              {config.columns.map((col, idx) => (
                <div key={idx}>
                  <p className="text-[10px] font-bold text-foreground mb-1.5 uppercase tracking-wider">{col.title}</p>
                  <ul className="space-y-0.5">
                    {col.links.map((link, li) => (
                      <li key={li} className="text-[10px] text-muted-foreground">{link.label}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">{config.copyright}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                {config.bottom_links?.map((l, i) => <span key={i}>{l.label}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={config.company_name} onChange={e => setConfig(c => ({ ...c, company_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Copyright Text</Label>
              <Input value={config.copyright} onChange={e => setConfig(c => ({ ...c, copyright: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <div className="flex gap-2">
              <Input value={config.logo_url || ""} onChange={e => setConfig(c => ({ ...c, logo_url: e.target.value }))} placeholder="https://... or leave empty" />
              {config.logo_url && <img src={config.logo_url} alt="" className="h-10 w-10 rounded border border-border object-contain shrink-0" />}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.show_logo} onCheckedChange={v => setConfig(c => ({ ...c, show_logo: v }))} />
            <Label>Show Logo Image</Label>
            <span className="text-xs text-muted-foreground">(uses uploaded logo image if URL provided)</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.show_text_icon} onCheckedChange={v => setConfig(c => ({ ...c, show_text_icon: v }))} />
            <Label>Show Text Icon</Label>
            <span className="text-xs text-muted-foreground">(first letter in Comfortaa font, shown when no logo image)</span>
          </div>
          <div className="space-y-1.5">
            <Label>Tagline</Label>
            <Textarea value={config.tagline} onChange={e => setConfig(c => ({ ...c, tagline: e.target.value }))} rows={2} />
          </div>
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Newsletter Section</p>
                <p className="text-xs text-muted-foreground">Show email subscription bar above the footer</p>
              </div>
              <Switch checked={config.newsletter_enabled} onCheckedChange={v => setConfig(c => ({ ...c, newsletter_enabled: v }))} />
            </div>
            {config.newsletter_enabled && (
              <div className="grid sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                <div className="space-y-1.5">
                  <Label>Newsletter Title</Label>
                  <Input value={config.newsletter_title} onChange={e => setConfig(c => ({ ...c, newsletter_title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Newsletter Subtitle</Label>
                  <Input value={config.newsletter_subtitle} onChange={e => setConfig(c => ({ ...c, newsletter_subtitle: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Columns Tab - with drag-drop */}
      {activeTab === "columns" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{config.columns.length} column{config.columns.length !== 1 ? "s" : ""} — drag to reorder</p>
            <Button variant="outline" size="sm" onClick={addColumn}><Plus className="h-3.5 w-3.5 mr-1" /> Add Column</Button>
          </div>
          {config.columns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No footer columns yet. Add one to get started.</p>
            </div>
          )}
          <DragDropContext onDragEnd={onColumnDragEnd}>
            <Droppable droppableId="footer-columns">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {config.columns.map((col, colIdx) => (
                    <Draggable key={`col-${colIdx}`} draggableId={`col-${colIdx}`} index={colIdx}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn("border border-border rounded-xl bg-card overflow-hidden", snapshot.isDragging && "shadow-lg ring-2 ring-primary/20")}
                        >
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                            <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                            <Input value={col.title} onChange={e => updateColumnTitle(colIdx, e.target.value)} placeholder="Column Title" className="h-8 max-w-xs text-sm font-semibold" />
                            <span className="text-[10px] text-muted-foreground">{col.links.length} links</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-auto shrink-0" onClick={() => removeColumn(colIdx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="p-3 space-y-2">
                            {col.links.map((link, linkIdx) => (
                              <div key={linkIdx} className="flex items-center gap-2">
                                <LinkIcon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                                <Input value={link.label} onChange={e => updateLink(colIdx, linkIdx, "label", e.target.value)} placeholder="Label" className="h-8 text-xs" />
                                <Input value={link.href} onChange={e => updateLink(colIdx, linkIdx, "href", e.target.value)} placeholder="/path" className="h-8 text-xs font-mono" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeLink(colIdx, linkIdx)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => addLink(colIdx)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Link
                            </Button>
                          </div>
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

      {/* Social Links Tab */}
      {activeTab === "social" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{config.social_links?.length || 0} social links</p>
            <Button variant="outline" size="sm" onClick={() => addSocial()}><Plus className="h-3.5 w-3.5 mr-1" /> Add Social</Button>
          </div>
          {/* Quick add presets */}
          <div className="flex flex-wrap gap-1.5">
            {SOCIAL_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => addSocial(preset)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                <span>{preset.icon}</span> {preset.label}
              </button>
            ))}
          </div>
          {(!config.social_links || config.social_links.length === 0) && (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No social links yet. Use the presets above or add manually.</p>
            </div>
          )}
          <div className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden">
            {config.social_links?.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm shrink-0">{s.icon}</div>
                <Input value={s.icon} onChange={e => updateSocial(idx, "icon", e.target.value)} placeholder="Icon" className="h-8 text-xs w-14 shrink-0" />
                <Input value={s.label} onChange={e => updateSocial(idx, "label", e.target.value)} placeholder="Label" className="h-8 text-xs" />
                <Input value={s.href} onChange={e => updateSocial(idx, "href", e.target.value)} placeholder="https://..." className="h-8 text-xs font-mono flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeSocial(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Links Tab */}
      {activeTab === "bottom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Links shown in the copyright bar</p>
            <Button variant="outline" size="sm" onClick={addBottomLink}><Plus className="h-3.5 w-3.5 mr-1" /> Add Link</Button>
          </div>
          {(!config.bottom_links || config.bottom_links.length === 0) && (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No bottom links configured.</p>
            </div>
          )}
          <div className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden">
            {config.bottom_links?.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <Input value={link.label} onChange={e => updateBottomLink(idx, "label", e.target.value)} placeholder="Label" className="h-8 text-xs" />
                <Input value={link.href} onChange={e => updateBottomLink(idx, "href", e.target.value)} placeholder="/path" className="h-8 text-xs font-mono flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeBottomLink(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style Tab */}
      {activeTab === "style" && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-5">
          <div className="space-y-2">
            <Label>Footer Layout</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "standard", label: "Standard", desc: "Logo left, columns right" },
                { value: "centered", label: "Centered", desc: "Everything centered" },
                { value: "minimal", label: "Minimal", desc: "Compact single row" },
              ] as const).map(layout => (
                <button
                  key={layout.value}
                  onClick={() => setConfig(c => ({ ...c, layout: layout.value }))}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    config.layout === layout.value ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  )}
                >
                  <p className="text-xs font-semibold text-foreground">{layout.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{layout.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Background Style</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "default", label: "Default", preview: "bg-background" },
                { value: "dark", label: "Dark Card", preview: "bg-card" },
                { value: "gradient", label: "Gradient", preview: "bg-gradient-to-br from-card to-muted" },
              ] as const).map(bg => (
                <button
                  key={bg.value}
                  onClick={() => setConfig(c => ({ ...c, bg_style: bg.value }))}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    config.bg_style === bg.value ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn("h-8 rounded-md mb-1.5", bg.preview)} />
                  <p className="text-xs font-medium text-foreground text-center">{bg.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
