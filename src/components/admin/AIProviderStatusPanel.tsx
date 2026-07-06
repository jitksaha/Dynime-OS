import { useState, useEffect, useCallback } from "react";
import { Activity, RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface ProviderStatus {
  provider: string;
  ok: boolean;
  message: string;
  detail?: string;
  balance_usd?: number;
  total_granted_usd?: number;
  total_used_usd?: number;
}

const labels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
};

export function AIProviderStatusPanel() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-provider-status", { body: {} });
      if (error) throw error;
      setStatuses(data?.statuses || []);
      setCheckedAt(data?.checked_at || new Date().toISOString());
    } catch (e: any) {
      toast.error(e?.message || "Failed to check provider status");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Provider Status & Credits</h2>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Re-check
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Live health check of every provider with a saved API key. Note: OpenAI and Anthropic no longer expose live balance via API — visit their dashboards to view credits.
      </p>

      <div className="grid gap-2">
        {statuses.map((s) => (
          <div
            key={s.provider}
            className={`flex items-start gap-3 p-3 rounded-xl border ${s.ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}
          >
            {s.ok ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{labels[s.provider] || s.provider}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {s.ok ? "Healthy" : "Issue"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{s.message}</p>
              {s.balance_usd !== undefined && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Balance: </span>
                  <span className="font-mono font-semibold text-foreground">${s.balance_usd.toFixed(2)}</span>
                </p>
              )}
              {s.detail && (
                <details className="text-[10px]">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Details</summary>
                  <pre className="mt-1 p-2 bg-background rounded-lg overflow-x-auto font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                    {s.detail}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
        {!statuses.length && !loading && (
          <div className="text-center py-4 text-xs text-muted-foreground">No providers configured.</div>
        )}
      </div>

      {checkedAt && (
        <p className="text-[10px] text-muted-foreground text-right">
          Last checked: {new Date(checkedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
