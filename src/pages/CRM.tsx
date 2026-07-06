// @ts-nocheck
import { useState, useEffect } from "react";
import { Plus, Phone, Mail, Calendar, MessageSquare, Star, Filter, ArrowUpDown, UserPlus, TrendingUp, Users, DollarSign, Target, Trash2, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import KanbanBoard, { KanbanColumn } from "@/components/KanbanBoard";
import { toast } from "sonner";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useTenant } from "@/hooks/useTenant";
import { DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCalendarSync } from "@/hooks/useCalendarSync";

interface Deal {
  id: string;
  name: string;
  value: number;
  contact_name: string;
  stage: string;
  days_in_stage: number;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  priority?: string | null;
  loss_reason?: string | null;
  next_follow_up?: string | null;
}

interface FollowUp {
  id: string;
  deal_id: string;
  type: string;
  notes: string | null;
  follow_up_date: string | null;
  status: string;
  created_at: string;
}

const stageConfig = [
  { name: "Leads", color: "border-t-info" },
  { name: "Qualified", color: "border-t-primary" },
  { name: "Proposal", color: "border-t-warning" },
  { name: "Negotiation", color: "border-t-accent" },
  { name: "Won", color: "border-t-success" },
  { name: "Lost", color: "border-t-destructive" },
];

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

const sourceOptions = ["Direct", "Referral", "Website", "Social Media", "Cold Call", "Event", "Email Campaign", "Partner"];
const priorityOptions = ["high", "medium", "low"];
const followUpTypes = ["call", "email", "meeting", "demo", "follow-up", "other"];

export default function CRM() {
  const { tenantId, buildInsert, applyBranchFilter, activeBranchId, supabase } = useTenant();
  const { createDealFollowup } = useCalendarSync();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");

  // Follow-up state
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ type: "call", notes: "", follow_up_date: "" });
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  const fetchDeals = async () => {
    if (!tenantId) return;
    const base = supabase.from("deals").select("*").eq("tenant_id", tenantId);
    const { data, error } = await applyBranchFilter(base).order("created_at", { ascending: false });
    if (!error && data) setDeals(data as Deal[]);
    setLoading(false);
  };

  const fetchFollowUps = async (dealId: string) => {
    const { data } = await supabase.from("lead_follow_ups").select("*").eq("deal_id", dealId).order("created_at", { ascending: false });
    setFollowUps((data as FollowUp[]) || []);
  };

  useEffect(() => { fetchDeals(); }, [tenantId, activeBranchId]);

  const fields = [
    { name: "name", label: "Company Name", placeholder: "e.g. Acme Corp", required: true },
    { name: "contact_name", label: "Contact Person", placeholder: "e.g. John Doe", required: true },
    { name: "email", label: "Email", placeholder: "john@acme.com" },
    { name: "phone", label: "Phone", placeholder: "+880 1XXX" },
    { name: "value", label: "Deal Value ($)", type: "number" as const, placeholder: "e.g. 50000", required: true },
    { name: "source", label: "Lead Source", type: "select" as const, options: sourceOptions, required: true },
    { name: "priority", label: "Priority", type: "select" as const, options: ["high", "medium", "low"], required: true },
    { name: "stage", label: "Stage", type: "select" as const, options: stageConfig.map(s => s.name), required: true },
  ];

  const columns: KanbanColumn<Deal>[] = stageConfig.map((sc) => ({
    id: sc.name,
    title: sc.name,
    color: sc.color,
    items: deals.filter((d) => d.stage === sc.name),
  }));

  const { formatPrice: fmt } = useTenantCurrency();

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStage = destination.droppableId;
    const deal = deals.find((d) => d.id === draggableId);
    if (!deal || deal.stage === newStage) return;
    setDeals((prev) => prev.map((d) => d.id === draggableId ? { ...d, stage: newStage, days_in_stage: 0 } : d));
    const { error } = await supabase.from("deals").update({ stage: newStage, days_in_stage: 0 }).eq("id", draggableId);
    if (error) {
      toast.error("Failed to update deal stage");
      setDeals((prev) => prev.map((d) => d.id === draggableId ? { ...d, stage: deal.stage, days_in_stage: deal.days_in_stage } : d));
    }
  };

  const openDealDetail = (deal: Deal) => {
    setSelectedDeal(deal);
    fetchFollowUps(deal.id);
    setFollowUpDialogOpen(true);
  };

  const addFollowUp = async () => {
    if (!selectedDeal || !tenantId) return;
    const { error } = await supabase.from("lead_follow_ups").insert({
      deal_id: selectedDeal.id,
      tenant_id: tenantId,
      created_by: (await supabase.auth.getUser()).data.user?.id || "",
      type: newFollowUp.type,
      notes: newFollowUp.notes || null,
      follow_up_date: newFollowUp.follow_up_date || null,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Follow-up added");
    setNewFollowUp({ type: "call", notes: "", follow_up_date: "" });
    fetchFollowUps(selectedDeal.id);
    // Update next_follow_up on deal + create calendar event
    if (newFollowUp.follow_up_date) {
      await supabase.from("deals").update({ next_follow_up: newFollowUp.follow_up_date }).eq("id", selectedDeal.id);
      await createDealFollowup(selectedDeal.name, new Date(newFollowUp.follow_up_date).toISOString(), selectedDeal.id, selectedDeal.email || undefined);
      fetchDeals();
    }
  };

  const completeFollowUp = async (id: string) => {
    await supabase.from("lead_follow_ups").update({ status: "completed" }).eq("id", id);
    if (selectedDeal) fetchFollowUps(selectedDeal.id);
    toast.success("Marked as completed");
  };

  const deleteDeal = async (id: string) => {
    await supabase.from("deals").delete().eq("id", id);
    toast.success("Deal deleted");
    fetchDeals();
  };

  // Stats
  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const wonValue = deals.filter(d => d.stage === "Won").reduce((s, d) => s + d.value, 0);
  const lostCount = deals.filter(d => d.stage === "Lost").length;
  const leadCount = deals.filter(d => d.stage === "Leads").length;

  // Non-converted leads (Leads + Lost)
  const nonConverted = deals.filter(d => d.stage === "Leads" || d.stage === "Lost");

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">CRM & Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage deals, track leads, and follow up with prospects</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Deal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">Pipeline Value</span>
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(totalValue)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Won Value</span>
          </div>
          <p className="text-lg font-bold text-success">{fmt(wonValue)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs">Active Leads</span>
          </div>
          <p className="text-lg font-bold text-foreground">{leadCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Target className="h-4 w-4" />
            <span className="text-xs">Lost / Unconverted</span>
          </div>
          <p className="text-lg font-bold text-destructive">{lostCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="follow-ups">Lead Follow-ups</TabsTrigger>
          <TabsTrigger value="all">All Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : deals.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No deals yet. Create your first deal to get started.</p></div>
          ) : (
            <KanbanBoard
              columns={columns}
              onDragEnd={handleDragEnd}
              getItemId={(deal) => deal.id}
              renderCard={(deal) => (
                <div
                  className="p-3 rounded-lg border border-border bg-background hover:border-primary/20 transition-colors cursor-grab active:cursor-grabbing"
                  onClick={() => openDealDetail(deal)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{deal.name}</p>
                    {deal.priority && (
                      <Badge variant="secondary" className={`text-[10px] px-1.5 ${priorityColors[deal.priority] || ""}`}>
                        {deal.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{deal.contact_name}</p>
                  {deal.source && <p className="text-[10px] text-muted-foreground mt-0.5">via {deal.source}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-foreground">{fmt(deal.value)}</span>
                    <span className="text-xs text-muted-foreground">{deal.days_in_stage}d</span>
                  </div>
                  {deal.next_follow_up && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-primary">
                      <Clock className="h-3 w-3" />
                      Follow-up: {new Date(deal.next_follow_up).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="follow-ups" className="mt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Non-Converted Leads & Lost Deals — Follow-up Opportunities</h3>
            {nonConverted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No unconverted leads right now. Great job!</p>
            ) : (
              nonConverted.map(deal => (
                <div key={deal.id} className="border border-border rounded-xl bg-card">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${deal.stage === "Lost" ? "bg-destructive" : "bg-info"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{deal.name} — {deal.contact_name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(deal.value)} • {deal.source || "Direct"} • {deal.stage}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deal.priority && (
                        <Badge variant="secondary" className={`text-[10px] ${priorityColors[deal.priority] || ""}`}>{deal.priority}</Badge>
                      )}
                      {expandedDeal === deal.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  {expandedDeal === deal.id && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {deal.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {deal.email}</span>}
                        {deal.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {deal.phone}</span>}
                        {deal.loss_reason && <span>Loss reason: {deal.loss_reason}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDealDetail(deal)}>
                          <MessageSquare className="h-3.5 w-3.5 mr-1" /> Add Follow-up
                        </Button>
                        <Button size="sm" variant="outline" onClick={async () => {
                          await supabase.from("deals").update({ stage: "Qualified" }).eq("id", deal.id);
                          toast.success("Moved to Qualified");
                          fetchDeals();
                        }}>
                          <TrendingUp className="h-3.5 w-3.5 mr-1" /> Re-qualify
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteDeal(deal.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Company</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Source</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Stage</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Value</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Priority</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map(deal => (
                  <tr key={deal.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{deal.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{deal.contact_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{deal.source || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={deal.stage === "Won" ? "default" : deal.stage === "Lost" ? "destructive" : "secondary"} className="text-xs">
                        {deal.stage}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{fmt(deal.value)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {deal.priority && <Badge variant="secondary" className={`text-xs ${priorityColors[deal.priority] || ""}`}>{deal.priority}</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDealDetail(deal)} title="Follow-ups">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDeal(deal.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Deal Dialog */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create New Deal"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("deals").insert(buildInsert({
            name: data.name,
            contact_name: data.contact_name,
            email: data.email || null,
            phone: data.phone || null,
            value: parseInt(data.value) || 0,
            source: data.source || "Direct",
            priority: data.priority || "medium",
            stage: data.stage,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Deal created");
          setDialogOpen(false);
          fetchDeals();
        }}
      />

      {/* Deal Detail / Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDeal?.name} — Follow-ups</DialogTitle>
          </DialogHeader>
          {selectedDeal && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{selectedDeal.contact_name}</span>
                {selectedDeal.email && <span>• {selectedDeal.email}</span>}
                {selectedDeal.phone && <span>• {selectedDeal.phone}</span>}
                <span>• {fmt(selectedDeal.value)}</span>
                <span>• {selectedDeal.stage}</span>
              </div>

              {/* Add follow-up */}
              <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-sm font-medium text-foreground">Add Follow-up Activity</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={newFollowUp.type} onValueChange={v => setNewFollowUp(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {followUpTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" className="h-9" value={newFollowUp.follow_up_date} onChange={e => setNewFollowUp(f => ({ ...f, follow_up_date: e.target.value }))} />
                  </div>
                </div>
                <Textarea placeholder="Notes about this follow-up..." rows={2} value={newFollowUp.notes} onChange={e => setNewFollowUp(f => ({ ...f, notes: e.target.value }))} />
                <Button size="sm" onClick={addFollowUp}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>

              {/* Follow-up history */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Activity History</p>
                {followUps.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No follow-ups yet.</p>
                ) : (
                  followUps.map(fu => (
                    <div key={fu.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                      <div className={`mt-0.5 p-1.5 rounded-md ${fu.status === "completed" ? "bg-success/10" : "bg-primary/10"}`}>
                        {fu.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Clock className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{fu.type}</Badge>
                          {fu.follow_up_date && <span className="text-[10px] text-muted-foreground">{new Date(fu.follow_up_date).toLocaleDateString()}</span>}
                        </div>
                        {fu.notes && <p className="text-xs text-muted-foreground mt-1">{fu.notes}</p>}
                      </div>
                      {fu.status !== "completed" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => completeFollowUp(fu.id)} title="Mark complete">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
