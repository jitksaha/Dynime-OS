import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Plus, Trash2, GripVertical, Globe, ExternalLink } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
  enabled: boolean;
}

const PLATFORM_PRESETS = [
  { platform: "Facebook", icon: "📘", placeholder: "https://facebook.com/yourpage" },
  { platform: "Instagram", icon: "📸", placeholder: "https://instagram.com/yourhandle" },
  { platform: "X / Twitter", icon: "𝕏", placeholder: "https://x.com/yourhandle" },
  { platform: "LinkedIn", icon: "💼", placeholder: "https://linkedin.com/company/yourcompany" },
  { platform: "YouTube", icon: "📺", placeholder: "https://youtube.com/@yourchannel" },
  { platform: "GitHub", icon: "🐙", placeholder: "https://github.com/yourorg" },
  { platform: "TikTok", icon: "🎵", placeholder: "https://tiktok.com/@yourhandle" },
  { platform: "Discord", icon: "💬", placeholder: "https://discord.gg/yourinvite" },
  { platform: "WhatsApp", icon: "💚", placeholder: "https://wa.me/yournumber" },
  { platform: "Telegram", icon: "✈️", placeholder: "https://t.me/yourchannel" },
  { platform: "Pinterest", icon: "📌", placeholder: "https://pinterest.com/yourprofile" },
  { platform: "Reddit", icon: "🔴", placeholder: "https://reddit.com/r/yoursubreddit" },
];

export default function SocialMediaManager() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "social_media_links")
        .single();
      if (data?.value) setLinks(data.value as unknown as SocialLink[]);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "social_media_links", value: links as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Social media links saved — changes are live everywhere!");
  };

  const addPlatform = (preset: typeof PLATFORM_PRESETS[0]) => {
    if (links.some(l => l.platform === preset.platform)) {
      return toast.error(`${preset.platform} already added`);
    }
    setLinks(prev => [...prev, { platform: preset.platform, url: "", icon: preset.icon, enabled: true }]);
  };

  const addCustom = () => {
    setLinks(prev => [...prev, { platform: "Custom", url: "", icon: "🔗", enabled: true }]);
  };

  const remove = (idx: number) => setLinks(prev => prev.filter((_, i) => i !== idx));

  const update = (idx: number, field: keyof SocialLink, value: any) => {
    setLinks(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = [...links];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setLinks(items);
  };

  const unusedPresets = PLATFORM_PRESETS.filter(p => !links.some(l => l.platform === p.platform));
  const enabledCount = links.filter(l => l.enabled && l.url).length;

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Media Links</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage social links globally — they appear in the footer and across the entire platform
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="shrink-0">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
        <Globe className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">{enabledCount} active social link{enabledCount !== 1 ? "s" : ""}</p>
          <p className="text-xs text-muted-foreground">Only links with URLs and enabled toggle will appear on the website</p>
        </div>
      </div>

      {/* Quick Add */}
      {unusedPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Add Platform</p>
          <div className="flex flex-wrap gap-2">
            {unusedPresets.map(preset => (
              <button
                key={preset.platform}
                onClick={() => addPlatform(preset)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm hover:bg-muted/50 transition-colors"
              >
                <span>{preset.icon}</span>
                <span className="text-foreground">{preset.platform}</span>
              </button>
            ))}
            <button
              onClick={addCustom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Custom
            </button>
          </div>
        </div>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No social media links configured yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click a platform above to add your first link</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="social-links">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {links.map((link, idx) => {
                  const preset = PLATFORM_PRESETS.find(p => p.platform === link.platform);
                  return (
                    <Draggable key={`${link.platform}-${idx}`} draggableId={`social-${idx}`} index={idx}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`border rounded-xl p-4 transition-colors ${link.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                            <span className="text-xl shrink-0">{link.icon}</span>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={link.platform}
                                  onChange={e => update(idx, "platform", e.target.value)}
                                  className="h-8 text-sm font-medium max-w-[180px]"
                                  placeholder="Platform name"
                                />
                                <Input
                                  value={link.icon}
                                  onChange={e => update(idx, "icon", e.target.value)}
                                  className="h-8 text-sm w-14 text-center"
                                  placeholder="Icon"
                                />
                              </div>
                              <Input
                                value={link.url}
                                onChange={e => update(idx, "url", e.target.value)}
                                placeholder={preset?.placeholder || "https://..."}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {link.url && link.url.startsWith("http") && (
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted/50">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                </a>
                              )}
                              <Switch
                                checked={link.enabled}
                                onCheckedChange={v => update(idx, "enabled", v)}
                              />
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(idx)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
