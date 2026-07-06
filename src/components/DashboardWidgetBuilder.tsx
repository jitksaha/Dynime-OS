// @ts-nocheck
import { useState, useEffect } from "react";
import { Plus, X, GripVertical, BarChart3, Users, DollarSign, TrendingUp, Activity, Package, Loader2, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Widget {
  id: string;
  type: string;
  title: string;
  size: "small" | "medium" | "large";
  enabled: boolean;
}

const AVAILABLE_WIDGETS: Widget[] = [
  { id: "revenue", type: "metric", title: "Revenue Overview", size: "medium", enabled: true },
  { id: "employees", type: "metric", title: "Employee Count", size: "small", enabled: true },
  { id: "deals", type: "chart", title: "Deal Pipeline", size: "large", enabled: true },
  { id: "expenses", type: "metric", title: "Expenses This Month", size: "small", enabled: true },
  { id: "activity", type: "feed", title: "Recent Activity", size: "large", enabled: true },
  { id: "ai_insights", type: "ai", title: "AI Insights", size: "large", enabled: true },
  { id: "tickets", type: "metric", title: "Open Tickets", size: "small", enabled: true },
  { id: "invoices", type: "metric", title: "Pending Invoices", size: "small", enabled: true },
  { id: "attendance", type: "chart", title: "Attendance Overview", size: "medium", enabled: true },
  { id: "projects", type: "metric", title: "Active Projects", size: "small", enabled: true },
];

const WIDGET_ICONS: Record<string, React.ElementType> = {
  revenue: DollarSign, employees: Users, deals: TrendingUp, expenses: DollarSign,
  activity: Activity, ai_insights: BarChart3, tickets: Package, invoices: DollarSign,
  attendance: Users, projects: Package,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (widgets: Widget[]) => void;
  currentWidgets?: Widget[];
}

export function DashboardWidgetBuilder({ open, onClose, onSave, currentWidgets }: Props) {
  const { user, profile } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>(currentWidgets || AVAILABLE_WIDGETS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentWidgets?.length) setWidgets(currentWidgets);
  }, [currentWidgets]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const changeSize = (id: string, size: Widget["size"]) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(widgets);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setWidgets(items);
  };

  const save = async () => {
    setSaving(true);
    if (user && profile?.tenant_id) {
      await supabase.from("dashboard_widget_configs").upsert({
        user_id: user.id,
        tenant_id: profile.tenant_id,
        widgets: widgets as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,tenant_id" });
    }
    onSave(widgets);
    toast.success("Dashboard layout saved!");
    setSaving(false);
    onClose();
  };

  const reset = () => {
    setWidgets(AVAILABLE_WIDGETS);
    toast.info("Reset to default layout");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">Customize Dashboard</h2>
            <p className="text-xs text-muted-foreground">Drag to reorder, toggle visibility, resize widgets</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="widgets">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {widgets.map((widget, index) => {
                    const Icon = WIDGET_ICONS[widget.id] || Package;
                    return (
                      <Draggable key={widget.id} draggableId={widget.id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              widget.enabled ? "border-border bg-background" : "border-border/50 bg-muted/20 opacity-60"
                            }`}
                          >
                            <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <Icon className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{widget.title}</p>
                            </div>
                            <select
                              value={widget.size}
                              onChange={e => changeSize(widget.id, e.target.value as Widget["size"])}
                              className="text-xs px-2 py-1 rounded-lg border border-input bg-background"
                            >
                              <option value="small">S</option>
                              <option value="medium">M</option>
                              <option value="large">L</option>
                            </select>
                            <button
                              onClick={() => toggleWidget(widget.id)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${widget.enabled ? "bg-primary" : "bg-muted"}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${widget.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                            </button>
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
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border shrink-0">
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/50">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
}