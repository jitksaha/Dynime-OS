import { ChevronLeft, ChevronRight, Plus, Link2, Link2Off } from "lucide-react";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: "month" | "week" | "day";
  onViewChange: (mode: "month" | "week" | "day") => void;
  onNavigate: (dir: -1 | 0 | 1) => void;
  onNewEvent: () => void;
  isGoogleConnected: boolean;
  onToggleGoogle: () => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onViewChange,
  onNavigate,
  onNewEvent,
  isGoogleConnected,
  onToggleGoogle,
}: CalendarHeaderProps) {
  const title =
    viewMode === "day"
      ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : viewMode === "week"
      ? (() => {
          const start = new Date(currentDate);
          start.setDate(start.getDate() - start.getDay());
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        })()
      : currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate(0)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => onNavigate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <button onClick={() => onNavigate(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleGoogle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isGoogleConnected
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {isGoogleConnected ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
          {isGoogleConnected ? "Google Synced" : "Connect Google"}
        </button>

        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["month", "week", "day"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onViewChange(m)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                viewMode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={onNewEvent}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>
    </div>
  );
}
