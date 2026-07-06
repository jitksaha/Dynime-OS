// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useCalendarSync, CALENDAR_EVENT_TYPES } from "@/hooks/useCalendarSync";

import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarEventModal } from "@/components/calendar/CalendarEventModal";
import { GoogleConnectDialog } from "@/components/calendar/GoogleConnectDialog";

export default function CalendarEvents() {
  const { tenantId } = useTenant();
  const { createEvent, deleteEvent } = useCalendarSync();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>("all");

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("calendar_events" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_time", { ascending: true });
    setEvents((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  const checkGoogleStatus = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("tenant_integrations" as any)
      .select("is_enabled")
      .eq("tenant_id", tenantId)
      .eq("integration_key", "google_calendar")
      .single();
    setIsGoogleConnected(!!(data as any)?.is_enabled);
  }, [tenantId]);

  useEffect(() => { fetchEvents(); checkGoogleStatus(); }, [fetchEvents, checkGoogleStatus]);

  const filteredEvents = useMemo(() => {
    if (filterType === "all") return events;
    return events.filter((e: any) => e.event_type === filterType);
  }, [events, filterType]);

  const handleNavigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) {
      setCurrentDate(new Date());
      return;
    }
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setSelectedDate(undefined);
    setShowEventModal(true);
  };

  const handleCreate = async (form: any) => {
    const startTime = form.all_day
      ? new Date(form.start_time + "T00:00:00").toISOString()
      : new Date(form.start_time).toISOString();
    const endTime = form.end_time
      ? form.all_day
        ? new Date(form.end_time + "T23:59:59").toISOString()
        : new Date(form.end_time).toISOString()
      : new Date(new Date(startTime).getTime() + 3600000).toISOString();

    await createEvent({
      title: form.title,
      description: form.description,
      event_type: form.event_type,
      start_time: startTime,
      end_time: endTime,
      all_day: form.all_day,
      location: form.location,
    });
    setShowEventModal(false);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    setShowEventModal(false);
    fetchEvents();
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" /> Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Business events synced from deals, HR, invoices, projects & more
        </p>
      </div>

      {/* Header controls */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onNavigate={handleNavigate}
        onNewEvent={() => { setSelectedDate(new Date()); setSelectedEvent(null); setShowEventModal(true); }}
        isGoogleConnected={isGoogleConnected}
        onToggleGoogle={() => setShowGoogleDialog(true)}
      />

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFilterType("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            filterType === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          All
        </button>
        {Object.entries(CALENDAR_EVENT_TYPES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              filterType === key ? "text-white border-transparent" : "border-border text-muted-foreground hover:bg-muted"
            }`}
            style={filterType === key ? { backgroundColor: val.color } : {}}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Calendar view */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "month" ? (
        <CalendarMonthView
          currentDate={currentDate}
          events={filteredEvents}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      ) : viewMode === "week" ? (
        <CalendarWeekView
          currentDate={currentDate}
          events={filteredEvents}
          onTimeClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      ) : (
        <CalendarDayView
          currentDate={currentDate}
          events={filteredEvents}
          onTimeClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      )}

      {/* Event modal */}
      {showEventModal && (
        <CalendarEventModal
          initialDate={selectedDate}
          event={selectedEvent}
          onClose={() => setShowEventModal(false)}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      )}

      {/* Google connect dialog */}
      {showGoogleDialog && tenantId && (
        <GoogleConnectDialog
          tenantId={tenantId}
          isConnected={isGoogleConnected}
          onClose={() => setShowGoogleDialog(false)}
          onStatusChange={(s) => setIsGoogleConnected(s)}
        />
      )}
    </div>
  );
}
