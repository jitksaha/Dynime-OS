import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { Clock, Plus, Edit, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  id: string;
  action: string;
  module: string | null;
  details: any;
  created_at: string;
  user_id: string | null;
}

interface ActivityTimelineProps {
  resourceType: string;
  resourceId: string;
  className?: string;
  limit?: number;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  INSERT: { icon: Plus, color: "text-success", label: "Created" },
  UPDATE: { icon: Edit, color: "text-primary", label: "Updated" },
  DELETE: { icon: Trash2, color: "text-destructive", label: "Deleted" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ActivityTimeline({ resourceType, resourceId, className, limit = 20 }: ActivityTimelineProps) {
  const { tenantId } = useTenant();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (data) setEntries(data as TimelineEntry[]);
      setLoading(false);
    };
    fetch();
  }, [tenantId, resourceType, resourceId, limit]);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 bg-muted rounded" />
              <div className="h-2.5 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  const getChangeSummary = (entry: TimelineEntry) => {
    if (entry.action === "INSERT") return "Record created";
    if (entry.action === "DELETE") return "Record deleted";
    if (entry.action === "UPDATE" && entry.details?.old && entry.details?.new) {
      const oldD = entry.details.old;
      const newD = entry.details.new;
      const changed = Object.keys(newD).filter(
        (k) => !["updated_at", "created_at"].includes(k) && JSON.stringify(oldD[k]) !== JSON.stringify(newD[k])
      );
      if (changed.length === 0) return "Record updated";
      if (changed.length <= 3) return `Changed: ${changed.join(", ")}`;
      return `${changed.length} fields updated`;
    }
    return "Record updated";
  };

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {entries.map((entry) => {
          const config = actionConfig[entry.action] || actionConfig.UPDATE;
          const Icon = config.icon;
          return (
            <div key={entry.id} className="relative flex gap-3 pl-1">
              <div className={cn("relative z-10 flex items-center justify-center h-8 w-8 rounded-full border-2 border-background bg-card shrink-0", config.color)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(entry.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{getChangeSummary(entry)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
