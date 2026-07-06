import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, CheckCircle2, AlertCircle, MessageSquare, Search, Filter, Tag, Timer, BarChart3, BookOpen, User, TrendingUp, Zap, ChevronDown, ChevronRight, X } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  customer: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  description?: string | null;
}

const priorityColor: Record<string, string> = {
  Critical: "bg-destructive/10 text-destructive",
  High: "bg-warning/10 text-warning",
  Medium: "bg-info/10 text-info",
  Low: "bg-secondary text-muted-foreground",
};

const statusIcon: Record<string, React.ElementType> = {
  Open: AlertCircle,
  "In Progress": Clock,
  Resolved: CheckCircle2,
};

const statusColor: Record<string, string> = {
  Open: "bg-warning/10 text-warning",
  "In Progress": "bg-info/10 text-info",
  Resolved: "bg-success/10 text-success",
};

const CATEGORIES = ["General", "Billing", "Technical", "Account", "Feature Request", "Bug Report"];

const KB_ARTICLES = [
  { title: "How to reset your password", category: "Account", views: 1240 },
  { title: "Understanding your invoice", category: "Billing", views: 890 },
  { title: "Getting started guide", category: "General", views: 2100 },
  { title: "API integration setup", category: "Technical", views: 560 },
  { title: "Troubleshooting login issues", category: "Account", views: 1560 },
  { title: "Managing team permissions", category: "General", views: 430 },
];

export default function Helpdesk() {
  const navigate = useNavigate();
  const { tenantId, buildInsert, supabase } = useTenant();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"tickets" | "knowledge" | "metrics">("tickets");

  const fetchTickets = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase.from("tickets").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setTickets(data as Ticket[]);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [tenantId]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tickets").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Ticket ${status.toLowerCase()}`);
    fetchTickets();
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket deleted");
    fetchTickets();
  };

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.ticket_number.toLowerCase().includes(search.toLowerCase()) && !t.customer.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const fields = [
    { name: "subject", label: "Subject", placeholder: "e.g. Login issue", required: true },
    { name: "customer", label: "Customer", placeholder: "e.g. Acme Corp", required: true },
    { name: "priority", label: "Priority", type: "select" as const, options: ["Low", "Medium", "High", "Critical"], required: true },
    { name: "category", label: "Category", type: "select" as const, options: CATEGORIES, required: true },
    { name: "description", label: "Description", type: "textarea" as const, placeholder: "Describe the issue..." },
  ];

  // Metrics calculations
  const metrics = useMemo(() => {
    const open = tickets.filter(t => t.status === "Open").length;
    const inProgress = tickets.filter(t => t.status === "In Progress").length;
    const resolved = tickets.filter(t => t.status === "Resolved").length;
    const critical = tickets.filter(t => t.priority === "Critical" && t.status !== "Resolved").length;
    // SLA mock: avg resolution time
    const resolvedTickets = tickets.filter(t => t.status === "Resolved");
    const avgResolutionHours = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((acc, t) => acc + Math.random() * 48 + 2, 0) / resolvedTickets.length)
      : 0;
    const slaCompliance = resolvedTickets.length > 0 ? Math.round((resolvedTickets.filter(() => Math.random() > 0.15).length / resolvedTickets.length) * 100) : 100;
    // By priority
    const byPriority = ["Critical", "High", "Medium", "Low"].map(p => ({
      name: p, count: tickets.filter(t => t.priority === p).length,
    }));
    // Agent performance
    const agents = [...new Set(tickets.filter(t => t.assigned_to).map(t => t.assigned_to!))];
    const agentStats = agents.slice(0, 5).map(a => ({
      name: a,
      total: tickets.filter(t => t.assigned_to === a).length,
      resolved: tickets.filter(t => t.assigned_to === a && t.status === "Resolved").length,
      satisfaction: Math.round(70 + Math.random() * 30),
    }));
    return { open, inProgress, resolved, critical, avgResolutionHours, slaCompliance, byPriority, agentStats };
  }, [tickets]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Helpdesk</h1>
          <p className="text-sm text-muted-foreground mt-1">Support tickets, SLA tracking & knowledge base</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New Ticket
        </button>
      </div>

      {/* Stats with SLA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Open Tickets", count: metrics.open, icon: AlertCircle, color: "text-warning" },
          { label: "In Progress", count: metrics.inProgress, icon: Clock, color: "text-info" },
          { label: "SLA Compliance", count: `${metrics.slaCompliance}%`, icon: Timer, color: metrics.slaCompliance >= 90 ? "text-success" : "text-destructive" },
          { label: "Avg Resolution", count: `${metrics.avgResolutionHours}h`, icon: TrendingUp, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className="text-xl sm:text-2xl font-bold text-foreground">{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        {(["tickets", "knowledge", "metrics"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${activeTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{tab === "knowledge" ? "Knowledge Base" : tab === "metrics" ? "Agent Metrics" : "Tickets"}</button>
        ))}
        <button onClick={() => navigate("/helpdesk/live-chat")} className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Live Chat
        </button>
      </div>

      {activeTab === "knowledge" ? (
        /* Knowledge Base */
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search knowledge base..." className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {KB_ARTICLES.map(article => (
              <div key={article.title} className="module-card hover:border-primary/20 cursor-pointer transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{article.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-info/10 text-info">{article.category}</span>
                      <span className="text-xs text-muted-foreground">{article.views.toLocaleString()} views</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === "metrics" ? (
        /* Agent Metrics */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Priority Distribution */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Tickets by Priority</h3>
            <div className="space-y-3">
              {metrics.byPriority.map(p => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${priorityColor[p.name]?.split(" ")[1] || "text-foreground"}`}>{p.name}</span>
                    <span className="text-sm font-bold text-foreground">{p.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${p.name === "Critical" ? "bg-destructive" : p.name === "High" ? "bg-warning" : p.name === "Medium" ? "bg-info" : "bg-muted-foreground/40"}`} style={{ width: `${tickets.length ? (p.count / tickets.length) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Performance */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Agent Performance</h3>
            {metrics.agentStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agent data available</p>
            ) : (
              <div className="space-y-3">
                {metrics.agentStats.map(a => (
                  <div key={a.name} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{a.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{a.total} tickets</span>
                        <span>{a.resolved} resolved</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${a.satisfaction >= 85 ? "text-success" : a.satisfaction >= 70 ? "text-warning" : "text-destructive"}`}>{a.satisfaction}%</p>
                      <p className="text-[10px] text-muted-foreground">satisfaction</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Time Chart */}
          <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Resolution Time Trend (Last 14 Days)</h3>
            <div className="flex items-end gap-1 h-32">
              {Array.from({ length: 14 }, (_, i) => {
                const h = 20 + Math.random() * 60;
                return <div key={i} className={`flex-1 rounded-t transition-colors ${h > 60 ? "bg-destructive/40 hover:bg-destructive/60" : h > 40 ? "bg-warning/40 hover:bg-warning/60" : "bg-success/40 hover:bg-success/60"}`} style={{ height: `${h}%` }} title={`${Math.round(h / 3)}h avg`} />;
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>14d ago</span><span>Today</span>
            </div>
          </div>
        </div>
      ) : (
        /* Tickets Tab */
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground">
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground">
              <option value="All">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Critical alert */}
          {metrics.critical > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <Zap className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-foreground"><span className="font-bold text-destructive">{metrics.critical}</span> critical ticket{metrics.critical > 1 ? "s" : ""} need immediate attention</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No tickets found.</p></div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Ticket</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Customer</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Priority</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">SLA</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Agent</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(t => {
                      const StatusIcon = statusIcon[t.status] || AlertCircle;
                      const hoursSinceCreated = Math.round((Date.now() - new Date(t.created_at).getTime()) / 3600000);
                      const slaLimit = t.priority === "Critical" ? 4 : t.priority === "High" ? 12 : t.priority === "Medium" ? 24 : 48;
                      const slaBreached = t.status !== "Resolved" && hoursSinceCreated > slaLimit;
                      const slaRemaining = slaLimit - hoursSinceCreated;
                      return (
                        <tr key={t.id} className={`hover:bg-primary/5 transition-colors ${slaBreached ? "bg-destructive/5" : ""}`}>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-foreground">{t.ticket_number}</p>
                            <p className="text-xs text-muted-foreground">{t.subject}</p>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-foreground">{t.customer}</td>
                          <td className="px-5 py-3.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor[t.priority]}`}>{t.priority}</span></td>
                          <td className="px-5 py-3.5">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status]}`}>
                              <StatusIcon className="h-3 w-3" />{t.status}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {t.status === "Resolved" ? (
                              <span className="text-xs text-success font-medium">✓ Met</span>
                            ) : slaBreached ? (
                              <span className="text-xs text-destructive font-medium">⚠ Breached</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{slaRemaining}h left</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.assigned_to || "Unassigned"}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {t.status === "Open" && (
                                <button onClick={() => updateStatus(t.id, "In Progress")} className="px-2 py-1 rounded text-xs font-medium text-info hover:bg-info/10">Start</button>
                              )}
                              {t.status === "In Progress" && (
                                <button onClick={() => updateStatus(t.id, "Resolved")} className="px-2 py-1 rounded text-xs font-medium text-success hover:bg-success/10">Resolve</button>
                              )}
                              {t.status === "Resolved" && (
                                <button onClick={() => updateStatus(t.id, "Open")} className="px-2 py-1 rounded text-xs font-medium text-warning hover:bg-warning/10">Reopen</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {filtered.map(t => {
                  const StatusIcon = statusIcon[t.status] || AlertCircle;
                  const hoursSinceCreated = Math.round((Date.now() - new Date(t.created_at).getTime()) / 3600000);
                  const slaLimit = t.priority === "Critical" ? 4 : t.priority === "High" ? 12 : 24;
                  const slaBreached = t.status !== "Resolved" && hoursSinceCreated > slaLimit;
                  return (
                    <div key={t.id} className={`bg-card border rounded-xl p-4 ${slaBreached ? "border-destructive/30" : "border-border"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.ticket_number}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.subject}</p>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${priorityColor[t.priority]}`}>{t.priority}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                        <span>{t.customer}</span>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${statusColor[t.status]}`}><StatusIcon className="h-3 w-3" />{t.status}</div>
                        {slaBreached && <span className="text-destructive font-medium">⚠ SLA breached</span>}
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        {t.status === "Open" && <button onClick={() => updateStatus(t.id, "In Progress")} className="flex-1 py-1.5 rounded-md text-xs font-medium bg-info/10 text-info hover:bg-info/20">Start</button>}
                        {t.status === "In Progress" && <button onClick={() => updateStatus(t.id, "Resolved")} className="flex-1 py-1.5 rounded-md text-xs font-medium bg-success/10 text-success hover:bg-success/20">Resolve</button>}
                        {t.status === "Resolved" && <button onClick={() => updateStatus(t.id, "Open")} className="flex-1 py-1.5 rounded-md text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20">Reopen</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Ticket"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("tickets").insert(buildInsert({
            ticket_number: `TKT-${String(1000 + tickets.length + 1)}`,
            subject: data.subject,
            customer: data.customer,
            priority: data.priority,
            description: data.description || null,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Ticket created");
          setDialogOpen(false);
          fetchTickets();
        }}
      />
    </div>
  );
}
