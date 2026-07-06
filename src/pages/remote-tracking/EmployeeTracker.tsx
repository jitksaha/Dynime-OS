import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Play, Square, Clock, Activity, Camera,
  Eye, Shield, TrendingUp, Coffee, Timer, BarChart3,
  Keyboard, Globe, AppWindow, CheckCircle, AlertTriangle,
  MonitorUp, MousePointer2, Zap, CircleDot
} from "lucide-react";

// ─── Browser Activity Tracker Hook ──────────────────────────────────
function useBrowserActivityTracker(isActive: boolean, idleTimeoutMin: number) {
  const [keyCount, setKeyCount] = useState(0);
  const [mouseCount, setMouseCount] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [activityPercent, setActivityPercent] = useState(100);
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setInterval>>();
  const totalActiveRef = useRef(0);
  const totalElapsedRef = useRef(0);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isIdle) setIsIdle(false);
  }, [isIdle]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = () => { setKeyCount(c => c + 1); recordActivity(); };
    const onMouse = () => { setMouseCount(c => c + 1); recordActivity(); };
    const onMove = () => { recordActivity(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouse);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onMove);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouse);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [isActive, recordActivity]);

  useEffect(() => {
    if (!isActive) return;
    const idleMs = idleTimeoutMin * 60 * 1000;
    idleTimerRef.current = setInterval(() => {
      const gap = Date.now() - lastActivityRef.current;
      totalElapsedRef.current += 1;
      if (gap > idleMs) {
        setIsIdle(true);
        setIdleSeconds(s => s + 1);
      } else {
        totalActiveRef.current += 1;
        setIsIdle(false);
      }
      const pct = totalElapsedRef.current > 0
        ? (totalActiveRef.current / totalElapsedRef.current) * 100 : 100;
      setActivityPercent(Math.round(pct));
    }, 1000);
    return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
  }, [isActive, idleTimeoutMin]);

  const reset = useCallback(() => {
    setKeyCount(0); setMouseCount(0); setIsIdle(false); setIdleSeconds(0); setActivityPercent(100);
    totalActiveRef.current = 0; totalElapsedRef.current = 0;
    lastActivityRef.current = Date.now();
  }, []);

  return { keyCount, mouseCount, isIdle, idleSeconds, activityPercent, reset };
}

// ─── Browser Screenshot Capture ─────────────────────────────────────
async function captureScreenshot(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "monitor" } as any,
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    const imageCapture = new (window as any).ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();
    track.stop();
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    return null;
  }
}

// ─── Probabilistic Screenshot Scheduler ─────────────────────────────
function useRandomScreenshotScheduler(
  isActive: boolean, enabled: boolean, minInterval: number, maxInterval: number, onCapture: () => void
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const scheduleNext = useCallback(() => {
    if (!isActive || !enabled) return;
    const range = maxInterval - minInterval;
    const randomFactor = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);
    const nextMs = (minInterval + randomFactor * range) * 60 * 1000;
    timeoutRef.current = setTimeout(() => { onCapture(); scheduleNext(); }, nextMs);
  }, [isActive, enabled, minInterval, maxInterval, onCapture]);

  useEffect(() => {
    scheduleNext();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [scheduleNext]);
}

function useTabVisibility() {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  return visible;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function EmployeeTracker() {
  const { tenantId, supabase } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const [activeSession, setActiveSession] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState({ start: "", end: "", reason: "" });
  const [screenshotPermissionGranted, setScreenshotPermissionGranted] = useState(false);
  const [capturedScreenshots, setCapturedScreenshots] = useState<{ url: string; time: Date; window?: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const isTracking = !!activeSession && !isBreak;
  const tabVisible = useTabVisibility();

  const { data: config } = useQuery({
    queryKey: ["tracking-config", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase.from("tracking_config").select("*").eq("tenant_id", tenantId).maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  const idleTimeout = (config as any)?.idle_timeout_minutes ?? 5;
  const screenshotEnabled = (config as any)?.screenshot_enabled ?? true;
  const screenshotMin = (config as any)?.screenshot_interval_min ?? 3;
  const screenshotMax = (config as any)?.screenshot_interval_max ?? 12;

  const activity = useBrowserActivityTracker(isTracking, idleTimeout);

  const handleScreenshotCapture = useCallback(async () => {
    if (!screenshotPermissionGranted || !activeSession || !tenantId || !userId) return;
    const dataUrl = await captureScreenshot();
    if (dataUrl) {
      const now = new Date();
      setCapturedScreenshots(prev => [{ url: dataUrl, time: now, window: document.title }, ...prev.slice(0, 29)]);
      await supabase.from("tracking_screenshots").insert({
        tenant_id: tenantId, session_id: activeSession.id, user_id: userId,
        captured_at: now.toISOString(), active_window: document.title,
        active_url: window.location.href, activity_percent: activity.activityPercent, is_blurred: false,
      } as any);
      toast.info("Screenshot captured", { duration: 2000 });
    }
  }, [screenshotPermissionGranted, activeSession, tenantId, userId, activity.activityPercent, supabase]);

  useRandomScreenshotScheduler(isTracking, screenshotEnabled && screenshotPermissionGranted, screenshotMin, screenshotMax, handleScreenshotCapture);

  const { data: projects = [] } = useQuery({
    queryKey: ["tracking-projects", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("tracking_projects").select("*").eq("tenant_id", tenantId).eq("is_active", true);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tracking-tasks", tenantId, selectedProject],
    queryFn: async () => {
      if (!tenantId || !selectedProject) return [];
      const { data } = await supabase.from("tracking_tasks").select("*").eq("tenant_id", tenantId)
        .eq("project_id", selectedProject).eq("status", "open");
      return data || [];
    },
    enabled: !!tenantId && !!selectedProject,
  });

  const { data: mySessions = [] } = useQuery({
    queryKey: ["my-tracking-sessions", tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return [];
      const { data } = await supabase.from("tracking_sessions").select("*").eq("tenant_id", tenantId)
        .eq("user_id", userId).order("started_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!tenantId && !!userId,
  });

  const { data: myDbScreenshots = [] } = useQuery({
    queryKey: ["my-screenshots-db", tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return [];
      const { data } = await supabase.from("tracking_screenshots").select("*").eq("tenant_id", tenantId)
        .eq("user_id", userId).order("captured_at", { ascending: false }).limit(30);
      return data || [];
    },
    enabled: !!tenantId && !!userId,
  });

  useEffect(() => {
    const active = mySessions.find((s: any) => s.status === "active");
    if (active) {
      setActiveSession(active);
      const start = new Date(active.started_at).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }
  }, [mySessions]);

  useEffect(() => {
    if (activeSession && !isBreak) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession, isBreak]);

  useEffect(() => {
    if (!isTracking || !activeSession || !tenantId || !userId) return;
    const interval = setInterval(async () => {
      await supabase.from("tracking_sessions").update({
        duration_seconds: elapsed,
        active_seconds: Math.round(elapsed * activity.activityPercent / 100),
        idle_seconds: activity.idleSeconds,
        keyboard_events: activity.keyCount,
        mouse_events: activity.mouseCount,
        activity_percent: activity.activityPercent,
        productivity_score: activity.activityPercent >= 70 ? "focused" : activity.activityPercent >= 40 ? "neutral" : "distracted",
      }).eq("id", activeSession.id);
      await supabase.from("tracking_activity_logs").insert({
        tenant_id: tenantId, session_id: activeSession.id, user_id: userId,
        app_name: "Browser", window_title: document.title, url: window.location.href,
        category: tabVisible ? "active" : "background",
        keyboard_count: activity.keyCount, mouse_count: activity.mouseCount,
        idle_seconds: activity.isIdle ? 60 : 0,
      } as any);
    }, 60000);
    return () => clearInterval(interval);
  }, [isTracking, activeSession, tenantId, userId, elapsed, activity, tabVisible, supabase]);

  const startSession = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.from("tracking_sessions").insert({
        tenant_id: tenantId!, user_id: userId!, project_id: selectedProject || null,
        task_id: selectedTask || null, status: "active",
      } as any).select().single();
      return data;
    },
    onSuccess: (data) => {
      setActiveSession(data); setElapsed(0); activity.reset();
      qc.invalidateQueries({ queryKey: ["my-tracking-sessions"] });
      toast.success("Timer started — tracking active");
    },
  });

  const stopSession = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      await supabase.from("tracking_sessions").update({
        ended_at: new Date().toISOString(), duration_seconds: elapsed,
        active_seconds: Math.round(elapsed * activity.activityPercent / 100),
        idle_seconds: activity.idleSeconds, keyboard_events: activity.keyCount,
        mouse_events: activity.mouseCount, activity_percent: activity.activityPercent,
        productivity_score: activity.activityPercent >= 70 ? "focused" : activity.activityPercent >= 40 ? "neutral" : "distracted",
        status: "completed",
      }).eq("id", activeSession.id);
    },
    onSuccess: () => {
      setActiveSession(null); setElapsed(0); activity.reset();
      if (timerRef.current) clearInterval(timerRef.current);
      qc.invalidateQueries({ queryKey: ["my-tracking-sessions"] });
      toast.success("Session saved");
    },
  });

  const submitCorrection = useMutation({
    mutationFn: async () => {
      await supabase.from("tracking_time_corrections").insert({
        tenant_id: tenantId!, user_id: userId!,
        requested_start: correctionData.start, requested_end: correctionData.end,
        reason: correctionData.reason,
      } as any);
    },
    onSuccess: () => {
      setCorrectionOpen(false);
      setCorrectionData({ start: "", end: "", reason: "" });
      toast.success("Correction submitted for review");
    },
  });

  const requestScreenshotPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      stream.getTracks().forEach(t => t.stop());
      setScreenshotPermissionGranted(true);
      toast.success("Screen sharing enabled");
    } catch {
      toast.error("Screen sharing permission denied");
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const todaySessions = mySessions.filter((s: any) => new Date(s.started_at).toDateString() === new Date().toDateString());
  const todayHours = todaySessions.reduce((a: number, s: any) => a + (s.duration_seconds || 0), 0) / 3600;
  const weekSessions = mySessions.filter((s: any) => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(s.started_at) >= weekAgo;
  });
  const weekHours = weekSessions.reduce((a: number, s: any) => a + (s.duration_seconds || 0), 0) / 3600;
  const avgActivity = todaySessions.length
    ? (todaySessions.reduce((a: number, s: any) => a + Number(s.activity_percent || 0), 0) / todaySessions.length)
    : 0;

  const canStart = !activeSession && selectedProject && (!(config as any)?.require_task_selection || selectedTask);
  const productivityLabel = activity.activityPercent >= 70 ? "Focused" : activity.activityPercent >= 40 ? "Neutral" : "Distracted";

  const getStatusColor = () => {
    if (isBreak) return "border-amber-500/40 bg-amber-500/5";
    if (activity.isIdle) return "border-red-500/40 bg-red-500/5";
    if (isTracking) return "border-emerald-500/40 bg-emerald-500/5";
    return "border-border";
  };

  const getStatusDot = () => {
    if (isBreak) return "bg-amber-500";
    if (activity.isIdle) return "bg-red-500 animate-pulse";
    return "bg-emerald-500 animate-pulse";
  };

  const getProductivityColor = (score: string) => {
    if (score === "focused") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    if (score === "distracted") return "bg-red-500/15 text-red-600 dark:text-red-400";
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">My Work Tracker</h1>
            <p className="text-sm text-muted-foreground">Browser-based time & activity tracking</p>
          </div>
        </div>
        {!screenshotPermissionGranted && screenshotEnabled && (
          <Button variant="outline" size="sm" onClick={requestScreenshotPermission} className="gap-1.5 shrink-0">
            <MonitorUp className="h-4 w-4" /> Enable Screenshots
          </Button>
        )}
      </div>

      {/* ═══ Timer Hero Card ═══ */}
      <Card className={`border-2 transition-all duration-300 ${getStatusColor()}`}>
        <CardContent className="pt-8 pb-6">
          <div className="text-center space-y-5">
            {/* Timer Display */}
            <div>
              <div className="text-6xl sm:text-7xl font-mono font-bold tracking-[0.08em] text-foreground tabular-nums">
                {formatTime(elapsed)}
              </div>
              {activeSession && (
                <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusDot()}`} />
                    <span className="text-sm font-medium text-foreground/80">
                      {isBreak ? "On Break" : activity.isIdle ? "Idle Detected" : "Active"}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    activity.activityPercent >= 70 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : activity.activityPercent >= 40 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }`}>
                    <CircleDot className="h-3 w-3" />
                    {productivityLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Idle Warning */}
            {activity.isIdle && isTracking && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Idle for {Math.floor(activity.idleSeconds / 60)}m — move your mouse or type to resume
              </div>
            )}

            {/* Controls */}
            {!activeSession ? (
              <div className="space-y-3 max-w-sm mx-auto">
                <Select value={selectedProject} onValueChange={v => { setSelectedProject(v); setSelectedTask(""); }}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                {selectedProject && (
                  <Select value={selectedTask} onValueChange={setSelectedTask}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select task" /></SelectTrigger>
                    <SelectContent>{tasks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Button size="lg" className="w-full h-12 text-base gap-2 shadow-md" disabled={!canStart} onClick={() => startSession.mutate()}>
                  <Play className="h-5 w-5" /> Start Working
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button
                  variant={isBreak ? "default" : "outline"}
                  size="lg"
                  className={`gap-2 h-11 ${isBreak ? "" : "border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"}`}
                  onClick={() => setIsBreak(!isBreak)}
                >
                  {isBreak ? <Play className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
                  {isBreak ? "Resume" : "Break"}
                </Button>
                <Button variant="outline" size="lg" className="gap-2 h-11" onClick={handleScreenshotCapture}
                  disabled={!screenshotPermissionGranted}>
                  <Camera className="h-4 w-4" /> Capture
                </Button>
                <Button variant="destructive" size="lg" className="gap-2 h-11" onClick={() => stopSession.mutate()}>
                  <Square className="h-4 w-4" /> Stop
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Live Activity Bar ═══ */}
      {isTracking && (
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-foreground">Activity Level</span>
              <span className="text-sm font-mono font-bold">{activity.activityPercent}%</span>
            </div>
            <Progress value={activity.activityPercent} className="h-2" />
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { value: activity.keyCount, label: "Keystrokes", icon: Keyboard },
                { value: activity.mouseCount, label: "Clicks", icon: MousePointer2 },
                { value: `${Math.floor(activity.idleSeconds / 60)}m`, label: "Idle Time", icon: Clock },
                { value: tabVisible ? "Yes" : "No", label: "Tab Focus", icon: Eye },
              ].map((stat, i) => (
                <div key={i} className="text-center p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <stat.icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-base font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today", value: `${todayHours.toFixed(1)}h`, icon: Clock, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
          { label: "This Week", value: `${weekHours.toFixed(1)}h`, icon: BarChart3, iconBg: "bg-violet-500/10", iconColor: "text-violet-500" },
          { label: "Avg Activity", value: `${avgActivity.toFixed(0)}%`, icon: Activity, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
          { label: "Sessions", value: todaySessions.length, icon: TrendingUp, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/60 hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-3.5 px-4">
              <div className={`h-8 w-8 rounded-lg ${stat.iconBg} flex items-center justify-center mb-2.5`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ Tabs ═══ */}
      <Tabs defaultValue="history">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto bg-muted/50 p-1 h-auto gap-1">
            {[
              { value: "history", icon: Clock, label: "History" },
              { value: "screenshots", icon: Camera, label: "Screenshots" },
              { value: "transparency", icon: Shield, label: "Transparency" },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-sm px-4 py-2 data-[state=active]:shadow-sm">
                <tab.icon className="h-3.5 w-3.5" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* History */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Timer className="h-4 w-4" /> Request Correction
                </Button>
              </DialogTrigger>
              <DialogContent className="z-[60]">
                <DialogHeader><DialogTitle>Request Time Correction</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Start Time</Label><Input type="datetime-local" value={correctionData.start}
                    onChange={e => setCorrectionData(d => ({ ...d, start: e.target.value }))} /></div>
                  <div><Label>End Time</Label><Input type="datetime-local" value={correctionData.end}
                    onChange={e => setCorrectionData(d => ({ ...d, end: e.target.value }))} /></div>
                  <div><Label>Reason</Label><Textarea value={correctionData.reason}
                    onChange={e => setCorrectionData(d => ({ ...d, reason: e.target.value }))}
                    placeholder="Explain why you need this correction..." /></div>
                  <Button className="w-full" onClick={() => submitCorrection.mutate()}
                    disabled={!correctionData.start || !correctionData.end || !correctionData.reason}>
                    Submit for Approval
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-border/60">
            <CardContent className="pt-4">
              {mySessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No work sessions yet</p>
                  <p className="text-xs mt-1">Start your first session to see your work history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySessions.slice(0, 20).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{new Date(s.started_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {s.ended_at ? ` — ${new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : " — ongoing"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold">
                            {Math.floor((s.duration_seconds || 0) / 3600)}h {Math.floor(((s.duration_seconds || 0) % 3600) / 60)}m
                          </p>
                          <p className="text-[11px] text-muted-foreground">{Number(s.activity_percent || 0).toFixed(0)}% active</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getProductivityColor(s.productivity_score || s.status)}`}>
                          {s.productivity_score || s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Screenshots */}
        <TabsContent value="screenshots" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="pt-4">
              {!screenshotPermissionGranted && (
                <div className="text-center py-8 mb-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                  <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                    <MonitorUp className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">Enable Screen Sharing</p>
                  <p className="text-xs text-muted-foreground mb-3 max-w-[240px] mx-auto">Grant permission to capture screenshots during work sessions</p>
                  <Button size="sm" onClick={requestScreenshotPermission} className="gap-1.5">
                    <MonitorUp className="h-4 w-4" /> Grant Permission
                  </Button>
                </div>
              )}

              {capturedScreenshots.length === 0 && myDbScreenshots.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No screenshots yet</p>
                  <p className="text-xs mt-1 max-w-[260px] mx-auto">Screenshots are captured at random intervals during active sessions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {capturedScreenshots.map((ss, i) => (
                    <div key={`local-${i}`} className="rounded-xl border border-border/50 overflow-hidden group hover:shadow-md transition-all">
                      <img src={ss.url} alt="Screenshot" className="w-full aspect-video object-cover" />
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">{ss.window || "Desktop"}</p>
                        <p className="text-xs text-muted-foreground">{ss.time.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                        <Badge variant="outline" className="text-[10px] mt-1.5 px-1.5 py-0">This session</Badge>
                      </div>
                    </div>
                  ))}
                  {myDbScreenshots.map((ss: any) => (
                    <div key={ss.id} className="rounded-xl border border-border/50 overflow-hidden">
                      <div className="w-full aspect-video bg-muted/30 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">{ss.active_window || "Desktop"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(ss.captured_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{Number(ss.activity_percent).toFixed(0)}% activity</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transparency */}
        <TabsContent value="transparency" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> What's Being Tracked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                This is a browser-based tracker. Here's exactly what is monitored during your sessions:
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  { icon: Clock, label: "Time Tracking", desc: "Start/stop times, durations, break periods", on: true },
                  { icon: Keyboard, label: "Keystroke Count", desc: "Number of key presses (not content)", on: (config as any)?.keyboard_mouse_tracking !== false },
                  { icon: MousePointer2, label: "Mouse Clicks", desc: "Click and movement activity levels", on: (config as any)?.keyboard_mouse_tracking !== false },
                  { icon: Camera, label: "Screenshots", desc: "Random screen captures via browser API", on: screenshotEnabled },
                  { icon: Eye, label: "Tab Visibility", desc: "Whether the browser tab is in focus", on: true },
                  { icon: Globe, label: "Page URL", desc: "Current page URL during active tracking", on: (config as any)?.url_tracking !== false },
                  { icon: AppWindow, label: "Window Title", desc: "Browser tab title during capture", on: (config as any)?.app_tracking !== false },
                  { icon: AlertTriangle, label: "Idle Detection", desc: `Auto-pause after ${idleTimeout} min inactivity`, on: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    {item.on ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Off</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted/30 rounded-xl border border-border/40">
                <p className="font-semibold text-sm mb-1.5 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" /> Privacy Notice
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All tracking runs in your browser — no background processes or desktop agents.
                  Screenshots require explicit screen-sharing permission.
                  Keystroke <strong>content</strong> is never recorded, only counts. Data is
                  stored securely and retained for {(config as any)?.retention_days ?? 90} days.
                  You can pause at any time using the Break button.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
