// @ts-nocheck
import { useState, useEffect } from "react";
import { Plus, Trash2, X, CheckCircle2, XCircle, Globe, RefreshCw, Send, Clock, ArrowDown, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  response_status: number | null;
  success: boolean;
  delivered_at: string;
}

const AVAILABLE_EVENTS = [
  // HRM
  "employee.created", "employee.updated", "employee.deleted", "employee.hired",
  "attendance.checkin", "attendance.checkout", "attendance.late",
  "leave.requested", "leave.approved", "leave.rejected",
  "payroll.generated", "payroll.approved",
  "shift.assigned", "shift.updated",
  "warning.issued", "probation.started", "probation.completed",
  "training.assigned", "training.completed",
  "loan.requested", "loan.approved", "loan.repaid",
  // CRM
  "deal.created", "deal.updated", "deal.won", "deal.lost", "deal.stage_changed",
  "followup.created", "followup.completed",
  // Accounting
  "invoice.created", "invoice.sent", "invoice.paid", "invoice.overdue", "invoice.voided",
  "expense.created", "expense.approved", "expense.rejected",
  "payment.received", "payment.failed",
  "recurring_invoice.generated",
  // Marketing
  "campaign.created", "campaign.sent", "campaign.completed",
  // Helpdesk
  "ticket.created", "ticket.assigned", "ticket.resolved", "ticket.escalated",
  // Projects
  "project.created", "project.completed", "task.assigned", "task.completed",
  // Documents
  "document.uploaded", "document.deleted", "document.shared",
  // POS
  "order.created", "order.shipped", "order.delivered", "product.stock_low",
  // System
  "user.signed_up", "user.role_changed", "subscription.changed", "webhook.test",
];

const EVENT_CATEGORIES: Record<string, string[]> = {
  "HRM": AVAILABLE_EVENTS.filter(e => ["employee", "attendance", "leave", "payroll", "shift", "warning", "probation", "training", "loan"].some(p => e.startsWith(p))),
  "CRM": AVAILABLE_EVENTS.filter(e => ["deal", "followup"].some(p => e.startsWith(p))),
  "Accounting": AVAILABLE_EVENTS.filter(e => ["invoice", "expense", "payment", "recurring"].some(p => e.startsWith(p))),
  "Marketing": AVAILABLE_EVENTS.filter(e => e.startsWith("campaign")),
  "Helpdesk": AVAILABLE_EVENTS.filter(e => e.startsWith("ticket")),
  "Projects": AVAILABLE_EVENTS.filter(e => ["project", "task"].some(p => e.startsWith(p))),
  "Documents": AVAILABLE_EVENTS.filter(e => e.startsWith("document")),
  "POS": AVAILABLE_EVENTS.filter(e => ["order", "product"].some(p => e.startsWith(p))),
  "System": AVAILABLE_EVENTS.filter(e => ["user", "subscription", "webhook"].some(p => e.startsWith(p))),
};

export default function WebhookManager() {
  const { tenantId, supabase, buildInsert } = useTenant();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"outgoing" | "incoming">("outgoing");
  const [copied, setCopied] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);

  const incomingUrl = tenantId ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-dispatch?tenant_id=${tenantId}&direction=incoming` : "";

  const fetchData = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("webhook_configs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setWebhooks(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  useEffect(() => {
    if (!selectedWebhook || !tenantId) return;
    const fetchDeliveries = async () => {
      const { data } = await supabase.from("webhook_deliveries").select("*").eq("webhook_id", selectedWebhook).order("delivered_at", { ascending: false }).limit(20);
      if (data) setDeliveries(data);
    };
    fetchDeliveries();
  }, [selectedWebhook]);

  const toggleEvent = (e: string) => setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  const selectAllCategory = (cat: string) => {
    const catEvents = EVENT_CATEGORIES[cat] || [];
    const allSelected = catEvents.every(e => events.includes(e));
    if (allSelected) {
      setEvents(prev => prev.filter(e => !catEvents.includes(e)));
    } else {
      setEvents(prev => [...new Set([...prev, ...catEvents])]);
    }
  };

  const handleCreate = async () => {
    if (!name || !url || events.length === 0) { toast.error("Fill all required fields"); return; }
    const { error } = await supabase.from("webhook_configs").insert(buildInsert({ name, url, secret: secret || null, events, is_active: true }));
    if (error) { toast.error(error.message); return; }
    toast.success("Webhook created");
    setDialogOpen(false);
    setName(""); setUrl(""); setSecret(""); setEvents([]);
    fetchData();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("webhook_configs").update({ is_active: !active }).eq("id", id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("webhook_configs").delete().eq("id", id);
    toast.success("Webhook deleted");
    if (selectedWebhook === id) setSelectedWebhook(null);
    fetchData();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const { error } = await supabase.functions.invoke("webhook-dispatch", {
        body: { webhook_id: id, event: "webhook.test", payload: { test: true, timestamp: new Date().toISOString() } },
      });
      if (error) toast.error("Test failed: " + error.message);
      else toast.success("Test payload sent! Check delivery logs.");
      // Refresh deliveries
      if (selectedWebhook === id) {
        const { data } = await supabase.from("webhook_deliveries").select("*").eq("webhook_id", id).order("delivered_at", { ascending: false }).limit(20);
        if (data) setDeliveries(data);
      }
    } catch {
      toast.error("Failed to send test");
    }
    setTestingId(null);
  };

  const copyIncoming = () => {
    navigator.clipboard.writeText(incomingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-1">Send and receive real-time event notifications</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Webhook
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        <button onClick={() => setTab("outgoing")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "outgoing" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <Send className="h-3.5 w-3.5 inline mr-1.5" />Outgoing
        </button>
        <button onClick={() => setTab("incoming")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "incoming" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <ArrowDown className="h-3.5 w-3.5 inline mr-1.5" />Incoming
        </button>
      </div>

      {tab === "incoming" ? (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground mb-1">Incoming Webhook URL</h2>
            <p className="text-xs text-muted-foreground mb-3">External services can POST JSON data to this URL. Data is logged and can trigger internal workflows.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted/30 border border-border rounded-lg px-3 py-2.5 font-mono text-foreground truncate">{incomingUrl}</code>
            <button onClick={copyIncoming} className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors shrink-0">
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          <div className="bg-muted/20 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-foreground">How to use</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>1. Copy the URL above and paste it into your external service (Stripe, GitHub, Shopify, etc.)</p>
              <p>2. Set the content type to <code className="bg-primary/5 px-1 rounded">application/json</code></p>
              <p>3. Incoming payloads are stored in your webhook delivery logs for processing</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-[10px] font-semibold text-foreground mb-1.5 uppercase tracking-wider">Example cURL</p>
              <pre className="text-[11px] text-muted-foreground font-mono overflow-x-auto">{`curl -X POST "${incomingUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "order.completed", "data": {"id": "123"}}'`}</pre>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No webhooks configured yet</p>
          <p className="text-xs mt-1">Create a webhook to start receiving real-time notifications</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Webhook List */}
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                onClick={() => setSelectedWebhook(wh.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedWebhook === wh.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/20"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${wh.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      <h3 className="text-sm font-semibold text-foreground truncate">{wh.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {wh.events.slice(0, 3).map((e) => (
                        <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{e}</span>
                      ))}
                      {wh.events.length > 3 && <span className="text-[10px] text-muted-foreground">+{wh.events.length - 3} more</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTest(wh.id); }}
                      disabled={testingId === wh.id}
                      className="p-1.5 rounded text-muted-foreground hover:text-primary disabled:opacity-50"
                      title="Send test payload"
                    >
                      {testingId === wh.id ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(wh.id, wh.is_active); }} className="p-1.5 rounded text-muted-foreground hover:text-primary">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(wh.id); }} className="p-1.5 rounded text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Logs */}
          {selectedWebhook && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Delivery Logs</h3>
                <button
                  onClick={() => handleTest(selectedWebhook)}
                  disabled={testingId === selectedWebhook}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Send className="h-3 w-3" /> Send Test
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No deliveries yet</p>
                ) : (
                  deliveries.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0">
                      {d.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground">{d.event}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {d.response_status ? `HTTP ${d.response_status}` : "Failed"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(d.delivered_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Add Webhook</h2>
              <button onClick={() => setDialogOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slack Notifier" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Endpoint URL</label>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Secret (optional)</label>
                <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="HMAC signing secret for verification" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={retryEnabled} onChange={(e) => setRetryEnabled(e.target.checked)} className="rounded" />
                  Auto-retry failed deliveries
                </label>
                {retryEnabled && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Max retries:</span>
                    <select value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} className="h-7 px-2 rounded border border-input bg-background text-xs">
                      <option value={1}>1</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Events</label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Object.entries(EVENT_CATEGORIES).map(([cat, catEvents]) => (
                    <div key={cat}>
                      <button
                        type="button"
                        onClick={() => selectAllCategory(cat)}
                        className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 hover:text-primary transition-colors"
                      >
                        {cat} ({catEvents.filter(e => events.includes(e)).length}/{catEvents.length})
                      </button>
                      <div className="grid grid-cols-2 gap-1">
                        {catEvents.map((ev) => (
                          <button
                            key={ev}
                            type="button"
                            onClick={() => toggleEvent(ev)}
                            className={`text-[11px] px-2 py-1 rounded-lg border transition-colors text-left truncate ${events.includes(ev) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"}`}
                          >
                            {ev}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={!name || !url || events.length === 0} className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                Create Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
