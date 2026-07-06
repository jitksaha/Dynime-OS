// @ts-nocheck
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Clock, DollarSign, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface BookingService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  is_active: boolean;
  color: string;
  sort_order: number;
}

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];

export default function BookingServices() {
  const { tenantId, userId } = useTenant();
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", duration_minutes: 60, price: 0, currency: "USD", color: "#4F46E5", is_active: true,
  });

  const fetchServices = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("booking_services" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setServices((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [tenantId]);

  const resetForm = () => {
    setForm({ name: "", description: "", duration_minutes: 60, price: 0, currency: "USD", color: "#4F46E5", is_active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Service name is required"); return; }
    if (!tenantId || !userId) return;

    const payload = { ...form, tenant_id: tenantId, created_by: userId, sort_order: services.length };

    if (editingId) {
      const { error } = await supabase.from("booking_services" as any).update(payload as any).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Service updated"); resetForm(); fetchServices(); }
    } else {
      const { error } = await supabase.from("booking_services" as any).insert(payload as any);
      if (error) toast.error(error.message);
      else { toast.success("Service created"); resetForm(); fetchServices(); }
    }
  };

  const startEdit = (s: BookingService) => {
    setForm({ name: s.name, description: s.description || "", duration_minutes: s.duration_minutes, price: s.price, currency: s.currency, color: s.color, is_active: s.is_active });
    setEditingId(s.id);
    setShowForm(true);
  };

  const deleteService = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    const { error } = await supabase.from("booking_services" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchServices(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("booking_services" as any).update({ is_active: !active } as any).eq("id", id);
    if (error) toast.error(error.message);
    else fetchServices();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" /> Booking Services
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Define services customers can book on your public page</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Service
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editingId ? "Edit Service" : "New Service"}</p>
            <button onClick={resetForm} className="p-1 rounded-md hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Service Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-2">
              <input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring flex-1" />
              <input type="number" placeholder="Price" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring flex-1" />
            </div>
            <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" rows={2} />
            <div className="flex items-center gap-2 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Color:</span>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} className={`h-6 w-6 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            {editingId ? "Update" : "Create"} Service
          </button>
        </div>
      )}

      {services.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No services yet. Add services that customers can book.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
              <div className="h-8 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                  {!s.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
                  {s.price > 0 && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{s.price} {s.currency}</span>}
                </div>
                {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleActive(s.id, s.is_active)} className={`px-2 py-1 text-[10px] font-medium rounded ${s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {s.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => startEdit(s)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => deleteService(s.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
