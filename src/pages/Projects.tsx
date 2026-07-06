// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, CheckCircle2, Users, Trash2, Search, Calendar, Clock,
  Target, TrendingUp, ListChecks, ToggleLeft, Link2, Milestone,
  Timer, MoreHorizontal, X, MessageSquare, Pencil,
} from "lucide-react";
import FormDialog from "@/components/FormDialog";
import KanbanBoard, { KanbanColumn } from "@/components/KanbanBoard";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { DropResult } from "@hello-pangea/dnd";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

// ── Types ──────────────────────────────────────────────

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
}

interface Project {
  id: string;
  name: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  team_size: number;
  deadline: string | null;
  status: string;
  description: string | null;
  created_at: string;
  priority?: string;
  category?: string;
  budget?: number;
  actual_cost?: number;
}

interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_name: string | null;
  due_date: string | null;
  estimated_hours: number;
  actual_hours: number;
  parent_task_id: string | null;
  sort_order: number;
  tags: string[];
  created_at: string;
}

interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
}

interface CrmLink {
  id: string;
  project_id: string;
  task_id: string | null;
  link_type: string;
  linked_entity_id: string;
  linked_entity_name: string | null;
}

interface Deal {
  id: string;
  name: string;
  stage: string;
  value: number;
  contact_name: string | null;
}

interface Activity {
  id: string;
  project_id: string;
  task_id: string | null;
  action: string;
  details: any;
  user_name: string | null;
  created_at: string;
}

// ── Config ─────────────────────────────────────────────

const statusConfig = [
  { name: "On Track", color: "border-t-success", bg: "bg-success/10 text-success" },
  { name: "At Risk", color: "border-t-warning", bg: "bg-warning/10 text-warning" },
  { name: "Delayed", color: "border-t-destructive", bg: "bg-destructive/10 text-destructive" },
];

const taskStatuses = ["todo", "in_progress", "in_review", "done"];
const taskStatusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", in_review: "In Review", done: "Done" };
const _taskStatusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-info/10 text-info",
  in_review: "bg-warning/10 text-warning",
  done: "bg-success/10 text-success",
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-info/10 text-info" },
  high: { label: "High", color: "bg-warning/10 text-warning" },
  urgent: { label: "Urgent", color: "bg-destructive/10 text-destructive" },
};

const nextStatus: Record<string, string> = { "On Track": "At Risk", "At Risk": "Delayed", Delayed: "On Track" };

// ── Component ──────────────────────────────────────────

export default function Projects() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { createProjectMilestone } = useCalendarSync();
  const { formatPrice } = useTenantCurrency();

  // Core state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "kanban" | "timeline" | "analytics">("grid");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Detail view state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailTab, setDetailTab] = useState("tasks");
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [crmLinks, setCrmLinks] = useState<CrmLink[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [linkDealDialogOpen, setLinkDealDialogOpen] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "kanban">("list");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // ── Data Fetching ──

  const fetchEmployees = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("employees").select("id, full_name, department").eq("tenant_id", tenantId).eq("status", "Active");
    setEmployees((data as Employee[]) || []);
  }, [tenantId]);

  const fetchProjects = useCallback(async () => {
    if (!tenantId) return;
    const { data, error } = await supabase.from("projects").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setProjects(data as Project[]);
    setLoading(false);
  }, [tenantId]);

  const fetchTasks = useCallback(async (projectId: string) => {
    if (!tenantId) return;
    const { data } = await supabase.from("project_tasks").select("*").eq("project_id", projectId).eq("tenant_id", tenantId).order("sort_order");
    setTasks((data as ProjectTask[]) || []);
  }, [tenantId]);

  const fetchMilestones = useCallback(async (projectId: string) => {
    if (!tenantId) return;
    const { data } = await supabase.from("project_milestones").select("*").eq("project_id", projectId).eq("tenant_id", tenantId).order("due_date");
    setMilestones((data as ProjectMilestone[]) || []);
  }, [tenantId]);

  const fetchCrmLinks = useCallback(async (projectId: string) => {
    if (!tenantId) return;
    const { data } = await supabase.from("project_crm_links").select("*").eq("project_id", projectId).eq("tenant_id", tenantId);
    setCrmLinks((data as CrmLink[]) || []);
  }, [tenantId]);

  const fetchDeals = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("deals").select("id, name, stage, value, contact_name").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50);
    setDeals((data as Deal[]) || []);
  }, [tenantId]);

  const fetchActivities = useCallback(async (projectId: string) => {
    if (!tenantId) return;
    const { data } = await supabase.from("project_activities").select("*").eq("project_id", projectId).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(30);
    setActivities((data as Activity[]) || []);
  }, [tenantId]);

  useEffect(() => { fetchProjects(); fetchEmployees(); }, [tenantId]);

  const openProjectDetail = async (project: Project) => {
    setSelectedProject(project);
    setDetailTab("tasks");
    await Promise.all([
      fetchTasks(project.id),
      fetchMilestones(project.id),
      fetchCrmLinks(project.id),
      fetchActivities(project.id),
      fetchDeals(),
    ]);
  };

  const logActivity = async (projectId: string, action: string, details?: any, taskId?: string) => {
    if (!tenantId) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("project_activities").insert({
      project_id: projectId,
      task_id: taskId || null,
      tenant_id: tenantId,
      action,
      details: details || {},
      user_id: user?.id || "",
      user_name: user?.email?.split("@")[0] || "Unknown",
    });
  };

  // ── CRUD Operations ──

  const updateProject = async (data: any) => {
    if (!selectedProject) return;
    const updates: any = {
      name: data.name,
      deadline: data.deadline || null,
      team_size: parseInt(data.team) || selectedProject.team_size,
      total_tasks: parseInt(data.total_tasks) || selectedProject.total_tasks,
      description: data.description || null,
      priority: data.priority || "medium",
      budget: parseFloat(data.budget) || 0,
    };
    const { error } = await supabase.from("projects").update(updates).eq("id", selectedProject.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project updated");
    await logActivity(selectedProject.id, "project_updated", { name: data.name });
    setEditDialogOpen(false);
    setSelectedProject({ ...selectedProject, ...updates });
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project deleted");
    fetchProjects();
  };

  const toggleProjectStatus = async (project: Project) => {
    const newStatus = nextStatus[project.status] || "On Track";
    const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", project.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status → ${newStatus}`);
    await logActivity(project.id, "status_change", { from: project.status, to: newStatus });
    fetchProjects();
  };

  const createTask = async (data: any) => {
    if (!tenantId || !selectedProject) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("project_tasks").insert({
      project_id: selectedProject.id,
      tenant_id: tenantId,
      title: data.title,
      description: data.description || null,
      priority: data.priority || "medium",
      assigned_name: data.assigned_name || null,
      due_date: data.due_date || null,
      estimated_hours: parseFloat(data.estimated_hours) || 0,
      created_by: user?.id || "",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task created");
    await logActivity(selectedProject.id, "task_created", { title: data.title });
    fetchTasks(selectedProject.id);
    // Update project task count
    const newTotal = tasks.length + 1;
    await supabase.from("projects").update({ total_tasks: newTotal }).eq("id", selectedProject.id);
    setTaskDialogOpen(false);
  };

  const updateTaskStatus = async (task: ProjectTask, newStatus: string) => {
    const { error } = await supabase.from("project_tasks").update({ status: newStatus }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(task.project_id, "task_status_change", { task: task.title, from: task.status, to: newStatus }, task.id);
    if (selectedProject) {
      fetchTasks(selectedProject.id);
      // Recalculate progress
      const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      const done = updatedTasks.filter(t => t.status === "done").length;
      const total = updatedTasks.length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      await supabase.from("projects").update({ completed_tasks: done, progress }).eq("id", selectedProject.id);
    }
  };

  const deleteTask = async (task: ProjectTask) => {
    const { error } = await supabase.from("project_tasks").delete().eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    if (selectedProject) fetchTasks(selectedProject.id);
  };

  const createMilestone = async (data: any) => {
    if (!tenantId || !selectedProject) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("project_milestones").insert({
      project_id: selectedProject.id,
      tenant_id: tenantId,
      title: data.title,
      description: data.description || null,
      due_date: data.due_date || null,
      created_by: user?.id || "",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Milestone created");
    await logActivity(selectedProject.id, "milestone_created", { title: data.title });
    fetchMilestones(selectedProject.id);
    if (data.due_date) {
      await createProjectMilestone(selectedProject.name, data.title, new Date(data.due_date).toISOString(), "new");
    }
    setMilestoneDialogOpen(false);
  };

  const toggleMilestoneStatus = async (m: ProjectMilestone) => {
    const newStatus = m.status === "completed" ? "pending" : "completed";
    await supabase.from("project_milestones").update({ status: newStatus }).eq("id", m.id);
    if (selectedProject) fetchMilestones(selectedProject.id);
  };

  const linkDeal = async (deal: Deal) => {
    if (!tenantId || !selectedProject) return;
    const { data: { user } } = await supabase.auth.getUser();
    const exists = crmLinks.find(l => l.linked_entity_id === deal.id);
    if (exists) { toast.error("Deal already linked"); return; }
    const { error } = await supabase.from("project_crm_links").insert({
      project_id: selectedProject.id,
      tenant_id: tenantId,
      link_type: "deal",
      linked_entity_id: deal.id,
      linked_entity_name: deal.name,
      created_by: user?.id || "",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Deal linked");
    await logActivity(selectedProject.id, "crm_linked", { deal: deal.name });
    fetchCrmLinks(selectedProject.id);
    setLinkDealDialogOpen(false);
  };

  const unlinkDeal = async (link: CrmLink) => {
    await supabase.from("project_crm_links").delete().eq("id", link.id);
    toast.success("Unlinked");
    if (selectedProject) fetchCrmLinks(selectedProject.id);
  };

  // ── Kanban Drag ──

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const project = projects.find(p => p.id === draggableId);
    if (!project || project.status === newStatus) return;
    setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, status: newStatus } : p));
    const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", draggableId);
    if (error) {
      toast.error("Failed to update");
      setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, status: project.status } : p));
    }
  };

  const handleTaskDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const task = tasks.find(t => t.id === draggableId);
    if (!task || task.status === newStatus) return;
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
    await updateTaskStatus(task, newStatus);
  };

  // ── Computed ──

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (priorityFilter !== "All" && (p.priority || "medium") !== priorityFilter) return false;
      return true;
    });
  }, [projects, search, statusFilter, priorityFilter]);

  const analytics = useMemo(() => {
    const totalTasks = projects.reduce((a, p) => a + p.total_tasks, 0);
    const completedTasks = projects.reduce((a, p) => a + p.completed_tasks, 0);
    const avgProgress = projects.length ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length) : 0;
    const overdue = projects.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status !== "On Track").length;
    const byStatus = statusConfig.map(s => ({ name: s.name, count: projects.filter(p => p.status === s.name).length }));
    const totalBudget = projects.reduce((a, p) => a + (p.budget || 0), 0);
    const totalCost = projects.reduce((a, p) => a + (p.actual_cost || 0), 0);
    const workload = employees.slice(0, 8).map(e => ({
      name: e.full_name.split(" ")[0],
      projects: Math.floor(Math.random() * 5) + 1,
      tasks: Math.floor(Math.random() * 15) + 2,
    }));
    return { totalTasks, completedTasks, avgProgress, overdue, byStatus, workload, totalBudget, totalCost };
  }, [projects, employees]);

  const employeeOptions = employees.map(e => ({ value: e.id, label: e.full_name, sublabel: e.department || undefined }));

  const projectFields = [
    { name: "name", label: "Project Name", placeholder: "e.g. Website Redesign", required: true },
    { name: "assigned_to", label: "Team Lead", type: "autocomplete" as const, placeholder: "Search employees...", autocompleteOptions: employeeOptions },
    { name: "deadline", label: "Deadline", type: "date" as const, required: true },
    { name: "team", label: "Team Size", type: "number" as const, placeholder: "e.g. 5", required: true },
    { name: "total_tasks", label: "Estimated Tasks", type: "number" as const, placeholder: "e.g. 10" },
    { name: "priority", label: "Priority", type: "select" as const, options: ["low", "medium", "high", "urgent"] },
    { name: "budget", label: "Budget", type: "number" as const, placeholder: "e.g. 5000" },
    { name: "description", label: "Description", type: "textarea" as const, placeholder: "Brief description..." },
  ];

  const editProjectDefaults = selectedProject ? {
    name: selectedProject.name,
    deadline: selectedProject.deadline?.split("T")[0] || "",
    team: String(selectedProject.team_size),
    total_tasks: String(selectedProject.total_tasks),
    priority: selectedProject.priority || "medium",
    budget: String(selectedProject.budget || ""),
    description: selectedProject.description || "",
  } : undefined;

  const taskFields = [
    { name: "title", label: "Task Title", placeholder: "e.g. Design wireframes", required: true },
    { name: "description", label: "Description", type: "textarea" as const, placeholder: "Task details..." },
    { name: "priority", label: "Priority", type: "select" as const, options: ["low", "medium", "high", "urgent"] },
    { name: "assigned_name", label: "Assignee", type: "autocomplete" as const, placeholder: "Search employees...", autocompleteOptions: employeeOptions },
    { name: "due_date", label: "Due Date", type: "date" as const },
    { name: "estimated_hours", label: "Estimated Hours", type: "number" as const, placeholder: "e.g. 4" },
  ];

  const milestoneFields = [
    { name: "title", label: "Milestone Title", placeholder: "e.g. Phase 1 Complete", required: true },
    { name: "description", label: "Description", type: "textarea" as const },
    { name: "due_date", label: "Due Date", type: "date" as const, required: true },
  ];

  const columns: KanbanColumn<Project>[] = statusConfig.map(sc => ({
    id: sc.name, title: sc.name, color: sc.color,
    items: filtered.filter(p => p.status === sc.name),
  }));

  const taskColumns: KanbanColumn<ProjectTask>[] = taskStatuses.map(s => ({
    id: s, title: taskStatusLabels[s], color: s === "done" ? "border-t-success" : s === "in_progress" ? "border-t-info" : s === "in_review" ? "border-t-warning" : "border-t-muted-foreground",
    items: tasks.filter(t => t.status === s),
  }));

  // ── Render Helpers ──

  const renderProjectCard = (project: Project) => (
    <div
      className="p-3 rounded-lg border border-border bg-background hover:border-primary/20 transition-colors cursor-grab active:cursor-grabbing"
      onClick={() => openProjectDetail(project)}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
        <Badge variant="outline" className={`text-[10px] ${priorityConfig[project.priority || "medium"]?.color}`}>
          {priorityConfig[project.priority || "medium"]?.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">Due {project.deadline ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</p>
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium text-foreground">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-1.5" />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
        <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{project.completed_tasks}/{project.total_tasks}</div>
        <div className="flex items-center gap-1"><Users className="h-3 w-3" />{project.team_size}</div>
      </div>
    </div>
  );

  const renderTaskCard = (task: ProjectTask) => (
    <div className="p-2.5 rounded-lg border border-border bg-background hover:border-primary/20 transition-colors cursor-grab">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-foreground truncate">{task.title}</h4>
        <Badge variant="outline" className={`text-[9px] px-1.5 ${priorityConfig[task.priority]?.color}`}>
          {priorityConfig[task.priority]?.label}
        </Badge>
      </div>
      {task.assigned_name && <p className="text-[10px] text-muted-foreground">→ {task.assigned_name}</p>}
      {task.due_date && <p className="text-[10px] text-muted-foreground mt-0.5">Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
      {task.estimated_hours > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
          <Timer className="h-2.5 w-2.5" />{task.actual_hours}/{task.estimated_hours}h
        </div>
      )}
    </div>
  );

  // ── Detail Panel ──

  const renderDetailPanel = () => {
    if (!selectedProject) return null;
    const p = selectedProject;
    const statusCfg = statusConfig.find(s => s.name === p.status);

    return (
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold">{p.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{p.description || "No description"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditDialogOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <Badge className={statusCfg?.bg || ""}>{p.status}</Badge>
                </div>
              </div>
            </DialogHeader>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{p.progress}%</p>
                <p className="text-[10px] text-muted-foreground">Progress</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{tasks.filter(t => t.status === "done").length}/{tasks.length}</p>
                <p className="text-[10px] text-muted-foreground">Tasks Done</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{milestones.filter(m => m.status === "completed").length}/{milestones.length}</p>
                <p className="text-[10px] text-muted-foreground">Milestones</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{crmLinks.length}</p>
                <p className="text-[10px] text-muted-foreground">CRM Links</p>
              </div>
            </div>
            <Progress value={p.progress} className="h-2 mt-3" />
          </div>

          {/* Tabs */}
          <div className="p-4">
            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="tasks" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" />Tasks</TabsTrigger>
                <TabsTrigger value="milestones" className="gap-1.5"><Milestone className="h-3.5 w-3.5" />Milestones</TabsTrigger>
                <TabsTrigger value="crm" className="gap-1.5"><Link2 className="h-3.5 w-3.5" />CRM</TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Activity</TabsTrigger>
              </TabsList>

              {/* Tasks Tab */}
              {detailTab === "tasks" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        <button onClick={() => setTaskView("list")} className={`px-2.5 py-1 text-xs ${taskView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>List</button>
                        <button onClick={() => setTaskView("kanban")} className={`px-2.5 py-1 text-xs ${taskView === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Board</button>
                      </div>
                    </div>
                    <button onClick={() => setTaskDialogOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                      <Plus className="h-3 w-3" />Add Task
                    </button>
                  </div>

                  {taskView === "kanban" ? (
                    <div className="overflow-x-auto -mx-4 px-4">
                      <div className="min-w-[600px]">
                        <KanbanBoard columns={taskColumns} onDragEnd={handleTaskDragEnd} getItemId={t => t.id} renderCard={renderTaskCard} />
                      </div>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No tasks yet. Create your first task above.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors group">
                          <button
                            onClick={() => updateTaskStatus(task, task.status === "done" ? "todo" : "done")}
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.status === "done" ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary"}`}
                          >
                            {task.status === "done" && <CheckCircle2 className="h-3 w-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.assigned_name && <span className="text-[10px] text-muted-foreground">→ {task.assigned_name}</span>}
                              {task.due_date && <span className="text-[10px] text-muted-foreground">Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[9px] ${priorityConfig[task.priority]?.color}`}>{priorityConfig[task.priority]?.label}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {taskStatuses.filter(s => s !== task.status).map(s => (
                                <DropdownMenuItem key={s} onClick={() => updateTaskStatus(task, s)}>Move to {taskStatusLabels[s]}</DropdownMenuItem>
                              ))}
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteTask(task)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Milestones Tab */}
              {detailTab === "milestones" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button onClick={() => setMilestoneDialogOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                      <Plus className="h-3 w-3" />Add Milestone
                    </button>
                  </div>
                  {milestones.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No milestones yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {milestones.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                          <button onClick={() => toggleMilestoneStatus(m)} className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${m.status === "completed" ? "border-success bg-success" : "border-border"}`}>
                            {m.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-success-foreground" />}
                          </button>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${m.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</p>
                            {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                          </div>
                          {m.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(m.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CRM Links Tab */}
              {detailTab === "crm" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button onClick={() => setLinkDealDialogOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                      <Link2 className="h-3 w-3" />Link Deal
                    </button>
                  </div>
                  {crmLinks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No CRM links. Connect deals to track revenue impact.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {crmLinks.map(link => {
                        const deal = deals.find(d => d.id === link.linked_entity_id);
                        return (
                          <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Target className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-foreground">{link.linked_entity_name || "Unknown Deal"}</p>
                              {deal && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{deal.stage}</span>
                                  <span>•</span>
                                   <span>{formatPrice(deal.value)}</span>
                                  {deal.contact_name && <><span>•</span><span>{deal.contact_name}</span></>}
                                </div>
                              )}
                            </div>
                            <button onClick={() => unlinkDeal(link)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Link Deal Dialog */}
                  <Dialog open={linkDealDialogOpen} onOpenChange={setLinkDealDialogOpen}>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Link a CRM Deal</DialogTitle></DialogHeader>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {deals.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No deals found in CRM.</p>
                        ) : deals.map(deal => (
                          <button key={deal.id} onClick={() => linkDeal(deal)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Target className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{deal.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{deal.stage}</span>
                                <span>•</span>
                                <span>{formatPrice(deal.value)}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Activity Tab */}
              {detailTab === "activity" && (
                <div className="space-y-2">
                  {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No activity yet.</div>
                  ) : activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-2.5 text-xs">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground">
                          <span className="font-medium">{a.user_name || "System"}</span>{" "}
                          {a.action.replace(/_/g, " ")}
                          {a.details?.title && <span className="text-primary"> "{a.details.title}"</span>}
                          {a.details?.to && <span className="text-muted-foreground"> → {a.details.to}</span>}
                        </p>
                        <p className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Main Render ──

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {renderDetailPanel()}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage projects, tasks, milestones & CRM links</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["grid", "kanban", "timeline", "analytics"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${viewMode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-primary/10"}`}>{m}</button>
            ))}
          </div>
          <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Projects", value: projects.length, color: "text-foreground", icon: Target },
          { label: "On Track", value: projects.filter(p => p.status === "On Track").length, color: "text-success", icon: CheckCircle2 },
          { label: "Avg Progress", value: `${analytics.avgProgress}%`, color: "text-primary", icon: TrendingUp },
          { label: "Overdue", value: analytics.overdue, color: "text-destructive", icon: Clock },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-2"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="All">All Status</option>
          {statusConfig.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="All">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* View Content */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : viewMode === "analytics" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Distribution */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
              <div className="space-y-3">
                {analytics.byStatus.map(s => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{s.name}</span>
                      <span className="text-sm font-bold text-foreground">{s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${s.name === "On Track" ? "bg-success" : s.name === "At Risk" ? "bg-warning" : "bg-destructive"}`} style={{ width: `${projects.length ? (s.count / projects.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                <div><p className="text-2xl font-bold text-foreground">{analytics.totalTasks}</p><p className="text-xs text-muted-foreground">Total Tasks</p></div>
                <div><p className="text-2xl font-bold text-success">{analytics.completedTasks}</p><p className="text-xs text-muted-foreground">Completed</p></div>
              </div>
            </div>
            {/* Team Workload */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Team Workload</h3>
              {analytics.workload.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No team members found</p>
              ) : (
                <div className="space-y-3">
                  {analytics.workload.map(w => (
                    <div key={w.name} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{w.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{w.name}</span>
                          <span className="text-xs text-muted-foreground">{w.projects}P · {w.tasks}T</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                          <div className={`h-full rounded-full transition-all ${w.tasks > 10 ? "bg-destructive" : w.tasks > 6 ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.min((w.tasks / 15) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Budget Overview */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Budget Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div><p className="text-xl font-bold text-foreground">{formatPrice(analytics.totalBudget)}</p><p className="text-xs text-muted-foreground">Total Budget</p></div>
               <div><p className="text-xl font-bold text-warning">{formatPrice(analytics.totalCost)}</p><p className="text-xs text-muted-foreground">Actual Cost</p></div>
               <div><p className="text-xl font-bold text-success">{formatPrice(analytics.totalBudget - analytics.totalCost)}</p><p className="text-xs text-muted-foreground">Remaining</p></div>
              <div><p className="text-xl font-bold text-foreground">{analytics.totalBudget > 0 ? Math.round((analytics.totalCost / analytics.totalBudget) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Utilization</p></div>
            </div>
          </div>
        </div>
      ) : viewMode === "timeline" ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Project Timeline</h3>
          <div className="space-y-3">
            {filtered.map(p => {
              const start = new Date(p.created_at);
              const end = p.deadline ? new Date(p.deadline) : new Date();
              const now = new Date();
              const totalDuration = end.getTime() - start.getTime();
              const elapsed = now.getTime() - start.getTime();
              const timeProgress = totalDuration > 0 ? Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100) : 0;
              const daysLeft = p.deadline ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={p.id} className="flex items-center gap-4 cursor-pointer hover:bg-muted/30 rounded-lg p-1 transition-colors" onClick={() => openProjectDetail(p)}>
                  <div className="w-32 sm:w-48 shrink-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{daysLeft !== null ? (daysLeft > 0 ? `${daysLeft}d left` : "Overdue") : "No deadline"}</p>
                  </div>
                  <div className="flex-1">
                    <div className="relative h-6 rounded-full bg-secondary overflow-hidden">
                      <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${p.status === "Delayed" ? "bg-destructive/60" : p.status === "At Risk" ? "bg-warning/60" : "bg-success/60"}`} style={{ width: `${timeProgress}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-primary/80" style={{ width: `${p.progress}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{p.progress}%</span>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <Badge variant="outline" className={`text-[10px] ${statusConfig.find(s => s.name === p.status)?.bg}`}>{p.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard columns={columns} onDragEnd={handleDragEnd} getItemId={p => p.id} renderCard={renderProjectCard} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No projects found.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <div key={project.id} className="module-card" onClick={() => openProjectDetail(project)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Due {project.deadline ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${priorityConfig[project.priority || "medium"]?.color}`}>
                    {priorityConfig[project.priority || "medium"]?.label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${statusConfig.find(s => s.name === project.status)?.bg}`}>{project.status}</Badge>
                </div>
              </div>
              {project.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-xs font-medium text-foreground">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1.5" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{project.completed_tasks}/{project.total_tasks}</div>
                  <div className="flex items-center gap-1"><Users className="h-3 w-3" />{project.team_size}</div>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleProjectStatus(project)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Change status">
                    <ToggleLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteProject(project.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Project"
        fields={projectFields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("projects").insert(buildInsert({
            name: data.name,
            deadline: data.deadline || null,
            team_size: parseInt(data.team) || 1,
            total_tasks: parseInt(data.total_tasks) || 0,
            description: data.description || null,
            priority: data.priority || "medium",
            budget: parseFloat(data.budget) || 0,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Project created");
          if (data.deadline) {
            await createProjectMilestone(data.name, "Project Deadline", new Date(data.deadline).toISOString(), "new");
          }
          setDialogOpen(false);
          fetchProjects();
        }}
      />

      {/* Create Task Dialog */}
      <FormDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        title="Add Task"
        fields={taskFields}
        onSubmit={createTask}
      />

      {/* Create Milestone Dialog */}
      <FormDialog
        open={milestoneDialogOpen}
        onClose={() => setMilestoneDialogOpen(false)}
        title="Add Milestone"
        fields={milestoneFields}
        onSubmit={createMilestone}
      />

      {/* Edit Project Dialog */}
      <FormDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit Project"
        fields={projectFields}
        defaultValues={editProjectDefaults}
        onSubmit={updateProject}
      />
    </div>
  );
}
