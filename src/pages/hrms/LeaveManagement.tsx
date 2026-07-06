import { useState, useEffect, useMemo } from "react";
import { Plus, Calendar, CheckCircle2, Clock, XCircle, Copy, Sun, Moon, BarChart3 } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { useEmployeeOptions } from "@/hooks/useEmployeeOptions";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type LeaveStatus = "Approved" | "Pending" | "Rejected";
type TabKey = "requests" | "balances";

interface LeaveRequest {
  id: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string | null;
  status: string;
  is_half_day: boolean;
  half_day_period: string | null;
  leave_category: string;
  is_recurring: boolean;
  recurring_days: string[] | null;
  parent_leave_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

interface LeaveBalance {
  id: string;
  employee_name: string;
  leave_type: string;
  total_allowed: number;
  used: number;
  carry_forward: number;
  year: number;
}

const statusConfig: Record<LeaveStatus, { icon: React.ElementType; color: string }> = {
  Approved: { icon: CheckCircle2, color: "bg-success/10 text-success" },
  Pending: { icon: Clock, color: "bg-warning/10 text-warning" },
  Rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive" },
};

const LEAVE_TYPES = ["Annual", "Sick", "Personal", "Comp Off", "Maternity", "Paternity", "Unpaid", "Half Day", "Temporary"];
const LEAVE_CATEGORIES = [
  { value: "regular", label: "Regular" },
  { value: "temporary", label: "Temporary" },
  { value: "half_day", label: "Half Day" },
  { value: "compensatory", label: "Compensatory" },
  { value: "emergency", label: "Emergency" },
];


export default function LeaveManagement() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { profile } = useAuth();
  const { createLeaveEvent } = useCalendarSync();
  const { autocompleteOptions } = useEmployeeOptions();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [multiDialogOpen, setMultiDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("requests");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Multi-leave state
  const [multiLeaves, setMultiLeaves] = useState<Array<{
    from: string; to: string; type: string; category: string;
    isHalfDay: boolean; halfDayPeriod: string; reason: string;
  }>>([{ from: "", to: "", type: "Annual", category: "regular", isHalfDay: false, halfDayPeriod: "morning", reason: "" }]);

  const fetchRequests = async () => {
    if (!tenantId) return;
    const [reqRes, balRes] = await Promise.all([
      supabase.from("leave_requests").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("leave_balances").select("*").eq("tenant_id", tenantId).eq("year", new Date().getFullYear()),
    ]);
    if (!reqRes.error && reqRes.data) setRequests(reqRes.data as LeaveRequest[]);
    if (!balRes.error && balRes.data) setBalances(balRes.data as LeaveBalance[]);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [tenantId]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (categoryFilter && r.leave_category !== categoryFilter) return false;
      return true;
    });
  }, [requests, statusFilter, categoryFilter]);

  const updateStatus = async (id: string, status: LeaveStatus) => {
    const updates: any = { status };
    if (status === "Approved") {
      updates.approved_by = profile?.full_name || "Admin";
      updates.approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("leave_requests").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Leave ${status.toLowerCase()}`);
    if (status === "Approved") {
      const leave = requests.find(r => r.id === id);
      if (leave) {
        await createLeaveEvent(leave.employee_name, new Date(leave.from_date).toISOString(), new Date(leave.to_date).toISOString(), id);
        // Update balance
        await supabase.from("leave_balances").upsert({
          tenant_id: tenantId!,
          employee_name: leave.employee_name,
          leave_type: leave.leave_type,
          total_allowed: 20,
          used: (balances.find(b => b.employee_name === leave.employee_name && b.leave_type === leave.leave_type)?.used || 0) + leave.days,
          year: new Date().getFullYear(),
        }, { onConflict: "tenant_id,employee_name,leave_type,year" });
      }
    }
    fetchRequests();
  };

  const submitSingleLeave = async (data: Record<string, string>) => {
    if (!tenantId) return;
    const isHalfDay = data.category === "half_day";
    const days = isHalfDay ? 0.5 : (data.from && data.to ? Math.max(1, Math.ceil((new Date(data.to).getTime() - new Date(data.from).getTime()) / 86400000) + 1) : 1);
    const { error } = await supabase.from("leave_requests").insert(buildInsert({
      employee_name: data.employee || profile?.full_name || "Unknown",
      leave_type: data.type,
      from_date: data.from,
      to_date: isHalfDay ? data.from : data.to,
      days,
      reason: data.reason,
      leave_category: data.category || "regular",
      is_half_day: isHalfDay,
      half_day_period: isHalfDay ? (data.half_day_period || "morning") : null,
    }));
    if (error) { toast.error(error.message); return; }
    toast.success("Leave request submitted");
    setDialogOpen(false);
    fetchRequests();
  };

  const submitMultiLeave = async () => {
    if (!tenantId) return;
    const valid = multiLeaves.filter(l => l.from && (l.isHalfDay || l.to));
    if (valid.length === 0) { toast.error("Add at least one valid leave entry"); return; }

    // Insert first as parent
    const first = valid[0];
    const firstDays = first.isHalfDay ? 0.5 : Math.max(1, Math.ceil((new Date(first.to).getTime() - new Date(first.from).getTime()) / 86400000) + 1);
    const { data: parentData, error: parentError } = await supabase.from("leave_requests").insert(buildInsert({
      employee_name: profile?.full_name || "Unknown",
      leave_type: first.type,
      from_date: first.from,
      to_date: first.isHalfDay ? first.from : first.to,
      days: firstDays,
      reason: first.reason || `Multi-leave (1 of ${valid.length})`,
      leave_category: first.category,
      is_half_day: first.isHalfDay,
      half_day_period: first.isHalfDay ? first.halfDayPeriod : null,
    })).select("id").single();

    if (parentError) { toast.error(parentError.message); return; }

    // Insert remaining as children
    if (valid.length > 1) {
      const children = valid.slice(1).map((l, i) => {
        const d = l.isHalfDay ? 0.5 : Math.max(1, Math.ceil((new Date(l.to).getTime() - new Date(l.from).getTime()) / 86400000) + 1);
        return buildInsert({
          employee_name: profile?.full_name || "Unknown",
          leave_type: l.type,
          from_date: l.from,
          to_date: l.isHalfDay ? l.from : l.to,
          days: d,
          reason: l.reason || `Multi-leave (${i + 2} of ${valid.length})`,
          leave_category: l.category,
          is_half_day: l.isHalfDay,
          half_day_period: l.isHalfDay ? l.halfDayPeriod : null,
          parent_leave_id: parentData.id,
        });
      });
      await supabase.from("leave_requests").insert(children);
    }

    toast.success(`${valid.length} leave requests submitted`);
    setMultiDialogOpen(false);
    setMultiLeaves([{ from: "", to: "", type: "Annual", category: "regular", isHalfDay: false, halfDayPeriod: "morning", reason: "" }]);
    fetchRequests();
  };

  const addMultiEntry = () => {
    setMultiLeaves(prev => [...prev, { from: "", to: "", type: "Annual", category: "regular", isHalfDay: false, halfDayPeriod: "morning", reason: "" }]);
  };

  const removeMultiEntry = (idx: number) => {
    setMultiLeaves(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMultiEntry = (idx: number, field: string, value: any) => {
    setMultiLeaves(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const fields = [
    { name: "employee", label: "Employee", type: "autocomplete" as const, autocompleteOptions, placeholder: "Search employee...", required: true },
    { name: "type", label: "Leave Type", type: "select" as const, options: LEAVE_TYPES, required: true },
    { name: "category", label: "Leave Category", type: "select" as const, options: LEAVE_CATEGORIES.map(c => c.value), required: true },
    { name: "half_day_period", label: "Half Day Period", type: "select" as const, options: ["morning", "afternoon"] },
    { name: "from", label: "From Date", type: "date" as const, required: true },
    { name: "to", label: "To Date", type: "date" as const, required: true },
    { name: "reason", label: "Reason", type: "textarea" as const, placeholder: "Reason for leave...", required: true },
  ];

  const getAvatar = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  

  const getCategoryBadge = (cat: string) => {
    const map: Record<string, string> = {
      regular: "bg-primary/10 text-primary",
      temporary: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
      half_day: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      compensatory: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
      emergency: "bg-destructive/10 text-destructive",
    };
    return map[cat] || "bg-muted text-muted-foreground";
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "requests", label: "Leave Requests", icon: Calendar },
    { key: "balances", label: "Leave Balances", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage leave requests, balances, and multi-day or temporary leave</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMultiDialogOpen(true)}>
            <Copy className="h-4 w-4 mr-1" /> Multi Leave
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Apply Leave
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Requests", value: requests.length, color: "text-foreground", icon: Calendar },
          { label: "Approved", value: requests.filter(r => r.status === "Approved").length, color: "text-success", icon: CheckCircle2 },
          { label: "Pending", value: requests.filter(r => r.status === "Pending").length, color: "text-warning", icon: Clock },
          { label: "Rejected", value: requests.filter(r => r.status === "Rejected").length, color: "text-destructive", icon: XCircle },
          { label: "Half-Day", value: requests.filter(r => r.is_half_day).length, color: "text-primary", icon: Sun },
        ].map((s) => (
          <div key={s.label} className="stat-card flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <div>
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ REQUESTS TAB ═══ */}
      {activeTab === "requests" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">All Categories</option>
              {LEAVE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <span className="text-xs text-muted-foreground self-center">{filteredRequests.length} results</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No leave requests found.</p></div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((lr) => {
                const sc = statusConfig[lr.status as LeaveStatus] || statusConfig.Pending;
                const isChild = !!lr.parent_leave_id;
                return (
                  <div key={lr.id} className={cn("bg-card border border-border rounded-xl p-4", isChild && "ml-6 border-dashed")}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{getAvatar(lr.employee_name)}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{lr.employee_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground">{lr.leave_type} Leave</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", getCategoryBadge(lr.leave_category))}>
                              {LEAVE_CATEGORIES.find(c => c.value === lr.leave_category)?.label || lr.leave_category}
                            </span>
                            {lr.is_half_day && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium flex items-center gap-0.5">
                                {lr.half_day_period === "afternoon" ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
                                {lr.half_day_period || "morning"}
                              </span>
                            )}
                            {isChild && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-0.5">
                                <Copy className="h-2.5 w-2.5" /> Part of multi-leave
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${sc.color}`}>
                        <sc.icon className="h-3 w-3" />{lr.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(lr.from_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {lr.from_date !== lr.to_date && <> – {new Date(lr.to_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                      {" "}({lr.days}{lr.is_half_day ? " half" : ""} day{lr.days !== 1 ? "s" : ""})
                    </div>
                    {lr.reason && <p className="text-xs text-muted-foreground mt-1">{lr.reason}</p>}
                    {lr.approved_by && lr.status === "Approved" && (
                      <p className="text-[10px] text-muted-foreground mt-1">Approved by {lr.approved_by}</p>
                    )}
                    {lr.status === "Pending" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => updateStatus(lr.id, "Approved")} className="flex-1 py-1.5 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">Approve</button>
                        <button onClick={() => updateStatus(lr.id, "Rejected")} className="flex-1 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ BALANCES TAB ═══ */}
      {activeTab === "balances" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setBalanceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Set Balance
            </Button>
          </div>

          {balances.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No leave balances configured yet</p>
              <p className="text-xs text-muted-foreground mt-1">Set up leave balances per employee and leave type</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Employee</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Leave Type</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Allowed</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Used</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Remaining</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Carry Fwd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {balances.map(b => {
                    const remaining = b.total_allowed + b.carry_forward - b.used;
                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">{getAvatar(b.employee_name)}</div>
                            <span className="text-xs font-medium text-foreground">{b.employee_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-foreground">{b.leave_type}</td>
                        <td className="px-4 py-2.5 text-xs text-center text-foreground font-medium">{b.total_allowed}</td>
                        <td className="px-4 py-2.5 text-xs text-center text-warning font-medium">{b.used}</td>
                        <td className={cn("px-4 py-2.5 text-xs text-center font-bold", remaining > 0 ? "text-success" : "text-destructive")}>{remaining}</td>
                        <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{b.carry_forward}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ SINGLE LEAVE DIALOG ═══ */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Apply for Leave"
        fields={fields}
        layout="grid-2"
        onSubmit={submitSingleLeave}
      />

      {/* ═══ MULTI LEAVE DIALOG ═══ */}
      {multiDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMultiDialogOpen(false)} />
          <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Apply Multiple Leaves</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Submit multiple leave entries at once for different dates or types</p>
              </div>
              <button onClick={() => setMultiDialogOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {multiLeaves.map((entry, idx) => (
                <div key={idx} className="border border-border rounded-xl p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Leave #{idx + 1}</span>
                    {multiLeaves.length > 1 && (
                      <button onClick={() => removeMultiEntry(idx)} className="text-xs text-destructive hover:underline">Remove</button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Type</label>
                      <select value={entry.type} onChange={e => updateMultiEntry(idx, "type", e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs">
                        {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Category</label>
                      <select value={entry.category} onChange={e => updateMultiEntry(idx, "category", e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs">
                        {LEAVE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">From</label>
                      <input type="date" value={entry.from} onChange={e => updateMultiEntry(idx, "from", e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs" required />
                    </div>
                    {!entry.isHalfDay && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">To</label>
                        <input type="date" value={entry.to} onChange={e => updateMultiEntry(idx, "to", e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs" required />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={entry.isHalfDay} onCheckedChange={v => updateMultiEntry(idx, "isHalfDay", v)} />
                      <label className="text-xs text-foreground">Half Day</label>
                    </div>
                    {entry.isHalfDay && (
                      <select value={entry.halfDayPeriod} onChange={e => updateMultiEntry(idx, "halfDayPeriod", e.target.value)} className="h-8 rounded-md border border-input bg-background px-3 text-xs">
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Reason</label>
                    <input type="text" value={entry.reason} onChange={e => updateMultiEntry(idx, "reason", e.target.value)} placeholder="Optional reason" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs" />
                  </div>
                </div>
              ))}

              <button onClick={addMultiEntry} className="w-full py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                + Add Another Leave Entry
              </button>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setMultiDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={submitMultiLeave}>Submit {multiLeaves.length} Leave{multiLeaves.length > 1 ? "s" : ""}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BALANCE DIALOG ═══ */}
      <FormDialog
        open={balanceDialogOpen}
        onClose={() => setBalanceDialogOpen(false)}
        title="Set Leave Balance"
        layout="grid-2"
        fields={[
          { name: "employee", label: "Employee", type: "autocomplete" as const, autocompleteOptions, placeholder: "Search employee...", required: true },
          { name: "leave_type", label: "Leave Type", type: "select" as const, options: LEAVE_TYPES, required: true },
          { name: "total_allowed", label: "Total Allowed Days", type: "number" as const, placeholder: "e.g. 20", required: true },
          { name: "carry_forward", label: "Carry Forward Days", type: "number" as const, placeholder: "e.g. 5" },
        ]}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("leave_balances").upsert({
            tenant_id: tenantId,
            employee_name: data.employee,
            leave_type: data.leave_type,
            total_allowed: parseInt(data.total_allowed) || 0,
            carry_forward: parseInt(data.carry_forward) || 0,
            year: new Date().getFullYear(),
          }, { onConflict: "tenant_id,employee_name,leave_type,year" });
          if (error) { toast.error(error.message); return; }
          toast.success("Leave balance updated");
          setBalanceDialogOpen(false);
          fetchRequests();
        }}
      />
    </div>
  );
}
