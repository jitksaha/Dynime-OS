import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCw, Loader2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface AIErrorLog {
  id: string;
  provider: string;
  model: string | null;
  http_status: number | null;
  error_code: string | null;
  error_message: string | null;
  raw_response: any;
  feature: string | null;
  request_summary: string | null;
  created_at: string;
}

const providerColor: Record<string, string> = {
  openai: "bg-emerald-500/10 text-emerald-600",
  anthropic: "bg-orange-500/10 text-orange-600",
  google: "bg-blue-500/10 text-blue-600",
};

export function AIErrorLogsPanel() {
  const [logs, setLogs] = useState<AIErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error("Failed to load AI error logs");
    else setLogs((data as AIErrorLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearAll = async () => {
    if (!confirm("Delete all AI error logs?")) return;
    const { error } = await supabase.from("ai_error_logs").delete().not("id", "is", null);
    if (error) toast.error("Failed to clear logs");
    else {
      toast.success("Logs cleared");
      load();
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-bold text-foreground">AI Error Logs</h2>
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
          {logs.length > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Every provider failure (quota, rate limit, invalid key, etc.) is recorded here automatically. Use these to diagnose AI issues quickly.
      </p>

      {logs.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No errors logged. AI is healthy ✨
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {logs.map((log) => {
            const isOpen = expanded[log.id];
            return (
              <div key={log.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [log.id]: !isOpen }))}
                  className="w-full flex items-start gap-2 p-3 hover:bg-muted/30 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${providerColor[log.provider] || "bg-muted text-muted-foreground"}`}>
                        {log.provider}
                      </span>
                      {log.http_status && (
                        <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-mono font-medium">
                          {log.http_status}
                        </span>
                      )}
                      {log.model && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate">{log.model}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">{log.error_message || "Unknown error"}</p>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-muted/20 p-3 space-y-2 text-[11px]">
                    {log.error_code && (
                      <div>
                        <span className="text-muted-foreground">Error code: </span>
                        <span className="font-mono text-foreground">{log.error_code}</span>
                      </div>
                    )}
                    {log.feature && (
                      <div>
                        <span className="text-muted-foreground">Feature: </span>
                        <span className="font-mono text-foreground">{log.feature}</span>
                      </div>
                    )}
                    {log.request_summary && (
                      <div>
                        <span className="text-muted-foreground">Request: </span>
                        <span className="text-foreground italic">"{log.request_summary}"</span>
                      </div>
                    )}
                    {log.raw_response && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw provider response</summary>
                        <pre className="mt-2 p-2 bg-background rounded-lg overflow-x-auto text-[10px] font-mono text-foreground whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                          {JSON.stringify(log.raw_response, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
