import { useState, useEffect } from "react";
import { Megaphone, Loader2, Bell, Calendar, Info } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function EmployeeAnnouncements() {
  const { tenantId, supabase } = useTenant();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("type", "announcement")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setAnnouncements(data || []);
        setLoading(false);
      });
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Company-wide news and updates</p>
      </div>

      {announcements.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-xl">
          <Megaphone className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No announcements yet</p>
          <p className="text-xs text-muted-foreground mt-1">Company announcements will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.message}</p>
                  {a.module && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] px-2 py-0.5 rounded-full bg-info/10 text-info font-medium">
                      <Info className="h-3 w-3" /> {a.module}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
