import { useState, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  GripVertical, Trash2, Copy, Settings2, Plus, Eye, EyeOff,
  Monitor, Tablet, Smartphone, Search, X, Undo2, Redo2,
  ChevronLeft, ChevronRight, PanelRight, Layers,
  Type, FileText, ImageIcon, MousePointerClick, ArrowUpDown, Minus, MapPin,
  Box, Image, Star, Hash, Quote, PanelTop, ChevronDown, ToggleRight, Share2,
  AlertTriangle, List, Megaphone, DollarSign, Timer, BarChart3,
  Play, Images, LayoutGrid, Columns, Grid3x3, TrendingUp, Users, Clock,
  HelpCircle, Building2,
} from "lucide-react";
import type { WidgetInstance, EditorContext } from "./types";
import { WIDGET_REGISTRY, getWidgetsByCategory, CATEGORY_LABELS, getWidgetDef } from "./widgetRegistry";
import { WidgetRenderer } from "./WidgetRenderer";

const ICON_MAP: Record<string, React.ElementType> = {
  Type, FileText, ImageIcon, MousePointerClick, ArrowUpDown, Minus, MapPin,
  Box, Image, Star, Hash, Quote, PanelTop, ChevronDown, ToggleRight, Share2,
  AlertTriangle, List, Megaphone, DollarSign, Timer, BarChart3,
  Play, Images, LayoutGrid, Columns, Grid3x3, TrendingUp, Users, Clock,
  HelpCircle, Building2, Layers,
};

interface VisualEditorProps {
  widgets: WidgetInstance[];
  onChange: (widgets: WidgetInstance[]) => void;
  context?: EditorContext;
}

export default function VisualEditor({ widgets, onChange, context = "page" }: VisualEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"widgets" | "settings">("widgets");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [history, setHistory] = useState<WidgetInstance[][]>([widgets]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const pushHistory = useCallback((newWidgets: WidgetInstance[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newWidgets);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onChange(newWidgets);
  }, [history, historyIndex, onChange]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  }, [history, historyIndex, onChange]);

  const addWidget = useCallback((type: string) => {
    const def = getWidgetDef(type);
    if (!def) return;
    const newWidget: WidgetInstance = { id: crypto.randomUUID(), type, props: { ...def.defaults } };
    const newWidgets = [...widgets, newWidget];
    pushHistory(newWidgets);
    setSelectedId(newWidget.id);
    setSidebarTab("settings");
  }, [widgets, pushHistory]);

  const removeWidget = useCallback((id: string) => {
    pushHistory(widgets.filter((w) => w.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [widgets, selectedId, pushHistory]);

  const duplicateWidget = useCallback((id: string) => {
    const idx = widgets.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const clone: WidgetInstance = { ...widgets[idx], id: crypto.randomUUID(), props: { ...widgets[idx].props } };
    const newWidgets = [...widgets];
    newWidgets.splice(idx + 1, 0, clone);
    pushHistory(newWidgets);
    setSelectedId(clone.id);
  }, [widgets, pushHistory]);

  const updateWidgetProp = useCallback((id: string, key: string, value: any) => {
    const newWidgets = widgets.map((w) => w.id === id ? { ...w, props: { ...w.props, [key]: value } } : w);
    pushHistory(newWidgets);
  }, [widgets, pushHistory]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const arr = Array.from(widgets);
    const [moved] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, moved);
    pushHistory(arr);
  }, [widgets, pushHistory]);

  const selectedWidget = useMemo(() => widgets.find((w) => w.id === selectedId), [widgets, selectedId]);
  const selectedDef = useMemo(() => selectedWidget ? getWidgetDef(selectedWidget.type) : undefined, [selectedWidget]);
  const categories = useMemo(() => getWidgetsByCategory(), []);

  const filteredRegistry = useMemo(() => {
    if (!searchQuery.trim()) return WIDGET_REGISTRY;
    const q = searchQuery.toLowerCase();
    return WIDGET_REGISTRY.filter((w) => w.label.toLowerCase().includes(q) || w.description.toLowerCase().includes(q));
  }, [searchQuery]);

  const deviceWidths: Record<string, string> = { desktop: "100%", tablet: "768px", mobile: "375px" };

  return (
    <div className="flex h-full min-h-[600px] bg-background rounded-xl border border-border overflow-hidden">
      {/* ─── Sidebar ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button onClick={() => setSidebarTab("widgets")} className={`flex-1 py-3 text-xs font-medium transition-colors ${sidebarTab === "widgets" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
              <Plus size={14} className="inline mr-1" /> Widgets
            </button>
            <button onClick={() => setSidebarTab("settings")} className={`flex-1 py-3 text-xs font-medium transition-colors ${sidebarTab === "settings" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
              <Settings2 size={14} className="inline mr-1" /> Settings
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === "widgets" ? (
              <div className="p-3 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search widgets..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className="text-muted-foreground" /></button>}
                </div>

                {/* Widget grid by category */}
                {searchQuery ? (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredRegistry.map((w) => {
                      const Icon = ICON_MAP[w.icon] || Box;
                      return (
                        <button
                          key={w.type}
                          onClick={() => addWidget(w.type)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-center group"
                        >
                          <Icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-[10px] font-medium text-foreground leading-tight">{w.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  Object.entries(categories).map(([cat, catWidgets]) => (
                    <div key={cat}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{CATEGORY_LABELS[cat] || cat}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {catWidgets.map((w) => {
                          const Icon = ICON_MAP[w.icon] || Box;
                          return (
                            <button
                              key={w.type}
                              onClick={() => addWidget(w.type)}
                              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-center group"
                              title={w.description}
                            >
                              <Icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                              <span className="text-[10px] font-medium text-foreground leading-tight">{w.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* ─── Settings Panel ───────────────────────────────── */
              <SettingsPanel widget={selectedWidget} definition={selectedDef} onUpdate={updateWidgetProp} />
            )}
          </div>
        </div>
      )}

      {/* ─── Canvas Area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
              {sidebarOpen ? <ChevronLeft size={16} /> : <PanelRight size={16} />}
            </button>
            <button onClick={undo} disabled={historyIndex === 0} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30"><Undo2 size={16} /></button>
            <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30"><Redo2 size={16} /></button>
            <span className="text-[10px] text-muted-foreground ml-2">{widgets.length} widgets</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([key, Icon]) => (
                <button key={key} onClick={() => setDeviceView(key)} className={`p-1.5 ${deviceView === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
            <button onClick={() => setPreviewMode(!previewMode)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${previewMode ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"}`}>
              {previewMode ? <EyeOff size={14} /> : <Eye size={14} />} {previewMode ? "Edit" : "Preview"}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
          <div className="mx-auto transition-all duration-300" style={{ maxWidth: deviceWidths[deviceView] }}>
            {widgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <Layers size={48} className="text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Start Building</h3>
                <p className="text-sm text-muted-foreground mb-4">Drag widgets from the sidebar to begin designing</p>
                <button onClick={() => { setSidebarOpen(true); setSidebarTab("widgets"); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  Browse Widgets
                </button>
              </div>
            ) : previewMode ? (
              <div className="space-y-4 bg-background rounded-xl border border-border p-6 shadow-sm">
                {widgets.map((w) => <div key={w.id}><WidgetRenderer widget={w} /></div>)}
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="editor-canvas">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {widgets.map((w, i) => (
                        <Draggable key={w.id} draggableId={w.id} index={i}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={`group relative rounded-xl border transition-all ${selectedId === w.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"} bg-background ${snap.isDragging ? "shadow-lg" : ""}`}
                              onClick={() => { setSelectedId(w.id); setSidebarTab("settings"); }}
                            >
                              {/* Widget toolbar */}
                              <div className="absolute -top-3 left-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <div {...prov.dragHandleProps} className="p-1 rounded bg-card border border-border shadow-sm cursor-grab"><GripVertical size={12} className="text-muted-foreground" /></div>
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-card border border-border rounded shadow-sm text-muted-foreground">{getWidgetDef(w.type)?.label || w.type}</span>
                              </div>
                              <div className="absolute -top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={(e) => { e.stopPropagation(); duplicateWidget(w.id); }} className="p-1 rounded bg-card border border-border shadow-sm hover:bg-muted"><Copy size={12} className="text-muted-foreground" /></button>
                                <button onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }} className="p-1 rounded bg-card border border-border shadow-sm hover:bg-destructive hover:text-destructive-foreground"><Trash2 size={12} className="text-muted-foreground" /></button>
                              </div>
                              <div className="p-4">
                                <WidgetRenderer widget={w} />
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel Component ─────────────────────────────────────

function SettingsPanel({
  widget,
  definition,
  onUpdate,
}: {
  widget?: WidgetInstance;
  definition?: ReturnType<typeof getWidgetDef>;
  onUpdate: (id: string, key: string, value: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");

  if (!widget || !definition) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Settings2 size={32} className="text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Select a widget to edit its settings</p>
      </div>
    );
  }

  const tabSettings = definition.settings.filter((s) => (s.tab || "content") === activeTab);

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-foreground">{definition.label}</span>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[10px] font-medium capitalize ${activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Settings */}
      <div className="space-y-3">
        {tabSettings.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No {activeTab} settings</p>
        )}
        {tabSettings.map((setting) => (
          <SettingField key={setting.key} setting={setting} value={widget.props[setting.key]} onChange={(val) => onUpdate(widget.id, setting.key, val)} />
        ))}
      </div>
    </div>
  );
}

// ─── Setting Field Renderer ───────────────────────────────────────

function SettingField({ setting, value, onChange }: { setting: any; value: any; onChange: (val: any) => void }) {
  switch (setting.type) {
    case "text":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={setting.placeholder} className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary" />
        </div>
      );
    case "textarea":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary resize-y" />
        </div>
      );
    case "number":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary" />
        </div>
      );
    case "color":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
            <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Inherit" className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary" />
            {value && <button onClick={() => onChange("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
          </div>
        </div>
      );
    case "select":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary">
            {(setting.options || []).map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      );
    case "toggle":
      return (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <button
            onClick={() => onChange(!value)}
            className={`relative w-9 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
      );
    case "slider":
      return (
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
            <span className="text-[10px] text-muted-foreground">{value ?? setting.min ?? 0}</span>
          </div>
          <input type="range" min={setting.min || 0} max={setting.max || 100} step={setting.step || 1} value={value ?? setting.min ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-1 accent-primary" />
        </div>
      );
    case "url":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <input type="url" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary" />
        </div>
      );
    case "alignment":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <div className="flex gap-1 mt-1">
            {["left", "center", "right"].map((a) => (
              <button key={a} onClick={() => onChange(a)} className={`flex-1 py-1.5 text-[10px] rounded-md capitalize ${value === a ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      );
    case "items":
      return (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{setting.label}</label>
          <p className="text-[10px] text-muted-foreground mt-1">
            {Array.isArray(value) ? `${value.length} items configured` : "No items"}
          </p>
          <button onClick={() => {
            const items = Array.isArray(value) ? [...value] : [];
            items.push(items.length > 0 ? { ...items[0] } : { title: "New Item", content: "Content" });
            onChange(items);
          }} className="mt-1 text-[10px] text-primary hover:underline">+ Add item</button>
        </div>
      );
    default:
      return null;
  }
}
