// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, CreditCard, CalendarDays, CheckCircle2,
  XCircle, PauseCircle, PlayCircle, Trash2, Plus, Clock,
  AlertTriangle, Smartphone, Globe, Shield, TrendingUp,
} from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface Schedule {
  id: string;
  user_id: string;
  tenant_id: string;
  saved_method_id: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  next_charge_date: string;
  last_charged_at: string | null;
  status: string;
  retry_count: number;
  max_retries: number;
  failure_reason: string | null;
  description: string | null;
  created_at: string;
  saved_payment_methods?: {
    gateway_key: string;
    display_name: string;
    method_label: string;
  };
}

interface PaymentLog {
  id: string;
  schedule_id: string;
  gateway_key: string;
  amount: number;
  status: string;
  transaction_id: string | null;
  failure_reason: string | null;
  created_at: string;
}

interface SavedMethod {
  id: string;
  gateway_key: string;
  method_label: string;
  display_name: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  active: { icon: CheckCircle2, color: "text-primary", label: "Active" },
  paused: { icon: PauseCircle, color: "text-yellow-500", label: "Paused" },
  suspended: { icon: AlertTriangle, color: "text-destructive", label: "Suspended" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", label: "Cancelled" },
};

const GW_ICONS: Record<string, typeof CreditCard> = {
  bkash: Smartphone,
  stripe: CreditCard,
  sslcommerz: CreditCard,
  paypal: Globe,
};

export default function RecurringPayments() {
  const { user } = useAuth();
  const { symbol: cs } = useTenantCurrency();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedules" | "logs">("schedules");
  const [cancelTarget, setCancelTarget] = useState<Schedule | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Create schedule state
  const [showCreate, setShowCreate] = useState(false);
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    saved_method_id: "",
    amount: "",
    billing_cycle: "monthly",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [schRes, logRes, methodsRes] = await Promise.all([
      supabase
        .from("recurring_payment_schedules")
        .select("*, saved_payment_methods!saved_method_id(gateway_key, display_name, method_label)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("recurring_payment_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("saved_payment_methods")
        .select("id, gateway_key, method_label, display_name")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    setSchedules((schRes.data as any) || []);
    setLogs((logRes.data as any) || []);
    setSavedMethods((methodsRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const togglePause = async (schedule: Schedule) => {
    const newStatus = schedule.status === "active" ? "paused" : "active";
    await supabase
      .from("recurring_payment_schedules")
      .update({ status: newStatus })
      .eq("id", schedule.id);
    toast.success(newStatus === "active" ? "Schedule resumed" : "Schedule paused");
    fetchData();
  };

  const cancelSchedule = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    await supabase
      .from("recurring_payment_schedules")
      .update({ status: "cancelled" })
      .eq("id", cancelTarget.id);
    toast.success("Recurring payment cancelled");
    setCancelling(false);
    setCancelTarget(null);
    fetchData();
  };

  const createSchedule = async () => {
    if (!user || !newSchedule.saved_method_id || !newSchedule.amount) {
      toast.error("Select a payment method and enter amount");
      return;
    }
    setCreating(true);

    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + (newSchedule.billing_cycle === "monthly" ? 1 : newSchedule.billing_cycle === "quarterly" ? 3 : 12));

    const { error } = await supabase.from("recurring_payment_schedules").insert({
      user_id: user.id,
      tenant_id: (await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single()).data?.tenant_id,
      saved_method_id: newSchedule.saved_method_id,
      amount: parseFloat(newSchedule.amount),
      currency: "BDT",
      billing_cycle: newSchedule.billing_cycle,
      next_charge_date: nextDate.toISOString().split("T")[0],
      description: newSchedule.description || null,
      status: "active",
    } as any);

    if (error) toast.error("Failed to create schedule");
    else {
      toast.success("Recurring payment created!");
      setShowCreate(false);
      setNewSchedule({ saved_method_id: "", amount: "", billing_cycle: "monthly", description: "" });
      fetchData();
    }
    setCreating(false);
  };

  const activeCount = schedules.filter(s => s.status === "active").length;
  const totalMonthly = schedules
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Auto Payments</h1>
            <p className="text-xs text-muted-foreground">Manage recurring automatic payments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Schedule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /></div>
            <span className="text-xs text-muted-foreground">Active Schedules</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><TrendingUp className="h-3.5 w-3.5 text-primary" /></div>
            <span className="text-xs text-muted-foreground">Monthly Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{cs}{totalMonthly.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><CalendarDays className="h-3.5 w-3.5 text-primary" /></div>
            <span className="text-xs text-muted-foreground">Total Schedules</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{schedules.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        {(["schedules", "logs"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "schedules" ? "Schedules" : "Payment History"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "schedules" ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {schedules.length === 0 ? (
            <div className="text-center py-14">
              <RefreshCw className="h-10 w-10 text-primary/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No recurring payments</p>
              <p className="text-xs text-muted-foreground mt-1">Set up auto-pay for subscriptions and services</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {schedules.map(s => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.active;
                const StatusIcon = cfg.icon;
                const method = s.saved_payment_methods;
                const GwIcon = GW_ICONS[method?.gateway_key || ""] || CreditCard;

                return (
                  <div key={s.id} className="p-5 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${s.status === "active" ? "bg-primary/10" : "bg-muted/20"}`}>
                          <GwIcon className={`h-5 w-5 ${s.status === "active" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {cs}{s.amount.toLocaleString()} / {s.billing_cycle}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.color} bg-current/10`}>
                              <StatusIcon className="h-3 w-3" /> {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {method?.method_label || "Unknown method"} · {s.description || "Auto payment"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" /> Next: {s.next_charge_date}
                            </span>
                            {s.last_charged_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Last: {new Date(s.last_charged_at).toLocaleDateString()}
                              </span>
                            )}
                            {s.retry_count > 0 && (
                              <span className="flex items-center gap-1 text-destructive">
                                <AlertTriangle className="h-3 w-3" /> Retries: {s.retry_count}/{s.max_retries}
                              </span>
                            )}
                          </div>
                          {s.failure_reason && (
                            <p className="text-[11px] text-destructive mt-1">⚠ {s.failure_reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(s.status === "active" || s.status === "paused") && (
                          <button
                            onClick={() => togglePause(s)}
                            className="p-2 rounded-lg border border-border hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all"
                            title={s.status === "active" ? "Pause" : "Resume"}
                          >
                            {s.status === "active" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </button>
                        )}
                        {s.status !== "cancelled" && (
                          <button
                            onClick={() => setCancelTarget(s)}
                            className="p-2 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            title="Cancel"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Payment Logs */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-14">
              <Clock className="h-10 w-10 text-primary/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No payment logs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-4 hover:bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${log.status === "success" ? "bg-primary/10" : "bg-destructive/10"}`}>
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cs}{log.amount.toLocaleString()} via {log.gateway_key}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                        {log.transaction_id && ` · TX: ${log.transaction_id.slice(0, 16)}...`}
                      </p>
                      {log.failure_reason && (
                        <p className="text-[11px] text-destructive mt-0.5">{log.failure_reason}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                    log.status === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  }`}>
                    {log.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Schedule Dialog */}
      <AlertDialog open={showCreate} onOpenChange={setShowCreate}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>New Recurring Payment</AlertDialogTitle>
            <AlertDialogDescription>Set up automatic recurring payment using a saved method</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Payment Method</label>
              <select
                value={newSchedule.saved_method_id}
                onChange={e => setNewSchedule(p => ({ ...p, saved_method_id: e.target.value }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select saved method...</option>
                {savedMethods.map(m => (
                  <option key={m.id} value={m.id}>{m.method_label} ({m.display_name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Amount</label>
              <input
                type="number"
                value={newSchedule.amount}
                onChange={e => setNewSchedule(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                min="1"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Billing Cycle</label>
              <select
                value={newSchedule.billing_cycle}
                onChange={e => setNewSchedule(p => ({ ...p, billing_cycle: e.target.value }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Description (optional)</label>
              <input
                type="text"
                value={newSchedule.description}
                onChange={e => setNewSchedule(p => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Monthly subscription"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Auto-payments are charged on the scheduled date. Failed payments retry up to 3 times before being suspended.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <button
              onClick={createSchedule}
              disabled={creating || !newSchedule.saved_method_id || !newSchedule.amount}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Schedule
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Recurring Payment</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all future automatic charges for this schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={cancelSchedule} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
