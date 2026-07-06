import { useState } from "react";
import { X, Clock, MapPin, Type, AlignLeft, Tag } from "lucide-react";
import { CALENDAR_EVENT_TYPES } from "@/hooks/useCalendarSync";

interface CalendarEventModalProps {
  initialDate?: Date;
  event?: any; // for viewing/editing existing events
  onClose: () => void;
  onCreate: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function CalendarEventModal({ initialDate, event, onClose, onCreate, onDelete }: CalendarEventModalProps) {
  const isEditing = !!event;

  const toLocalDatetime = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    title: event?.title || "",
    description: event?.description || "",
    start_time: event?.start_time ? toLocalDatetime(new Date(event.start_time)) : initialDate ? toLocalDatetime(initialDate) : "",
    end_time: event?.end_time ? toLocalDatetime(new Date(event.end_time)) : initialDate ? toLocalDatetime(new Date(initialDate.getTime() + 3600000)) : "",
    location: event?.location || "",
    event_type: event?.event_type || "meeting",
    all_day: event?.all_day || false,
  });

  const handleSubmit = () => {
    if (!form.title || !form.start_time) return;
    onCreate(form);
  };

  const getColor = (type: string) =>
    CALENDAR_EVENT_TYPES[type as keyof typeof CALENDAR_EVENT_TYPES]?.color || "#6B7280";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar */}
        <div className="h-2" style={{ backgroundColor: getColor(form.event_type) }} />

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? "Event Details" : "Create Event"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Title */}
          <div className="flex items-center gap-3">
            <Type className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Add title"
              className="w-full text-lg font-medium bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
              autoFocus
            />
          </div>

          {/* Event type */}
          <div className="flex items-center gap-3">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
            >
              {Object.entries(CALENDAR_EVENT_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          {/* All day toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">All day</span>
          </label>

          {/* Date/time */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Start</label>
                <input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.all_day ? form.start_time.split("T")[0] : form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">End</label>
                <input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.all_day ? form.end_time.split("T")[0] : form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Add location"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
            />
          </div>

          {/* Description */}
          <div className="flex items-start gap-3">
            <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add description"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {isEditing && onDelete && (
                <button
                  onClick={() => onDelete(event.id)}
                  className="px-4 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              {!isEditing && (
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: getColor(form.event_type) }}
                >
                  Create Event
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
