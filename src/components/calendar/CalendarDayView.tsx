import { useMemo } from "react";
import { CALENDAR_EVENT_TYPES } from "@/hooks/useCalendarSync";

interface CalendarDayViewProps {
  currentDate: Date;
  events: any[];
  onTimeClick: (date: Date) => void;
  onEventClick: (event: any) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarDayView({ currentDate, events, onTimeClick, onEventClick }: CalendarDayViewProps) {
  const dayEvents = useMemo(() => {
    return events.filter((e) => {
      const d = new Date(e.start_time);
      return d.getDate() === currentDate.getDate() && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  }, [currentDate, events]);

  const getColor = (type: string) =>
    CALENDAR_EVENT_TYPES[type as keyof typeof CALENDAR_EVENT_TYPES]?.color || "#6B7280";

  const allDayEvents = dayEvents.filter((e) => e.all_day);
  const timedEvents = dayEvents.filter((e) => !e.all_day);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* All-day section */}
      {allDayEvents.length > 0 && (
        <div className="flex items-start border-b border-border">
          <div className="w-[60px] border-r border-border text-[10px] text-muted-foreground flex items-center justify-center py-2">
            ALL DAY
          </div>
          <div className="flex-1 p-1.5 flex flex-wrap gap-1">
            {allDayEvents.map((ev: any) => (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="text-xs truncate rounded px-2 py-1 text-white cursor-pointer hover:brightness-110"
                style={{ backgroundColor: getColor(ev.event_type) }}
              >
                {ev.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => {
          const hourEvents = timedEvents.filter((e) => new Date(e.start_time).getHours() === hour);
          return (
            <div key={hour} className="flex border-b border-border/30">
              <div className="w-[60px] border-r border-border text-[10px] text-muted-foreground flex items-start justify-end pr-2 pt-0.5 h-[56px] shrink-0">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              <div
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setHours(hour, 0, 0, 0);
                  onTimeClick(d);
                }}
                className="flex-1 h-[56px] p-1 cursor-pointer hover:bg-primary/5 transition-colors relative"
              >
                {hourEvents.map((ev: any) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="text-xs rounded px-2 py-1 text-white cursor-pointer hover:brightness-110 mb-0.5"
                    style={{ backgroundColor: getColor(ev.event_type) }}
                  >
                    <span className="font-medium">{ev.title}</span>
                    <span className="opacity-80 ml-2">
                      {new Date(ev.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {ev.end_time && ` – ${new Date(ev.end_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
