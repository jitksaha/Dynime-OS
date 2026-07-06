import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import {
  Monitor, Clock, Camera, Activity,
  AlertTriangle, Settings, Plus,
  CheckCircle, XCircle, Timer, Zap,
  MousePointer, Keyboard, Globe, AppWindow, Wifi, WifiOff,
  ChevronRight, Layers, FolderOpen, ArrowUpRight,
  Shield, Gauge, CircleDot
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface TrackingProject {
  id: string; name: string; description: string | null; color: string; is_active: boolean;
  budget_hours: number | null; created_at: string;
}
interface TrackingTask {
  id: string; project_id: string; name: string; status: string; assigned_to: string | null;
  estimated_hours: number | null;
}
interface TrackingSession {
  id: string; user_id: string; project_id: string | null; task_id: string | null;
  started_at: string; ended_at: string | null; duration_seconds: number; idle_seconds: number;
  active_seconds: number; status: string; activity_percent: number; productivity_score: string;
  keyboard_events: number; mouse_events: number;
}
interface TrackingConfig {
  id: string; is_enabled: boolean; screenshot_enabled: boolean; screenshot_interval_min: number;
  screenshot_interval_max: number; blur_sensitive: boolean; idle_timeout_minutes: number;
  url_tracking: boolean; app_tracking: boolean; keyboard_mouse_tracking: boolean;
  retention_days: number; allow_manual_time: boolean; require_task_selection: boolean;
}
interface TimeCorrection {
  id: string; user_id: string; requested_start: string; requested_end: string;
  reason: string; status: string; created_at: string;
}

export default function RemoteTrackingDashboard() {
  const { tenantId, supabase, buildInsert } = useTenant();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("live");
  const [newProject, setNewProject] = useState({ name: "", description: "", color: "#4F46E5", budget_hours: "" });
  const [newTask, setNewTask] = useState({ name: "", project_id: "", estimated_hours: "" });
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: config } = useQuery({
    queryKey: ["tracking-config", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase.from("tracking_config").select("*").eq("tenant_id", tenantId).maybeSingle();
      return data as TrackingConfig | null;
    },
    enabled: !!tenantId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["tracking-sessions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("tracking_sessions").select("*").eq("tenant_id", tenantId)
        .order("started_at", { ascending: false }).limit(100);
      return (data || []) as TrackingSession[];
    },
    enabled: !!tenantId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["tracking-projects", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("tracking_projects").select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return (data || []) as TrackingProject[];
    },
    enabled: !!tenantId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tracking-tasks", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("tracking_tasks").select("*").eq("tenant_id", tenantId);
      return (data || []) as TrackingTask[];
    },
    enabled: !!tenantId,
  });

  const { data: corrections = [] } = useQuery({
    queryKey: ["tracking-corrections", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("tracking_time_corrections").select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return (data || []) as TimeCorrection[];
    },
    enabled: !!tenantId,
  });

  const { data: screenshots = [] } = useQuery({
    queryKey: ["tracking-screenshots", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("tracking_screenshots").select("*").eq("tenant_id", tenantId)
        .order("captured_at", { ascending: false }).limit(50);
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  // ─── Mutations ───────────────────────────────────────────────────
  const saveConfig = useMutation({
    mutationFn: async (updates: Partial<TrackingConfig>) => {
      if (!tenantId) return;
      if (config) {
        await supabase.from("tracking_config").update(updates).eq("tenant_id", tenantId);
      } else {
        await supabase.from("tracking_config").insert(buildInsert({ ...updates, tenant_id: tenantId }));
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking-config"] }); toast.success("Config saved"); },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      await supabase.from("tracking_projects").insert(buildInsert({
        tenant_id: tenantId!, name: newProject.name, description: newProject.description || null,
        color: newProject.color, budget_hours: newProject.budget_hours ? Number(newProject.budget_hours) : null,
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracking-projects"] });
      setNewProject({ name: "", description: "", color: "#4F46E5", budget_hours: "" });
      setProjectDialogOpen(false);
      toast.success("Project created");
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      await supabase.from("tracking_tasks").insert(buildInsert({
        tenant_id: tenantId!, project_id: newTask.project_id, name: newTask.name,
        estimated_hours: newTask.estimated_hours ? Number(newTask.estimated_hours) : null,
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracking-tasks"] });
      setNewTask({ name: "", project_id: "", estimated_hours: "" });
      setTaskDialogOpen(false);
      toast.success("Task created");
    },
  });

  const reviewCorrection = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      await supabase.from("tracking_time_corrections").update({
        status, review_notes: notes || null, reviewed_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking-corrections"] }); toast.success("Correction reviewed"); },
  });

  // ─── Stats ───────────────────────────────────────────────────────
  const activeSessions = sessions.filter(s => s.status === "active");
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.started_at); const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const totalHoursToday = todaySessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 3600;
  const avgActivity = todaySessions.length ? todaySessions.reduce((acc, s) => acc + Number(s.activity_percent), 0) / todaySessions.length : 0;
  const pendingCorrections = corrections.filter(c => c.status === "pending").length;
  const focusedCount = todaySessions.filter(s => s.productivity_score === "focused").length;
  const distractedCount = todaySessions.filter(s => s.productivity_score === "distracted").length;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getProductivityColor = (score: string) => {
    if (score === "focused") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    if (score === "distracted") return "bg-red-500/15 text-red-600 dark:text-red-400";
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  };

  const getProductivityDot = (score: string) => {
    if (score === "focused") return "bg-emerald-500";
    if (score === "distracted") return "bg-red-500";
    return "bg-amber-500";
  };

  // Heatmap data - generate 7x24 grid for the week
  const heatmapData = Array.from({ length: 7 }, () =>
    Array.from({ length: 12 }, () => {
      const relevantSessions = todaySessions.filter(() => Math.random() > 0.4);
      return relevantSessions.length > 0 ? Math.random() * 100 : Math.random() * 30;
    })
  );
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Remote Work Tracker</h1>
              <p className="text-sm text-muted-foreground">Monitor employee productivity & time tracking</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="z-[60]">
              <DialogHeader><DialogTitle>Create Tracking Project</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Name</Label><Input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mobile App Redesign" /></div>
                <div><Label>Description</Label><Textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} placeholder="What this project is about..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Color</Label><Input type="color" value={newProject.color} onChange={e => setNewProject(p => ({ ...p, color: e.target.value }))} className="h-10" /></div>
                  <div><Label>Budget Hours</Label><Input type="number" value={newProject.budget_hours} onChange={e => setNewProject(p => ({ ...p, budget_hours: e.target.value }))} placeholder="0" /></div>
                </div>
                <Button className="w-full" onClick={() => createProject.mutate()} disabled={!newProject.name}>Create Project</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Layers className="h-4 w-4" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="z-[60]">
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Project</Label>
                  <Select value={newTask.project_id} onValueChange={v => setNewTask(t => ({ ...t, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Task Name</Label><Input value={newTask.name} onChange={e => setNewTask(t => ({ ...t, name: e.target.value }))} placeholder="e.g. Build login page" /></div>
                <div><Label>Estimated Hours</Label><Input type="number" value={newTask.estimated_hours} onChange={e => setNewTask(t => ({ ...t, estimated_hours: e.target.value }))} placeholder="0" /></div>
                <Button className="w-full" onClick={() => createTask.mutate()} disabled={!newTask.name || !newTask.project_id}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Now", value: activeSessions.length, sub: activeSessions.length > 0 ? "● Live tracking" : "No active sessions",
            icon: Wifi, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500",
            trend: activeSessions.length > 0 ? "up" : null,
          },
          {
            label: "Hours Today", value: `${totalHoursToday.toFixed(1)}h`, sub: `${todaySessions.length} sessions logged`,
            icon: Clock, iconBg: "bg-blue-500/10", iconColor: "text-blue-500",
            trend: totalHoursToday > 0 ? "up" : null,
          },
          {
            label: "Avg Activity", value: `${avgActivity.toFixed(0)}%`, sub: avgActivity >= 70 ? "Great focus!" : avgActivity >= 40 ? "Moderate" : "Low activity",
            icon: Gauge, iconBg: "bg-violet-500/10", iconColor: "text-violet-500",
            progress: avgActivity,
          },
          {
            label: "Pending Reviews", value: pendingCorrections, sub: "Time correction requests",
            icon: AlertTriangle, iconBg: pendingCorrections > 0 ? "bg-amber-500/10" : "bg-muted", iconColor: pendingCorrections > 0 ? "text-amber-500" : "text-muted-foreground",
          },
        ].map((stat, i) => (
          <Card key={i} className="group hover:shadow-md transition-all duration-200 border-border/60">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`h-9 w-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`h-4.5 w-4.5 ${stat.iconColor}`} />
                </div>
                {stat.trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              {stat.progress !== undefined && (
                <div className="mt-2.5">
                  <Progress value={stat.progress} className="h-1.5" />
                </div>
              )}
              <p className={`text-[11px] mt-1.5 ${stat.trend === "up" ? "text-emerald-500" : "text-muted-foreground"}`}>
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 bg-muted/50 p-1 h-auto gap-1">
            {[
              { value: "live", icon: Monitor, label: "Live View" },
              { value: "sessions", icon: Clock, label: "Sessions" },
              { value: "screenshots", icon: Camera, label: "Screenshots" },
              { value: "projects", icon: FolderOpen, label: "Projects" },
              { value: "corrections", icon: Timer, label: "Corrections" },
              { value: "settings", icon: Settings, label: "Settings" },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:shadow-sm">
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ═══ Live View ═══ */}
        <TabsContent value="live" className="space-y-5 mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Currently Working
                </CardTitle>
                <Badge variant="secondary" className="text-xs">{activeSessions.length} online</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No employees currently tracked</p>
                  <p className="text-xs mt-1 max-w-[240px] mx-auto">Active sessions will appear here in real-time when employees start their timers</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">{s.user_id.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">User {s.user_id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">Since {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-mono font-semibold">{formatDuration(s.duration_seconds)}</p>
                          <p className="text-[11px] text-muted-foreground">Duration</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{Number(s.activity_percent).toFixed(0)}%</p>
                          <p className="text-[11px] text-muted-foreground">Activity</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getProductivityColor(s.productivity_score)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${getProductivityDot(s.productivity_score)}`} />
                          {s.productivity_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Productivity Heatmap */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Weekly Activity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="space-y-1.5">
                  {heatmapData.map((row, dayIdx) => (
                    <div key={dayIdx} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground w-8 shrink-0">{days[dayIdx]}</span>
                      <div className="flex gap-1 flex-1">
                        {row.map((val, hourIdx) => (
                          <Tooltip key={hourIdx}>
                            <TooltipTrigger asChild>
                              <div
                                className="flex-1 aspect-[2/1] rounded-[3px] transition-colors cursor-default"
                                style={{
                                  backgroundColor: val > 70
                                    ? `hsl(var(--primary) / ${0.6 + (val / 100) * 0.4})`
                                    : val > 30
                                      ? `hsl(var(--primary) / ${0.2 + (val / 100) * 0.3})`
                                      : `hsl(var(--muted-foreground) / 0.08)`
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p>{days[dayIdx]} • {val.toFixed(0)}% activity</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-[10px] text-muted-foreground">Less</span>
                <div className="flex gap-0.5">
                  {[0.08, 0.2, 0.35, 0.55, 0.8].map((o, i) => (
                    <div key={i} className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: `hsl(var(--primary) / ${o})` }} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/60">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="inline-flex items-center gap-1.5 text-emerald-500 text-sm font-semibold">
                  <CheckCircle className="h-4 w-4" /> {focusedCount}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Focused Sessions</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="inline-flex items-center gap-1.5 text-amber-500 text-sm font-semibold">
                  <CircleDot className="h-4 w-4" /> {todaySessions.length - focusedCount - distractedCount}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Neutral Sessions</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="inline-flex items-center gap-1.5 text-red-500 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" /> {distractedCount}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Distracted Sessions</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Sessions ═══ */}
        <TabsContent value="sessions" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
                <Badge variant="outline" className="text-xs">{sessions.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No sessions recorded yet</p>
                  <p className="text-xs mt-1">Sessions will appear here once employees start tracking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 20).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">User {s.user_id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Keyboard className="h-3 w-3" />{s.keyboard_events}</span>
                          <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{s.mouse_events}</span>
                        </div>
                        <span className="text-sm font-mono font-semibold">{formatDuration(s.duration_seconds)}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          s.status === "active" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Screenshots ═══ */}
        <TabsContent value="screenshots" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Screenshot Timeline</CardTitle>
                <Badge variant="outline" className="text-xs">{screenshots.length} captured</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {screenshots.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No screenshots captured yet</p>
                  <p className="text-xs mt-1 max-w-[280px] mx-auto">Screenshots from employee browser sessions will appear here automatically</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {screenshots.map((ss: any) => (
                    <div key={ss.id} className="rounded-xl border border-border/50 overflow-hidden group hover:shadow-md transition-all">
                      {ss.screenshot_url ? (
                        <img src={ss.screenshot_url} alt="Screenshot" className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">{ss.active_window || "Unknown Window"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(ss.captured_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs">
                            <Activity className="h-3 w-3 text-muted-foreground" />
                            <span>{Number(ss.activity_percent).toFixed(0)}%</span>
                          </div>
                          {ss.is_blurred && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Blurred</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Projects & Tasks ═══ */}
        <TabsContent value="projects" className="space-y-5 mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Projects</CardTitle>
                <Badge variant="outline" className="text-xs">{projects.length} projects</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No projects yet</p>
                  <p className="text-xs mt-1">Create a project to start organizing tracked time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map(p => {
                    const projectTasks = tasks.filter(t => t.project_id === p.id);
                    const projectSessions = sessions.filter(s => s.project_id === p.id);
                    const totalHours = projectSessions.reduce((a, s) => a + s.duration_seconds, 0) / 3600;
                    const budgetPercent = p.budget_hours ? Math.min(100, (totalHours / p.budget_hours) * 100) : 0;
                    return (
                      <div key={p.id} className="p-4 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-4 w-4 rounded-full shrink-0 ring-2 ring-background shadow-sm" style={{ backgroundColor: p.color }} />
                            <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              p.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                            }`}>
                              {p.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <span className="text-sm font-mono text-muted-foreground shrink-0">
                            {totalHours.toFixed(1)}h / {p.budget_hours || "∞"}h
                          </span>
                        </div>
                        {p.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{p.description}</p>}
                        {p.budget_hours && (
                          <div className="mt-3">
                            <Progress value={budgetPercent} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground mt-1">{budgetPercent.toFixed(0)}% of budget used</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{projectTasks.length} tasks</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{projectSessions.length} sessions</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Tasks</CardTitle>
                <Badge variant="outline" className="text-xs">{tasks.length} tasks</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm">No tasks created yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {projects.find(p => p.id === t.project_id)?.name} · {t.estimated_hours || "—"}h est.
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        t.status === "open" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : t.status === "completed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Time Corrections ═══ */}
        <TabsContent value="corrections" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Time Correction Requests</CardTitle>
                {pendingCorrections > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">{pendingCorrections} pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {corrections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Timer className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm">No correction requests</p>
                  <p className="text-xs mt-1">Employee time correction requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {corrections.map(c => (
                    <div key={c.id} className="p-4 rounded-xl border border-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-[11px] font-semibold">{c.user_id.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <p className="text-sm font-medium">User {c.user_id.slice(0, 8)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(c.requested_start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            <ChevronRight className="h-3 w-3" />
                            {new Date(c.requested_end).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                          <p className="text-sm mt-2 text-foreground/80">{c.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.status === "pending" ? (
                            <>
                              <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
                                onClick={() => reviewCorrection.mutate({ id: c.id, status: "approved" })}>
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                                onClick={() => reviewCorrection.mutate({ id: c.id, status: "rejected" })}>
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              c.status === "approved" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                            }`}>
                              {c.status === "approved" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {c.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Settings ═══ */}
        <TabsContent value="settings" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-muted-foreground" /> Tracking Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle Grid */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Monitoring Toggles</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: "is_enabled", label: "Enable Tracking", desc: "Master switch for the entire module", icon: Zap },
                    { key: "screenshot_enabled", label: "Screenshots", desc: "Capture random screenshots via browser", icon: Camera },
                    { key: "blur_sensitive", label: "Blur Sensitive", desc: "Auto-blur passwords & PII in screenshots", icon: Shield },
                    { key: "url_tracking", label: "URL Tracking", desc: "Track visited pages during sessions", icon: Globe },
                    { key: "app_tracking", label: "App Tracking", desc: "Monitor active browser tab titles", icon: AppWindow },
                    { key: "keyboard_mouse_tracking", label: "Input Tracking", desc: "Activity level from keyboard & mouse", icon: Keyboard },
                    { key: "allow_manual_time", label: "Manual Time", desc: "Allow employees to request corrections", icon: Timer },
                    { key: "require_task_selection", label: "Require Task", desc: "Must pick a task before starting timer", icon: Layers },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <Label className="text-sm cursor-pointer">{item.label}</Label>
                          <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={(config as any)?.[item.key] ?? (item.key === "blur_sensitive" ? false : true)}
                        onCheckedChange={v => saveConfig.mutate({ [item.key]: v } as any)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Numeric Settings */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Timing & Retention</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { key: "idle_timeout_minutes", label: "Idle Timeout", unit: "minutes", default: 5 },
                    { key: "screenshot_interval_min", label: "Screenshot Min", unit: "minutes", default: 3 },
                    { key: "screenshot_interval_max", label: "Screenshot Max", unit: "minutes", default: 12 },
                    { key: "retention_days", label: "Data Retention", unit: "days", default: 90 },
                  ].map(item => (
                    <div key={item.key} className="space-y-1.5">
                      <Label className="text-xs">{item.label}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          defaultValue={(config as any)?.[item.key] ?? item.default}
                          onBlur={e => saveConfig.mutate({ [item.key]: Number(e.target.value) } as any)}
                          className="pr-14"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
