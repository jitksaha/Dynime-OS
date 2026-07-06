import { useState, useEffect } from "react";
import {
  Clock, CalendarDays, CheckSquare, BarChart3, LogIn, LogOut as LogOutIcon,
  Plus, Loader2, Edit3, TrendingUp, Award, Timer, ArrowRight, Briefcase,
  FileText, Receipt, BookOpen, ShieldCheck, PartyPopper,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

export default function EmployeePortal() {
  const { tenantId, supabase } = useTenant();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "tasks">("attendance");
  const [checkingIn, setCheckingIn] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [manualDate, setManualDate] = useState("");
  const [manualCheckIn, setManualCheckIn] = useState("");
  const [manualCheckOut, setManualCheckOut] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const calculateWorkingHours = (checkIn: string | null, checkOut: string | null): number => {
    if (!checkIn || !checkOut) return 0;
    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);
    const diff = (outH * 60 + outM) - (inH * 60 + inM);
    return Math.max(0, Math.round((diff / 60) * 100) / 100);
  };

  const fetchData = async () => {
    if (!tenantId || !profile?.full_name) return;
    const [attRes, leaveRes, taskRes] = await Promise.all([
      supabase.from("attendance_records").select("*").eq("tenant_id", tenantId).eq("employee_name", profile.full_name).order("attendance_date", { ascending: false }).limit(30),
      supabase.from("leave_requests").select("*").eq("tenant_id", tenantId).eq("employee_name", profile.full_name).order("created_at", { ascending: false }).limit(20),
      supabase.from("projects").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (attRes.data) setAttendance(attRes.data);
    if (leaveRes.data) setLeaves(leaveRes.data);
    if (taskRes.data) setTasks(taskRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId, profile?.full_name]);

  const todayAttendance = attendance.find((a) => a.attendance_date === today);

  const handleCheckIn = async () => {
    if (!tenantId || !user || !profile?.full_name) return;
    setCheckingIn(true);
    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
    const { error } = await supabase.from("attendance_records").insert({
      tenant_id: tenantId, created_by: user.id, employee_name: profile.full_name,
      employee_department: profile.department || null, attendance_date: today,
      check_in: now, status: "present", attendance_type: "automatic", working_hours: 0,
    });
    setCheckingIn(false);
    if (error) { toast.error("Check-in failed"); return; }
    toast.success("Checked in successfully!");
    fetchData();
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    setCheckingIn(true);
    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
    const hours = calculateWorkingHours(todayAttendance.check_in, now);
    const status = hours < 4 ? "late" : "present";
    const { error } = await supabase.from("attendance_records").update({ check_out: now, working_hours: hours, status }).eq("id", todayAttendance.id);
    setCheckingIn(false);
    if (error) { toast.error("Check-out failed"); return; }
    toast.success(`Checked out! Worked ${hours.toFixed(1)} hours`);
    fetchData();
  };

  const handleManualSubmit = async () => {
    if (!tenantId || !user || !profile?.full_name || !manualDate || !manualCheckIn || !manualCheckOut) return;
    const hours = calculateWorkingHours(manualCheckIn, manualCheckOut);
    const { error } = await supabase.from("attendance_records").insert({
      tenant_id: tenantId, created_by: user.id, employee_name: profile.full_name,
      employee_department: profile.department || null, attendance_date: manualDate,
      check_in: manualCheckIn, check_out: manualCheckOut, status: "present",
      attendance_type: "manual", working_hours: hours, notes: manualNotes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Manual attendance added (${hours.toFixed(1)} hrs)`);
    setShowManualForm(false);
    setManualDate(""); setManualCheckIn(""); setManualCheckOut(""); setManualNotes("");
    fetchData();
  };

  const handleLeaveSubmit = async () => {
    if (!tenantId || !user || !profile?.full_name || !leaveFrom || !leaveTo) return;
    const from = new Date(leaveFrom);
    const to = new Date(leaveTo);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const { error } = await supabase.from("leave_requests").insert({
      tenant_id: tenantId, created_by: user.id, employee_name: profile.full_name,
      leave_type: leaveType, from_date: leaveFrom, to_date: leaveTo, days,
      reason: leaveReason || null, status: "Pending",
    });
    if (error) { toast.error("Failed to submit leave request"); return; }
    toast.success("Leave request submitted!");
    setShowLeaveForm(false);
    setLeaveType("Casual Leave"); setLeaveFrom(""); setLeaveTo(""); setLeaveReason("");
    fetchData();
  };

  const statusColors: Record<string, string> = {
    present: "text-success bg-success/10", absent: "text-destructive bg-destructive/10",
    late: "text-warning bg-warning/10", leave: "text-info bg-info/10",
    Approved: "text-success bg-success/10", Pending: "text-warning bg-warning/10",
    Rejected: "text-destructive bg-destructive/10", "On Track": "text-success bg-success/10",
    "At Risk": "text-warning bg-warning/10", Delayed: "text-destructive bg-destructive/10",
    Completed: "text-info bg-info/10",
  };

  const thisMonth = attendance.filter(a => {
    const d = new Date(a.attendance_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalHours = thisMonth.reduce((sum, a) => sum + (Number(a.working_hours) || 0), 0);
  const avgHours = thisMonth.length > 0 ? totalHours / thisMonth.length : 0;
  const pendingLeaves = leaves.filter(l => l.status === "Pending").length;

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header + Check In/Out */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}!</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{profile?.full_name || "Employee"}</h1>
          {profile?.department && <p className="text-xs text-muted-foreground mt-0.5">{profile.department}</p>}
        </div>
        <div className="flex items-center gap-3">
          {todayAttendance?.check_in && !todayAttendance?.check_out && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/15 text-success text-xs font-medium">
              <Timer className="h-3.5 w-3.5 animate-pulse" />
              Working since {todayAttendance.check_in}
            </div>
          )}
          {!todayAttendance ? (
            <button onClick={handleCheckIn} disabled={checkingIn} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-success text-white text-sm font-semibold hover:bg-success/90 transition-all shadow-lg shadow-success/20 disabled:opacity-50">
              {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Check In
            </button>
          ) : !todayAttendance.check_out ? (
            <button onClick={handleCheckOut} disabled={checkingIn} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 disabled:opacity-50">
              {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOutIcon className="h-4 w-4" />} Check Out
            </button>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 text-success text-sm font-semibold">
              <Award className="h-4 w-4" /> Day Complete · {Number(todayAttendance.working_hours).toFixed(1)}h
            </span>
          )}
        </div>
      </motion.div>

      {/* Stats KPI */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: "Today's Check-in", value: todayAttendance?.check_in || "—", color: "text-success", bg: "bg-success/10" },
          { icon: BarChart3, label: "Today's Hours", value: todayAttendance?.working_hours ? `${Number(todayAttendance.working_hours).toFixed(1)}h` : "—", color: "text-primary", bg: "bg-primary/10" },
          { icon: TrendingUp, label: "Avg. Daily Hours", value: `${avgHours.toFixed(1)}h`, color: "text-info", bg: "bg-info/10" },
          { icon: CalendarDays, label: "Days This Month", value: `${thisMonth.length}`, extra: pendingLeaves > 0 ? `${pendingLeaves} leave pending` : `${totalHours.toFixed(0)}h total`, color: "text-warning", bg: "bg-warning/10" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl border border-border bg-card hover:shadow-md hover:border-primary/15 transition-all">
            <div className={`p-2 rounded-xl ${stat.bg} w-fit mb-3`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-lg font-bold text-foreground tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            {stat.extra && <p className="text-[10px] text-muted-foreground mt-1">{stat.extra}</p>}
          </div>
        ))}
      </motion.div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Left — Main Content */}
        <div className="space-y-5 min-w-0">
          {/* Tabs + Actions */}
          <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-secondary/40 rounded-xl p-1">
              {([
                { key: "attendance" as const, label: t("attendance"), icon: Clock, count: thisMonth.length },
                { key: "leave" as const, label: t("leave"), icon: CalendarDays, count: leaves.length },
                { key: "tasks" as const, label: t("projects"), icon: CheckSquare, count: tasks.length },
              ]).map((tab) => (
                <button
                  key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {activeTab === "attendance" && (
                <button onClick={() => setShowManualForm(!showManualForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  <Edit3 className="h-3.5 w-3.5" /> Manual Entry
                </button>
              )}
              {activeTab === "leave" && (
                <button onClick={() => setShowLeaveForm(!showLeaveForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Request Leave
                </button>
              )}
            </div>
          </motion.div>

          {/* Manual Attendance Form */}
          {showManualForm && (
            <motion.div variants={fadeUp} className="p-5 rounded-2xl border-2 border-primary/20 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Manual Attendance Entry</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">Manual</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date</label>
                  <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} max={today} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Check In Time</label>
                  <input type="time" value={manualCheckIn} onChange={e => setManualCheckIn(e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Check Out Time</label>
                  <input type="time" value={manualCheckOut} onChange={e => setManualCheckOut(e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes (reason)</label>
                  <input value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="e.g. Forgot to check in" className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
              </div>
              {manualCheckIn && manualCheckOut && (
                <p className="text-xs text-muted-foreground">Calculated: <span className="font-semibold text-foreground">{calculateWorkingHours(manualCheckIn, manualCheckOut).toFixed(1)}h</span></p>
              )}
              <div className="flex gap-2">
                <button onClick={handleManualSubmit} disabled={!manualDate || !manualCheckIn || !manualCheckOut} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">Submit</button>
                <button onClick={() => setShowManualForm(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              </div>
            </motion.div>
          )}

          {/* Leave Form */}
          {showLeaveForm && (
            <motion.div variants={fadeUp} className="p-5 rounded-2xl border-2 border-primary/20 bg-card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">New Leave Request</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Leave Type</label>
                  <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all">
                    <option>Casual Leave</option><option>Sick Leave</option><option>Annual Leave</option><option>Emergency Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
                  <input type="date" value={leaveFrom} onChange={e => setLeaveFrom(e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
                  <input type="date" value={leaveTo} onChange={e => setLeaveTo(e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason (optional)</label>
                  <input value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Reason for leave" className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleLeaveSubmit} disabled={!leaveFrom || !leaveTo} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">Submit</button>
                <button onClick={() => setShowLeaveForm(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              </div>
            </motion.div>
          )}

          {/* Data Tables */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : activeTab === "attendance" ? (
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Date</span><span>Check In</span><span>Check Out</span><span>Hours</span><span>Status</span>
              </div>
              {attendance.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No attendance records yet</p>
                </div>
              ) : attendance.slice(0, 10).map((rec) => (
                <div key={rec.id} className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 px-5 py-3 border-b border-border last:border-b-0 items-center text-sm hover:bg-secondary/30 transition-colors hidden sm:grid">
                  <span className="font-medium text-foreground">{new Date(rec.attendance_date).toLocaleDateString()}</span>
                  <span className="text-muted-foreground">{rec.check_in || "—"}</span>
                  <span className="text-muted-foreground">{rec.check_out || "—"}</span>
                  <span className="text-foreground font-medium">{rec.working_hours ? `${Number(rec.working_hours).toFixed(1)}h` : "—"}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit capitalize ${statusColors[rec.status] || "text-muted-foreground bg-muted/10"}`}>{rec.status}</span>
                </div>
              ))}
              {/* Mobile cards */}
              {attendance.slice(0, 10).map((rec) => (
                <div key={`m-${rec.id}`} className="sm:hidden px-4 py-3 border-b border-border last:border-b-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{new Date(rec.attendance_date).toLocaleDateString()}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[rec.status] || "text-muted-foreground bg-muted/10"}`}>{rec.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.check_in || "—"} → {rec.check_out || "—"} · {rec.working_hours ? `${Number(rec.working_hours).toFixed(1)}h` : "—"}</p>
                </div>
              ))}
            </motion.div>
          ) : activeTab === "leave" ? (
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_100px_100px_80px_80px] gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Type</span><span>From</span><span>To</span><span>Days</span><span>Status</span>
              </div>
              {leaves.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No leave requests yet</p>
                </div>
              ) : leaves.map((l) => (
                <div key={l.id}>
                  <div className="hidden sm:grid grid-cols-[1fr_100px_100px_80px_80px] gap-2 px-5 py-3 border-b border-border last:border-b-0 items-center text-sm hover:bg-secondary/30 transition-colors">
                    <span className="font-medium text-foreground">{l.leave_type}</span>
                    <span className="text-muted-foreground">{new Date(l.from_date).toLocaleDateString()}</span>
                    <span className="text-muted-foreground">{new Date(l.to_date).toLocaleDateString()}</span>
                    <span className="text-foreground font-medium">{l.days}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${statusColors[l.status] || "text-muted-foreground bg-muted/10"}`}>{l.status}</span>
                  </div>
                  <div className="sm:hidden px-4 py-3 border-b border-border last:border-b-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{l.leave_type}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[l.status] || "text-muted-foreground bg-muted/10"}`}>{l.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(l.from_date).toLocaleDateString()} → {new Date(l.to_date).toLocaleDateString()} · {l.days} days</p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_100px_100px] gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Project</span><span>Status</span><span>Date</span>
              </div>
              {tasks.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No projects assigned</p>
                </div>
              ) : tasks.map((task) => (
                <div key={task.id}>
                  <div className="hidden sm:grid grid-cols-[1fr_100px_100px] gap-2 px-5 py-3 border-b border-border last:border-b-0 items-center text-sm hover:bg-secondary/30 transition-colors">
                    <span className="font-medium text-foreground truncate">{task.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${statusColors[task.status] || "text-muted-foreground bg-muted/10"}`}>{task.status}</span>
                    <span className="text-muted-foreground">{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="sm:hidden px-4 py-3 border-b border-border last:border-b-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground truncate max-w-[200px]">{task.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[task.status] || "text-muted-foreground bg-muted/10"}`}>{task.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Quick Links */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Access</h2>
            <div className="space-y-1.5">
              {[
                { label: "My Payslips", icon: FileText, path: "/portal/employee/payslips", desc: "View salary slips" },
                { label: "Expense Claims", icon: Receipt, path: "/portal/employee/expenses", desc: "Submit & track expenses" },
                { label: "My Assets", icon: Briefcase, path: "/portal/employee/assets", desc: "Company assets assigned" },
                { label: "Training", icon: BookOpen, path: "/portal/employee/training", desc: "Courses & certifications" },
                { label: "Holidays", icon: PartyPopper, path: "/portal/employee/holidays", desc: "Company holidays" },
                { label: "Verifications", icon: ShieldCheck, path: "/portal/employee/verifications", desc: "Document verifications" },
              ].map((item) => (
                <Link
                  key={item.path} to={item.path}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group"
                >
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Monthly Overview */}
          <motion.div variants={fadeUp} className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Monthly Overview</h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Work Hours Progress</span>
                  <span className="font-semibold text-foreground">{totalHours.toFixed(0)}h / 160h</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (totalHours / 160) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Attendance Rate</span>
                  <span className="font-semibold text-foreground">{thisMonth.length} / {new Date().getDate()} days</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(100, (thisMonth.length / new Date().getDate()) * 100)}%` }} />
                </div>
              </div>
              <div className="pt-2 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Leaves Used</p>
                  <p className="text-lg font-bold text-foreground">{leaves.filter(l => l.status === "Approved").length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Pending Leaves</p>
                  <p className="text-lg font-bold text-warning">{pendingLeaves}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
