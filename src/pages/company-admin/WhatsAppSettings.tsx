// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { toast } from "sonner";
import { MessageSquare, Loader2, TestTube, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WhatsAppSettings() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { activeBranchId, isAllBranches, branches } = useActiveBranch();
  const activeBranchName =
    branches.find((b) => b.id === activeBranchId)?.name || "All Branches";

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("whatsapp_logs")
      .select("*")
      .eq("tenant_id", tenantId);
    // Scope logs to active branch + tenant-global (branch_id IS NULL) sends.
    if (activeBranchId && !isAllBranches) {
      q = q.or(`branch_id.eq.${activeBranchId},branch_id.is.null`);
    }
    const { data } = await q.order("created_at", { ascending: false }).limit(20);
    setLogs((data as any) || []);
    setLoading(false);
  }, [tenantId, activeBranchId, isAllBranches]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const testSend = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          phone: testPhone,
          message: `✅ Test WhatsApp message from ${activeBranchName}. Configuration is working!`,
          tenant_id: tenantId,
          branch_id: activeBranchId || null,
        },
      });
      if (error) throw error;
      if (data?.success) toast.success("Test message sent!");
      else toast.error(data?.error || "Test failed");
    } catch (e: any) {
      toast.error(e.message || "Test failed");
    }
    setTesting(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-600" /> WhatsApp Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Test sends and templates use your active branch. Templates with no branch apply company-wide.
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5 h-fit">
          <Building2 className="h-3.5 w-3.5" /> {activeBranchName}
        </Badge>
      </div>

      {/* Test */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><TestTube className="h-4 w-4" /> Test WhatsApp</h3>
        <div className="flex gap-2">
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+880..."
            className="flex-1 max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={testSend}
            disabled={testing}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
            Send Test
          </button>
        </div>
      </div>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-3">Recent Messages</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4">Phone</th>
                  <th className="pb-2 pr-4">Event</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{log.recipient_phone}</td>
                    <td className="py-2 pr-4">{log.event_key || "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === "sent" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
