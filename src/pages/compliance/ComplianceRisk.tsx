// @ts-nocheck
import { useState, useEffect } from "react";
import { Shield, Plus, AlertTriangle, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormDialog from "@/components/FormDialog";

const RISK_COLORS: Record<string, string> = { Low: "bg-success/10 text-success", Medium: "bg-warning/10 text-warning", High: "bg-destructive/10 text-destructive", Critical: "bg-destructive text-destructive-foreground" };

export default function ComplianceRisk() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState("risks");
  const [risks, setRisks] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskDialog, setRiskDialog] = useState(false);
  const [checklistDialog, setChecklistDialog] = useState(false);
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const tid = profile?.tenant_id;
  const uid = user?.id;

  const fetchData = async () => {
    if (!tid) return;
    const [{ data: r }, { data: c }, { data: i }] = await Promise.all([
      supabase.from("risk_register").select("*").eq("tenant_id", tid).order("risk_score", { ascending: false }),
      supabase.from("compliance_checklists").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }),
      supabase.from("incidents").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }),
    ]);
    if (r) setRisks(r);
    if (c) setChecklists(c);
    if (i) setIncidents(i);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tid]);

  const handleSaveRisk = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const likelihoodScore: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
    const impactScore: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
    const score = (likelihoodScore[v.likelihood] || 2) * (impactScore[v.impact] || 2);
    const payload = { tenant_id: tid, title: v.title, description: v.description || null, category: v.category || "Operational", likelihood: v.likelihood || "Medium", impact: v.impact || "Medium", risk_score: score, mitigation_plan: v.mitigation_plan || null, owner_name: v.owner_name || null, status: v.status || "Open", created_by: uid };
    if (editItem) {
      await supabase.from("risk_register").update(payload).eq("id", editItem.id);
      toast.success("Updated");
    } else {
      await supabase.from("risk_register").insert(payload);
      toast.success("Risk added");
    }
    setEditItem(null); setRiskDialog(false); fetchData();
  };

  const handleSaveChecklist = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, title: v.title, regulation: v.regulation || null, category: v.category || "General", status: v.status || "Pending", due_date: v.due_date || null, assigned_to: v.assigned_to || null, created_by: uid };
    await supabase.from("compliance_checklists").insert(payload);
    toast.success("Checklist created"); setChecklistDialog(false); fetchData();
  };

  const handleSaveIncident = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, title: v.title, description: v.description || null, incident_type: v.incident_type || "Safety", severity: v.severity || "Medium", reported_by: v.reported_by || null, assigned_to: v.assigned_to || null, created_by: uid };
    await supabase.from("incidents").insert(payload);
    toast.success("Incident reported"); setIncidentDialog(false); fetchData();
  };

  const handleDelete = async (table: string, id: string) => {
    await supabase.from(table as any).delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const openRisks = risks.filter(r => r.status === "Open");
  const criticalRisks = risks.filter(r => r.likelihood === "Critical" || r.impact === "Critical");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Compliance & Risk</h1>
          <p className="text-sm text-muted-foreground">{openRisks.length} open risks · {checklists.length} checklists · {incidents.length} incidents</p>
        </div>
      </div>

      {criticalRisks.length > 0 && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive font-medium">{criticalRisks.length} critical risk(s) require attention</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Risks", value: risks.length, color: "text-foreground" },
          { label: "High/Critical", value: risks.filter(r => ["High", "Critical"].includes(r.impact)).length, color: "text-destructive" },
          { label: "Open Incidents", value: incidents.filter(i => i.status === "Open").length, color: "text-warning" },
          { label: "Pending Checks", value: checklists.filter(c => c.status === "Pending").length, color: "text-primary" },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-xl border border-border bg-card text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="risks">Risk Register</TabsTrigger><TabsTrigger value="checklists">Compliance</TabsTrigger><TabsTrigger value="incidents">Incidents</TabsTrigger></TabsList>

        <TabsContent value="risks" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => { setEditItem(null); setRiskDialog(true); }}><Plus className="h-4 w-4 mr-2" /> Add Risk</Button></div>
          <div className="space-y-3">
            {risks.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{r.title}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{r.category}</Badge>
                    <Badge className={RISK_COLORS[r.likelihood] || ""}>L: {r.likelihood}</Badge>
                    <Badge className={RISK_COLORS[r.impact] || ""}>I: {r.impact}</Badge>
                    <span className="text-xs text-muted-foreground">Score: {r.risk_score}</span>
                  </div>
                  {r.owner_name && <p className="text-xs text-muted-foreground">Owner: {r.owner_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "Open" ? "destructive" : "secondary"}>{r.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(r); setRiskDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete("risk_register", r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {risks.length === 0 && <p className="text-center py-8 text-muted-foreground">No risks registered</p>}
          </div>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setChecklistDialog(true)}><ClipboardList className="h-4 w-4 mr-2" /> New Checklist</Button></div>
          <div className="space-y-3">
            {checklists.map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                  <p className="font-medium text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.regulation || "General"} · Due: {c.due_date || "N/A"}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={c.status === "Completed" ? "default" : c.status === "Overdue" ? "destructive" : "secondary"}>{c.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete("compliance_checklists", c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {checklists.length === 0 && <p className="text-center py-8 text-muted-foreground">No checklists yet</p>}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setIncidentDialog(true)}><AlertTriangle className="h-4 w-4 mr-2" /> Report Incident</Button></div>
          <div className="space-y-3">
            {incidents.map(i => (
              <div key={i.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                  <p className="font-medium text-foreground">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{i.incident_type} · Reported: {new Date(i.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={RISK_COLORS[i.severity] || ""}>{i.severity}</Badge>
                  <Badge variant={i.status === "Open" ? "destructive" : "secondary"}>{i.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete("incidents", i.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {incidents.length === 0 && <p className="text-center py-8 text-muted-foreground">No incidents reported</p>}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog open={riskDialog} onClose={() => { setRiskDialog(false); setEditItem(null); }} title={editItem ? "Edit Risk" : "Add Risk"}
        defaultValues={editItem ? { title: editItem.title, description: editItem.description || "", category: editItem.category, likelihood: editItem.likelihood, impact: editItem.impact, mitigation_plan: editItem.mitigation_plan || "", owner_name: editItem.owner_name || "", status: editItem.status } : undefined}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description" },
          { name: "category", label: "Category", type: "select", options: ["Operational", "Financial", "Legal", "Compliance", "Strategic", "Reputational", "Technology", "Environmental"] },
          { name: "likelihood", label: "Likelihood", type: "select", options: ["Low", "Medium", "High", "Critical"] },
          { name: "impact", label: "Impact", type: "select", options: ["Low", "Medium", "High", "Critical"] },
          { name: "mitigation_plan", label: "Mitigation Plan", type: "textarea" },
          { name: "owner_name", label: "Owner" },
          { name: "status", label: "Status", type: "select", options: ["Open", "Mitigated", "Accepted", "Closed"] },
        ]}
        onSubmit={handleSaveRisk}
      />
      <FormDialog open={checklistDialog} onClose={() => setChecklistDialog(false)} title="New Compliance Checklist"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "regulation", label: "Regulation/Standard" },
          { name: "category", label: "Category", type: "select", options: ["General", "Data Privacy", "Financial", "Health & Safety", "Environmental", "Industry-Specific"] },
          { name: "status", label: "Status", type: "select", options: ["Pending", "In Progress", "Completed", "Overdue"] },
          { name: "due_date", label: "Due Date", type: "date" },
          { name: "assigned_to", label: "Assigned To" },
        ]}
        onSubmit={handleSaveChecklist}
      />
      <FormDialog open={incidentDialog} onClose={() => setIncidentDialog(false)} title="Report Incident"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "incident_type", label: "Type", type: "select", options: ["Safety", "Security", "Data Breach", "Environmental", "HR", "Financial", "Operational"] },
          { name: "severity", label: "Severity", type: "select", options: ["Low", "Medium", "High", "Critical"] },
          { name: "reported_by", label: "Reported By" },
          { name: "assigned_to", label: "Assigned To" },
        ]}
        onSubmit={handleSaveIncident}
      />
    </div>
  );
}
