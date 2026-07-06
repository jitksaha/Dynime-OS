import { useState, useEffect } from "react";
import { Activity, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";

interface AuditLog {
  id: string;
  action: string;
  module: string | null;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
  details: any;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setLogs(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.module || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">System-wide activity log</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No audit logs recorded yet</p>
          </div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{log.action}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {log.module && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{log.module}</span>}
                  {log.resource_type && <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs">{log.resource_type}</span>}
                  {log.ip_address && <span className="text-xs text-muted-foreground">IP: {log.ip_address}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
