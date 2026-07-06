import { useState, useEffect, useCallback } from "react";
import {
  Mail, Save, Eye, Plus, Trash2, GripVertical, ChevronDown,
  Type, Image, MousePointerClick, Minus, ArrowUpDown, Columns,
  Share2, FileText, Undo2, Copy, Settings2, Check, X, Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import VisualEditor from "@/components/visual-editor/VisualEditor";
import type { WidgetInstance } from "@/components/visual-editor/types";

// ─── Block Types ─────────────────────────────────────────
type BlockType = "logo" | "heading" | "text" | "button" | "image" | "divider" | "spacer" | "columns" | "social" | "footer";

interface EmailBlock {
  id: string;
  type: BlockType;
  props: Record<string, any>;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  category: string;
  blocks: EmailBlock[];
  variables: string[];
  is_active: boolean;
}

const BLOCK_PALETTE: { type: BlockType; label: string; icon: React.ElementType; category: string }[] = [
  { type: "logo", label: "Logo", icon: Image, category: "Essential" },
  { type: "heading", label: "Heading", icon: Type, category: "Essential" },
  { type: "text", label: "Text", icon: FileText, category: "Essential" },
  { type: "button", label: "Button", icon: MousePointerClick, category: "Essential" },
  { type: "image", label: "Image", icon: Image, category: "Essential" },
  { type: "divider", label: "Divider", icon: Minus, category: "Essential" },
  { type: "spacer", label: "Spacer", icon: ArrowUpDown, category: "Layout" },
  { type: "columns", label: "Columns", icon: Columns, category: "Layout" },
  { type: "social", label: "Social Links", icon: Share2, category: "Social" },
  { type: "footer", label: "Footer", icon: FileText, category: "Layout" },
];

const defaultBlockProps: Record<BlockType, Record<string, any>> = {
  logo: { width: 120, align: "center" },
  heading: { text: "Your Heading", level: 1, align: "center", color: "#1a1a1a" },
  text: { content: "Your text content here...", align: "left", color: "#555555", fontSize: 14 },
  button: { text: "Click Here", url: "#", bgColor: "#000000", textColor: "#ffffff", align: "center", borderRadius: 8 },
  image: { src: "", alt: "Image", width: "100%", align: "center" },
  divider: { color: "#e5e5e5", thickness: 1 },
  spacer: { height: 24 },
  columns: { columns: 2, gap: 16, children: [[], []] },
  social: { align: "center", links: [{ platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }] },
  footer: { text: "© 2024 Your Company. All rights reserved.", color: "#999999", fontSize: 12, align: "center" },
};

const genId = () => Math.random().toString(36).slice(2, 10);

// ─── Block Renderer (Preview) ────────────────────────────
function BlockPreview({ block }: { block: EmailBlock }) {
  const p = block.props;
  switch (block.type) {
    case "logo":
      return (
        <div style={{ textAlign: p.align || "center", padding: "12px 0" }}>
          <div
            style={{
              width: p.width || 120,
              height: 40,
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            LOGO
          </div>
        </div>
      );
    case "heading":
      return (
        <div style={{ textAlign: p.align || "center", padding: "8px 0" }}>
          {p.level === 1 ? (
            <h1 style={{ fontSize: 24, fontWeight: 700, color: p.color || "#1a1a1a", margin: 0 }}>{p.text}</h1>
          ) : (
            <h2 style={{ fontSize: 20, fontWeight: 600, color: p.color || "#1a1a1a", margin: 0 }}>{p.text}</h2>
          )}
        </div>
      );
    case "text":
      return (
        <div style={{ textAlign: p.align || "left", padding: "4px 0", color: p.color || "#555", fontSize: p.fontSize || 14, lineHeight: 1.6, whiteSpace: "pre-line" }}>
          {p.content}
        </div>
      );
    case "button":
      return (
        <div style={{ textAlign: p.align || "center", padding: "12px 0" }}>
          <span
            style={{
              display: "inline-block",
              padding: "12px 28px",
              backgroundColor: p.bgColor || "#000",
              color: p.textColor || "#fff",
              borderRadius: p.borderRadius || 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            {p.text}
          </span>
        </div>
      );
    case "image":
      return (
        <div style={{ textAlign: p.align || "center", padding: "8px 0" }}>
          {p.src ? (
            <img src={p.src} alt={p.alt} style={{ maxWidth: p.width || "100%", borderRadius: 8 }} />
          ) : (
            <div style={{ width: "100%", height: 120, background: "#f0f0f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>
              Image placeholder
            </div>
          )}
        </div>
      );
    case "divider":
      return <hr style={{ border: "none", borderTop: `${p.thickness || 1}px solid ${p.color || "#e5e5e5"}`, margin: "12px 0" }} />;
    case "spacer":
      return <div style={{ height: p.height || 24 }} />;
    case "columns":
      return (
        <div style={{ display: "flex", gap: p.gap || 16, padding: "8px 0" }}>
          {(p.children || [[], []]).map((col: EmailBlock[], i: number) => (
            <div key={i} style={{ flex: 1, minWidth: 0 }}>
              {col.length > 0 ? col.map((b) => <BlockPreview key={b.id} block={b} />) : (
                <div style={{ padding: 16, background: "#f9f9f9", borderRadius: 6, border: "1px dashed #ddd", textAlign: "center", fontSize: 12, color: "#999" }}>
                  Column {i + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "social":
      return (
        <div style={{ textAlign: p.align || "center", padding: "12px 0" }}>
          <div style={{ display: "inline-flex", gap: 12 }}>
            {(p.links || []).map((link: any, i: number) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "#f0f0f0", color: "#555", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>
                {link.platform?.charAt(0)}
              </span>
            ))}
          </div>
        </div>
      );
    case "footer":
      return (
        <div style={{ textAlign: p.align || "center", padding: "16px 0 8px", color: p.color || "#999", fontSize: p.fontSize || 12 }}>
          {p.text}
        </div>
      );
    default:
      return <div className="p-3 text-sm text-muted-foreground">Unknown block</div>;
  }
}

// ─── Block Property Editor ───────────────────────────────
function BlockEditor({ block, onChange }: { block: EmailBlock; onChange: (props: Record<string, any>) => void }) {
  const p = block.props;
  const set = (key: string, val: any) => onChange({ ...p, [key]: val });

  const inputCls = "w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring";
  const labelCls = "block text-[11px] font-medium text-muted-foreground mb-1";
  const colorCls = "h-8 w-10 rounded border border-input cursor-pointer";

  switch (block.type) {
    case "logo":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Width (px)</label><input type="number" value={p.width || 120} onChange={(e) => set("width", Number(e.target.value))} className={inputCls} /></div>
          <div><label className={labelCls}>Alignment</label>
            <select value={p.align || "center"} onChange={(e) => set("align", e.target.value)} className={inputCls}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
          </div>
        </div>
      );
    case "heading":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Text</label><input value={p.text || ""} onChange={(e) => set("text", e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Level</label>
              <select value={p.level || 1} onChange={(e) => set("level", Number(e.target.value))} className={inputCls}><option value={1}>H1</option><option value={2}>H2</option></select>
            </div>
            <div><label className={labelCls}>Align</label>
              <select value={p.align || "center"} onChange={(e) => set("align", e.target.value)} className={inputCls}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
            </div>
          </div>
          <div><label className={labelCls}>Color</label><input type="color" value={p.color || "#1a1a1a"} onChange={(e) => set("color", e.target.value)} className={colorCls} /></div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Content</label><textarea value={p.content || ""} onChange={(e) => set("content", e.target.value)} rows={4} className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-y" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelCls}>Align</label><select value={p.align || "left"} onChange={(e) => set("align", e.target.value)} className={inputCls}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
            <div><label className={labelCls}>Size</label><input type="number" value={p.fontSize || 14} onChange={(e) => set("fontSize", Number(e.target.value))} className={inputCls} /></div>
            <div><label className={labelCls}>Color</label><input type="color" value={p.color || "#555555"} onChange={(e) => set("color", e.target.value)} className={colorCls} /></div>
          </div>
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Button Text</label><input value={p.text || ""} onChange={(e) => set("text", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>URL</label><input value={p.url || ""} onChange={(e) => set("url", e.target.value)} className={inputCls} placeholder="{{confirmation_url}}" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelCls}>BG Color</label><input type="color" value={p.bgColor || "#000000"} onChange={(e) => set("bgColor", e.target.value)} className={colorCls} /></div>
            <div><label className={labelCls}>Text Color</label><input type="color" value={p.textColor || "#ffffff"} onChange={(e) => set("textColor", e.target.value)} className={colorCls} /></div>
            <div><label className={labelCls}>Radius</label><input type="number" value={p.borderRadius || 8} onChange={(e) => set("borderRadius", Number(e.target.value))} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Alignment</label><select value={p.align || "center"} onChange={(e) => set("align", e.target.value)} className={inputCls}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Image URL</label><input value={p.src || ""} onChange={(e) => set("src", e.target.value)} className={inputCls} placeholder="https://..." /></div>
          <div><label className={labelCls}>Alt Text</label><input value={p.alt || ""} onChange={(e) => set("alt", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Max Width</label><input value={p.width || "100%"} onChange={(e) => set("width", e.target.value)} className={inputCls} /></div>
        </div>
      );
    case "divider":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Color</label><input type="color" value={p.color || "#e5e5e5"} onChange={(e) => set("color", e.target.value)} className={colorCls} /></div>
          <div><label className={labelCls}>Thickness (px)</label><input type="number" value={p.thickness || 1} onChange={(e) => set("thickness", Number(e.target.value))} className={inputCls} /></div>
        </div>
      );
    case "spacer":
      return (
        <div><label className={labelCls}>Height (px)</label><input type="number" value={p.height || 24} onChange={(e) => set("height", Number(e.target.value))} className={inputCls} /></div>
      );
    case "social":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Alignment</label><select value={p.align || "center"} onChange={(e) => set("align", e.target.value)} className={inputCls}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
          <div>
            <label className={labelCls}>Social Links</label>
            {(p.links || []).map((link: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={link.platform} onChange={(e) => {
                  const links = [...(p.links || [])];
                  links[i] = { ...links[i], platform: e.target.value };
                  set("links", links);
                }} className={inputCls + " flex-1"}>
                  {["twitter", "facebook", "instagram", "linkedin", "youtube", "github"].map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                </select>
                <input value={link.url} onChange={(e) => {
                  const links = [...(p.links || [])];
                  links[i] = { ...links[i], url: e.target.value };
                  set("links", links);
                }} className={inputCls + " flex-1"} placeholder="URL" />
                <button onClick={() => set("links", (p.links || []).filter((_: any, j: number) => j !== i))} className="p-1.5 rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button onClick={() => set("links", [...(p.links || []), { platform: "twitter", url: "#" }])} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Add link</button>
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="space-y-3">
          <div><label className={labelCls}>Footer Text</label><textarea value={p.text || ""} onChange={(e) => set("text", e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-y" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Size</label><input type="number" value={p.fontSize || 12} onChange={(e) => set("fontSize", Number(e.target.value))} className={inputCls} /></div>
            <div><label className={labelCls}>Color</label><input type="color" value={p.color || "#999999"} onChange={(e) => set("color", e.target.value)} className={colorCls} /></div>
          </div>
        </div>
      );
    default:
      return <p className="text-xs text-muted-foreground">No editable properties</p>;
  }
}

// ─── Main Builder ────────────────────────────────────────
export default function EmailTemplateBuilder() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [subject, setSubject] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [history, setHistory] = useState<EmailBlock[][]>([]);
  const [advancedEditor, setAdvancedEditor] = useState(false);
  const [advancedWidgets, setAdvancedWidgets] = useState<WidgetInstance[]>([]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("system_email_templates")
      .select("*")
      .order("category, name");
    if (data) {
      setTemplates(data as any[]);
      if (!selectedId && data.length > 0) {
        selectTemplate(data[0] as any);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const selectTemplate = (t: EmailTemplate) => {
    setSelectedId(t.id);
    setBlocks(Array.isArray(t.blocks) ? t.blocks : []);
    setSubject(t.subject);
    setTemplateName(t.name);
    setSelectedBlockId(null);
    setHistory([]);
  };

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-19), blocks]);
  }, [blocks]);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setBlocks(prev);
  };

  const addBlock = (type: BlockType) => {
    pushHistory();
    const newBlock: EmailBlock = { id: genId(), type, props: { ...defaultBlockProps[type] } };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    pushHistory();
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const duplicateBlock = (id: string) => {
    pushHistory();
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const clone: EmailBlock = { ...blocks[idx], id: genId(), props: { ...blocks[idx].props } };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, clone);
    setBlocks(newBlocks);
    setSelectedBlockId(clone.id);
  };

  const updateBlockProps = (id: string, props: Record<string, any>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props } : b)));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    pushHistory();
    const items = [...blocks];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setBlocks(items);
  };

  const saveTemplate = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase
      .from("system_email_templates")
      .update({ blocks: blocks as any, subject, name: templateName })
      .eq("id", selectedId);
    if (error) toast.error(error.message);
    else {
      toast.success("Template saved successfully");
      fetchTemplates();
    }
    setSaving(false);
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const categoryColors: Record<string, string> = {
    auth: "bg-primary/10 text-primary",
    payment: "bg-success/10 text-success",
    notification: "bg-warning/10 text-warning",
    onboarding: "bg-info/10 text-info",
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Template Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag & drop blocks to design email templates. Use <code className="bg-muted px-1 rounded text-xs">{"{{variable}}"}</code> for dynamic content.
          </p>
        </div>
      </div>

      {/* Template Selector */}
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTemplate(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              selectedId === t.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/40"
            }`}
          >
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 ${categoryColors[t.category] || "bg-muted text-muted-foreground"}`}>
              {t.category}
            </span>
            {t.name}
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4">
          {/* LEFT: Block Palette */}
          <div className="bg-card border border-border rounded-xl p-4">
            <button onClick={() => setPaletteOpen(!paletteOpen)} className="flex items-center justify-between w-full text-sm font-semibold text-foreground mb-3">
              <span className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add Blocks</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${paletteOpen ? "rotate-180" : ""}`} />
            </button>
            {paletteOpen && (
              <div className="space-y-4">
                {["Essential", "Layout", "Social"].map((cat) => (
                  <div key={cat}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {BLOCK_PALETTE.filter((b) => b.category === cat).map((b) => (
                        <button
                          key={b.type}
                          onClick={() => addBlock(b.type)}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                        >
                          <b.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-medium text-foreground">{b.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variables Reference */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Available Variables</p>
              <div className="flex flex-wrap gap-1">
                {(selectedTemplate.variables || []).map((v) => (
                  <span key={v} className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Canvas */}
          <div className="space-y-3">
            {/* Subject + Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Template Name</label>
                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Email Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <button onClick={undo} disabled={history.length === 0} className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors" title="Undo">
                <Undo2 className="h-4 w-4" />
              </button>
              <button onClick={() => setShowPreview(!showPreview)} className={`p-1.5 rounded-md border transition-colors ${showPreview ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Toggle Preview">
                <Eye className="h-4 w-4" />
              </button>
              <button onClick={() => setAdvancedEditor(!advancedEditor)} className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-colors ${advancedEditor ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Advanced Visual Editor">
                <Palette className="h-3.5 w-3.5" /> Advanced
              </button>
              <div className="flex-1" />
              <button onClick={saveTemplate} disabled={saving} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
              </button>
            </div>

            {/* Canvas Area */}
            {advancedEditor ? (
              <div className="h-[500px] rounded-xl border border-border overflow-hidden">
                <VisualEditor widgets={advancedWidgets} onChange={setAdvancedWidgets} context="email" />
              </div>
            ) : showPreview ? (
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
                    <div className="h-2.5 w-2.5 rounded-full bg-warning/40" />
                    <div className="h-2.5 w-2.5 rounded-full bg-success/40" />
                  </div>
                  <span className="text-[11px] text-muted-foreground ml-2">Subject: {subject}</span>
                </div>
                <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px", fontFamily: "Arial, sans-serif" }}>
                  {blocks.map((block) => (
                    <BlockPreview key={block.id} block={block} />
                  ))}
                  {blocks.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-16">No blocks added yet. Use the palette to add blocks.</p>
                  )}
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="email-blocks">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="bg-white rounded-xl border border-border shadow-sm min-h-[400px] p-4"
                      style={{ maxWidth: 600, margin: "0 auto" }}
                    >
                      {blocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              onClick={() => setSelectedBlockId(block.id)}
                              className={`relative group rounded-lg border transition-all mb-2 ${
                                selectedBlockId === block.id
                                  ? "border-primary ring-1 ring-primary/20 bg-primary/[0.02]"
                                  : "border-transparent hover:border-border"
                              } ${snapshot.isDragging ? "shadow-lg" : ""}`}
                            >
                              {/* Block toolbar */}
                              <div className={`absolute -top-3 right-2 z-10 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm px-1 py-0.5 ${
                                selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              } transition-opacity`}>
                                <div {...dragProvided.dragHandleProps} className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                  <GripVertical className="h-3.5 w-3.5" />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-0.5 text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-0.5 text-destructive hover:text-destructive/80">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Block type badge */}
                              <div className={`absolute -top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground ${
                                selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              } transition-opacity`}>
                                {block.type}
                              </div>

                              <div className="px-3 py-2">
                                <BlockPreview block={block} />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {blocks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Start building your email</p>
                          <p className="text-xs text-muted-foreground mt-1">Click blocks from the left palette to add them here</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* RIGHT: Properties Panel */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Block Properties</h3>
            </div>
            {selectedBlock ? (
              <div>
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">{selectedBlock.type}</span>
                  <span className="text-xs text-muted-foreground">ID: {selectedBlock.id}</span>
                </div>
                <BlockEditor
                  block={selectedBlock}
                  onChange={(props) => updateBlockProps(selectedBlock.id, props)}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                  <MousePointerClick className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Click a block on the canvas to edit its properties</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
