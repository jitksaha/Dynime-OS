import { useState, useEffect, useCallback } from "react";
import { CalendarCheck, Plus, Clock, MapPin, User, Mail, Pencil, Trash2, X, Copy, Check, ExternalLink, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySwitcher } from "@/hooks/useCompanySwitcher";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { toast } from "sonner";
import { format } from "date-fns";

interface Booking {
  id: string;
  title: string;
  description: string | null;
  booking_type: string;
  status: string;
  start_time: string;
  end_time: string;
  location: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  attendee_phone: string | null;
  notes: string | null;
  is_public_booking: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

const BOOKING_TYPES = ["meeting", "appointment", "consultation", "room_booking", "demo", "interview"];

export default function Bookings() {
  const { profile, user } = useAuth();
  const { companies, currentTenantId } = useCompanySwitcher();
  const { createEvent } = useCalendarSync();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", booking_type: "meeting", start_time: "", end_time: "",
    location: "", attendee_name: "", attendee_email: "", attendee_phone: "", notes: "",
  });

  const tenantId = profile?.tenant_id;
  const currentCompany = companies.find(c => c.tenant_id === currentTenantId);
  const bookingUrl = `${window.location.origin}/book/${currentCompany?.slug || ""}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success("Booking link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchBookings = useCallback(async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("bookings" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_time", { ascending: true });
    if (error) toast.error(error.message);
    else setBookings((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const resetForm = () => {
    setForm({ title: "", description: "", booking_type: "meeting", start_time: "", end_time: "", location: "", attendee_name: "", attendee_email: "", attendee_phone: "", notes: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.start_time || !form.end_time) {
      toast.error("Title, start time and end time are required");
      return;
    }
    if (!tenantId || !user?.id) return;

    const payload = { ...form, tenant_id: tenantId, created_by: user.id };

    if (editingId) {
      const { error } = await supabase.from("bookings" as any).update(payload as any).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Booking updated"); resetForm(); fetchBookings(); }
    } else {
      const { error } = await supabase.from("bookings" as any).insert(payload as any);
      if (error) toast.error(error.message);
      else {
        // Auto-sync to calendar
        await createEvent({
          title: `Booking: ${form.title}`,
          description: form.description || undefined,
          event_type: "meeting",
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          location: form.location || undefined,
          source_module: "bookings",
          attendees: form.attendee_email ? [form.attendee_email] : [],
        }, false);
        toast.success("Booking created & added to calendar");
        resetForm();
        fetchBookings();
      }
    }
  };

  const startEdit = (b: Booking) => {
    setForm({
      title: b.title, description: b.description || "", booking_type: b.booking_type,
      start_time: b.start_time.slice(0, 16), end_time: b.end_time.slice(0, 16),
      location: b.location || "", attendee_name: b.attendee_name || "",
      attendee_email: b.attendee_email || "", attendee_phone: b.attendee_phone || "", notes: b.notes || "",
    });
    setEditingId(b.id);
    setShowForm(true);
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchBookings(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings" as any).update({ status } as any).eq("id", id);
    if (error) toast.error(error.message);
    else fetchBookings();
  };

  const filtered = bookings.filter(b => filter === "all" || b.status === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" /> Booking & Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and manage all your appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Public Link"}
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> New Booking
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["all", "confirmed", "pending", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`p-3 rounded-xl border text-center transition-colors ${filter === s ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
            <p className="text-2xl font-bold text-foreground">{s === "all" ? bookings.length : bookings.filter(b => b.status === s).length}</p>
            <p className="text-xs text-muted-foreground capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editingId ? "Edit Booking" : "New Booking"}</p>
            <button onClick={resetForm} className="p-1 rounded-md hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <select value={form.booking_type} onChange={e => setForm(p => ({ ...p, booking_type: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {BOOKING_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
            <input type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="datetime-local" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Attendee Name" value={form.attendee_name} onChange={e => setForm(p => ({ ...p, attendee_name: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Attendee Email" value={form.attendee_email} onChange={e => setForm(p => ({ ...p, attendee_email: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Attendee Phone" value={form.attendee_phone} onChange={e => setForm(p => ({ ...p, attendee_phone: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" rows={2} />
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" rows={2} />
          </div>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            {editingId ? "Update" : "Create"} Booking
          </button>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || "bg-secondary text-foreground"}`}>{b.status}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{b.booking_type.replace(/_/g, " ")}</span>
                    {b.is_public_booking && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Public</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(b.start_time), "MMM d, yyyy h:mm a")} – {format(new Date(b.end_time), "h:mm a")}</span>
                    {b.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.location}</span>}
                    {b.attendee_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{b.attendee_name}</span>}
                    {b.attendee_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{b.attendee_email}</span>}
                  </div>
                  {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {b.status === "pending" && (
                    <button onClick={() => updateStatus(b.id, "confirmed")} className="px-2 py-1 text-[10px] font-medium rounded bg-success/10 text-success hover:bg-success/20">Confirm</button>
                  )}
                  {b.status === "confirmed" && (
                    <button onClick={() => updateStatus(b.id, "completed")} className="px-2 py-1 text-[10px] font-medium rounded bg-primary/10 text-primary hover:bg-primary/20">Complete</button>
                  )}
                  <button onClick={() => startEdit(b)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteBooking(b.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
