// @ts-nocheck
import { useState, useEffect } from "react";
import { Package, Plus, Pencil, Trash2, Save, X, Search, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface PlatformModule {
  id: string;
  name: string;
  label: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const DEFAULT_MODULES = [
  { name: "hrms", label: "HRM", description: "Employee management, attendance, shifts, payroll, leave, recruitment", icon: "users" },
  { name: "crm", label: "CRM", description: "Sales pipeline, deal tracking, contact management", icon: "handshake" },
  { name: "marketing", label: "Marketing", description: "Campaigns, email templates, analytics", icon: "megaphone" },
  { name: "workflows", label: "Workflows", description: "Automation builder with triggers and actions", icon: "workflow" },
  { name: "accounting", label: "Accounting", description: "Invoices, expenses, payments, tax management", icon: "calculator" },
  { name: "helpdesk", label: "Helpdesk", description: "Ticket management and customer support", icon: "headphones" },
  { name: "projects", label: "Projects", description: "Task boards, team collaboration", icon: "kanban" },
  { name: "documents", label: "Documents", description: "File storage and document sharing", icon: "file" },
  { name: "reports", label: "Reports", description: "Business intelligence and analytics", icon: "bar-chart" },
  { name: "wallet", label: "Wallet", description: "Payment terminal, transfers, payment links, payouts", icon: "wallet" },
  { name: "product_hub", label: "Point of Sale (POS)", description: "Product catalog, orders, POS terminal, courier integration", icon: "shopping-bag" },
  { name: "bookings", label: "Booking & Appointments", description: "Schedule meetings, room bookings, client appointments, calendar sync", icon: "calendar-check" },
  { name: "e_signatures", label: "E-Signatures", description: "Document signing workflows, templates, audit trails, legally binding signatures", icon: "pen-tool" },
  { name: "knowledge_base", label: "Knowledge Base", description: "Self-service articles, FAQ sections, searchable documentation", icon: "book-open" },
];

export default function DynamicModuleManager() {
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", description: "", icon: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", label: "", description: "", icon: "package" });

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from("platform_modules" as any)
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setModules((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const toggleActive = async (mod: PlatformModule) => {
    const newState = !mod.is_active;
    setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_active: newState } : m));

    const { error } = await supabase
      .from("platform_modules" as any)
      .update({ is_active: newState } as any)
      .eq("id", mod.id);

    if (error) {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_active: mod.is_active } : m));
      toast.error(error.message);
    } else {
      toast.success(`${mod.label} ${newState ? "activated" : "deactivated"}`);
    }
  };

  const startEdit = (mod: PlatformModule) => {
    setEditingId(mod.id);
    setEditForm({ label: mod.label, description: mod.description, icon: mod.icon });
  };

  const saveEdit = async (mod: PlatformModule) => {
    const { error } = await supabase
      .from("platform_modules" as any)
      .update({ label: editForm.label, description: editForm.description, icon: editForm.icon } as any)
      .eq("id", mod.id);

    if (error) {
      toast.error(error.message);
    } else {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, ...editForm } : m));
      toast.success("Module updated");
    }
    setEditingId(null);
  };

  const deleteModule = async (mod: PlatformModule) => {
    if (!confirm(`Delete module "${mod.label}"? This will remove it from all plans and tenants.`)) return;

    const { error } = await supabase.from("platform_modules" as any).delete().eq("id", mod.id);
    if (error) {
      toast.error(error.message);
    } else {
      setModules(prev => prev.filter(m => m.id !== mod.id));
      toast.success("Module deleted");
    }
  };

  const addModule = async () => {
    if (!addForm.name || !addForm.label) {
      toast.error("Name and label are required");
      return;
    }

    const maxOrder = modules.length > 0 ? Math.max(...modules.map(m => m.sort_order)) + 1 : 0;

    const { data, error } = await supabase
      .from("platform_modules" as any)
      .insert({
        name: addForm.name.toLowerCase().replace(/\s+/g, "_"),
        label: addForm.label,
        description: addForm.description,
        icon: addForm.icon || "package",
        sort_order: maxOrder,
        is_active: true,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setModules(prev => [...prev, data as any]);
      setAddForm({ name: "", label: "", description: "", icon: "package" });
      setShowAdd(false);
      toast.success("Module added");
    }
  };

  const seedDefaults = async () => {
    const existing = modules.map(m => m.name);
    const toInsert = DEFAULT_MODULES
      .filter(d => !existing.includes(d.name))
      .map((d, i) => ({
        name: d.name,
        label: d.label,
        description: d.description,
        icon: d.icon,
        sort_order: modules.length + i,
        is_active: true,
      }));

    if (toInsert.length === 0) {
      toast.info("All default modules already exist");
      return;
    }

    const { error } = await supabase.from("platform_modules" as any).insert(toInsert as any);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${toInsert.length} modules seeded`);
      fetchModules();
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(filtered);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    const updated = items.map((item, i) => ({ ...item, sort_order: i }));
    setModules(prev => {
      const ids = new Set(updated.map(u => u.id));
      return [...updated, ...prev.filter(m => !ids.has(m.id))];
    });

    for (const item of updated) {
      await supabase.from("platform_modules" as any).update({ sort_order: item.sort_order } as any).eq("id", item.id);
    }
  };

  const filtered = modules
    .filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dynamic Module Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Add, edit, reorder, and toggle platform modules globally</p>
        </div>
        <div className="flex items-center gap-2">
          {modules.length === 0 && (
            <button
              onClick={seedDefaults}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Package className="h-3.5 w-3.5" />
              Seed Defaults
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Module
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold text-foreground">New Module</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Module key (e.g. inventory)" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Display label (e.g. Inventory)" value={addForm.label} onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Description" value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" />
            <input placeholder="Icon name (e.g. package)" value={addForm.icon} onChange={e => setAddForm(p => ({ ...p, icon: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-2">
            <button onClick={addModule} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"><Save className="h-3.5 w-3.5" /> Save</button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80"><X className="h-3.5 w-3.5" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search modules..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{modules.length}</p>
          <p className="text-xs text-muted-foreground">Total Modules</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-success">{modules.filter(m => m.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-muted-foreground">{modules.filter(m => !m.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Inactive</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No modules found</p>
          {modules.length === 0 && (
            <button onClick={seedDefaults} className="mt-3 text-xs text-primary hover:underline">Click to seed default modules</button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="modules-list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {filtered.map((mod, index) => (
                  <Draggable key={mod.id} draggableId={mod.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`flex items-center gap-3 p-4 rounded-xl border border-border bg-card transition-shadow ${snapshot.isDragging ? "shadow-lg" : ""}`}
                      >
                        <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className={`p-2 rounded-lg shrink-0 ${mod.is_active ? "bg-primary/10" : "bg-secondary"}`}>
                          <Package className={`h-4 w-4 ${mod.is_active ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        {editingId === mod.id ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
                            <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
                            <div className="flex gap-1.5">
                              <input value={editForm.icon} onChange={e => setEditForm(p => ({ ...p, icon: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm flex-1" placeholder="Icon" />
                              <button onClick={() => saveEdit(mod)} className="h-8 px-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"><Save className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setEditingId(null)} className="h-8 px-2 rounded-md bg-secondary hover:bg-secondary/80"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{mod.label}</p>
                              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{mod.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                          {editingId !== mod.id && (
                            <>
                              <button onClick={() => startEdit(mod)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => deleteModule(mod)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                          <button onClick={() => toggleActive(mod)} className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${mod.is_active ? "bg-success" : "bg-secondary"}`}>
                            <span className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${mod.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                          </button>
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
  );
}
