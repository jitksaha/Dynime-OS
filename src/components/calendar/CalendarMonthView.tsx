import { useMemo } from "react";
import { CALENDAR_EVENT_TYPES } from "@/hooks/useCalendarSync";

interface CalendarMonthViewProps {
  currentDate: Date;
  events: any[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: any) => void;
}

export function CalendarMonthView({ currentDate, events, onDateClick, onEventClick }: CalendarMonthViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();

    const result: { date: Date; isCurrentMonth: boolean; events: any[] }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(y, m - 1, prevMonthDays - i);
      result.push({ date: d, isCurrentMonth: false, events: [] });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const dayEvents = events.filter((e) => {
        const eDate = new Date(e.start_time);
        return eDate.getFullYear() === y && eDate.getMonth() === m && eDate.getDate() === d;
      });
      result.push({ date, isCurrentMonth: true, events: dayEvents });
    }

    // Next month padding
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      result.push({ date: new Date(y, m + 1, i), isCurrentMonth: false, events: [] });
    }

    return result;
  }, [currentDate, events]);

  const getColor = (type: string) =>
    CALENDAR_EVENT_TYPES[type as keyof typeof CALENDAR_EVENT_TYPES]?.color || "#6B7280";

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div key={d} className="px-2 py-2.5 text-[11px] font-semibold text-muted-foreground text-center tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isToday = cell.date.getTime() === today.getTime();
          return (
            <div
              key={i}
              onClick={() => onDateClick(cell.date)}
              className={`min-h-[100px] border-b border-r border-border/40 p-1.5 cursor-pointer transition-colors hover:bg-primary/5 ${
                !cell.isCurrentMonth ? "bg-muted/30" : "bg-card"
              }`}
            >
              <div className="flex justify-end">
                <span
                  className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-primary text-primary-foreground font-bold"
                      : cell.isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-0.5 mt-1">
                {cell.events.slice(0, 3).map((ev: any) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="text-[11px] leading-tight truncate rounded px-1.5 py-0.5 text-white cursor-pointer hover:brightness-110 transition-all"
                    style={{ backgroundColor: getColor(ev.event_type) }}
                    title={ev.title}
                  >
                    {!ev.all_day && (
                      <span className="opacity-80">
                        {new Date(ev.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{" "}
                      </span>
                    )}
                    {ev.title}
                  </div>
                ))}
                {cell.events.length > 3 && (
                  <div className="text-[10px] text-primary font-medium px-1.5 cursor-pointer hover:underline">
                    +{cell.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
