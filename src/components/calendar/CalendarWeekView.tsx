import { useMemo } from "react";
import { CALENDAR_EVENT_TYPES } from "@/hooks/useCalendarSync";

interface CalendarWeekViewProps {
  currentDate: Date;
  events: any[];
  onTimeClick: (date: Date) => void;
  onEventClick: (event: any) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarWeekView({ currentDate, events, onTimeClick, onEventClick }: CalendarWeekViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const getColor = (type: string) =>
    CALENDAR_EVENT_TYPES[type as keyof typeof CALENDAR_EVENT_TYPES]?.color || "#6B7280";

  const getEventsForDayHour = (day: Date, hour: number) => {
    return events.filter((e) => {
      const d = new Date(e.start_time);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear() && d.getHours() === hour;
    });
  };

  const getAllDayEvents = (day: Date) => {
    return events.filter((e) => {
      if (!e.all_day) return false;
      const d = new Date(e.start_time);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
    });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="border-r border-border" />
        {weekDays.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          return (
            <div key={i} className={`text-center py-2 border-r border-border/40 ${isToday ? "bg-primary/5" : ""}`}>
              <div className="text-[11px] font-medium text-muted-foreground tracking-wider">
                {day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
              </div>
              <div className={`text-lg font-semibold mt-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="border-r border-border text-[10px] text-muted-foreground flex items-center justify-center">
          ALL DAY
        </div>
        {weekDays.map((day, i) => {
          const allDay = getAllDayEvents(day);
          return (
            <div key={i} className="border-r border-border/40 p-1 min-h-[28px]">
              {allDay.slice(0, 2).map((ev: any) => (
                <div
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="text-[10px] truncate rounded px-1 py-0.5 text-white cursor-pointer mb-0.5"
                  style={{ backgroundColor: getColor(ev.event_type) }}
                >
                  {ev.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30">
            <div className="border-r border-border text-[10px] text-muted-foreground flex items-start justify-end pr-2 pt-0.5 h-[48px]">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
            {weekDays.map((day, di) => {
              const hourEvents = getEventsForDayHour(day, hour);
              return (
                <div
                  key={di}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(hour, 0, 0, 0);
                    onTimeClick(d);
                  }}
                  className="border-r border-border/30 h-[48px] p-0.5 cursor-pointer hover:bg-primary/5 transition-colors relative"
                >
                  {hourEvents.map((ev: any) => (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className="text-[10px] truncate rounded px-1 py-0.5 text-white cursor-pointer absolute inset-x-0.5 top-0.5"
                      style={{ backgroundColor: getColor(ev.event_type) }}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
