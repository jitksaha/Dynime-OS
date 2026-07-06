import { useState, useEffect } from "react";
import { Target, Plus, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import FormDialog from "@/components/FormDialog";

const STATUS_COLORS: Record<string, string> = {
  "On Track": "bg-success/10 text-success",
  "At Risk": "bg-warning/10 text-warning",
  "Behind": "bg-destructive/10 text-destructive",
  "Completed": "bg-primary/10 text-primary",
};

export default function Objectives() {
  const { profile, user } = useAuth();
  const [objectives, setObjectives] = useState<any[]>([]);
  const [keyResults, setKeyResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [objDialog, setObjDialog] = useState(false);
  const [krDialog, setKrDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [activeObjId, setActiveObjId] = useState<string | null>(null);

  const tid = profile?.tenant_id;
  const uid = user?.id;

  const fetchData = async () => {
    if (!tid) return;
    const [{ data: o }, { data: kr }] = await Promise.all([
      supabase.from("objectives").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }),
      supabase.from("key_results").select("*").eq("tenant_id", tid).order("created_at"),
    ]);
    if (o) setObjectives(o);
    if (kr) setKeyResults(kr);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tid]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const handleSaveObj = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, title: v.title, description: v.description || null, level: v.level || "company", period: v.period || "Q1 2026", status: v.status || "On Track", owner_name: v.owner_name || null, created_by: uid };
    if (editItem) {
      await supabase.from("objectives").update(payload).eq("id", editItem.id);
      toast.success("Updated");
    } else {
      await supabase.from("objectives").insert(payload);
      toast.success("Objective created");
    }
    setEditItem(null); setObjDialog(false); fetchData();
  };

  const handleSaveKR = async (v: Record<string, string>) => {
    if (!tid || !uid || !activeObjId) return;
    const payload = { tenant_id: tid, objective_id: activeObjId, title: v.title, target_value: Number(v.target_value) || 100, current_value: Number(v.current_value) || 0, unit: v.unit || "%", created_by: uid };
    await supabase.from("key_results").insert(payload);
    toast.success("Key result added"); setKrDialog(false); fetchData();
  };

  const updateKRProgress = async (kr: any, newValue: number) => {
    await supabase.from("key_results").update({ current_value: newValue }).eq("id", kr.id);
    fetchData();
  };

  const deleteObj = async (id: string) => {
    await supabase.from("objectives").delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };

  const getObjProgress = (objId: string) => {
    const krs = keyResults.filter(kr => kr.objective_id === objId);
    if (krs.length === 0) return 0;
    const avg = krs.reduce((sum, kr) => sum + (kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0), 0) / krs.length;
    return Math.min(100, Math.round(avg));
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Target className="h-6 w-6 text-primary" /> OKR & Goals</h1>
          <p className="text-sm text-muted-foreground">{objectives.length} objectives · {keyResults.length} key results</p>
        </div>
        <Button onClick={() => { setEditItem(null); setObjDialog(true); }}><Plus className="h-4 w-4 mr-2" /> New Objective</Button>
      </div>

      <div className="space-y-3">
        {objectives.map(obj => {
          const krs = keyResults.filter(kr => kr.objective_id === obj.id);
          const progress = getObjProgress(obj.id);
          const isOpen = expanded.has(obj.id);
          return (
            <div key={obj.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30" onClick={() => toggle(obj.id)}>
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{obj.title}</span>
                    <Badge className={STATUS_COLORS[obj.status] || ""}>{obj.status}</Badge>
                    <Badge variant="outline" className="text-xs">{obj.level}</Badge>
                    <Badge variant="secondary" className="text-xs">{obj.period}</Badge>
                  </div>
                  {obj.owner_name && <p className="text-xs text-muted-foreground mt-0.5">Owner: {obj.owner_name}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-foreground">{progress}%</span>
                  <Progress value={progress} className="w-24 h-2" />
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setEditItem(obj); setObjDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteObj(obj.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-border bg-muted/20 p-4 space-y-3">
                  {krs.map(kr => {
                    const pct = kr.target_value > 0 ? Math.round((kr.current_value / kr.target_value) * 100) : 0;
                    return (
                      <div key={kr.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{kr.title}</p>
                          <p className="text-xs text-muted-foreground">{kr.current_value} / {kr.target_value} {kr.unit}</p>
                        </div>
                        <Progress value={pct} className="w-32 h-2" />
                        <span className="text-xs font-semibold text-foreground w-10 text-right">{pct}%</span>
                        <Input
                          type="number"
                          className="w-20 h-8 text-xs"
                          defaultValue={kr.current_value}
                          onBlur={e => {
                            const val = Number(e.target.value);
                            if (val !== kr.current_value) updateKRProgress(kr, val);
                          }}
                        />
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => { setActiveObjId(obj.id); setKrDialog(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Key Result</Button>
                </div>
              )}
            </div>
          );
        })}
        {objectives.length === 0 && <p className="text-center py-12 text-muted-foreground">No objectives yet. Start by creating your first OKR.</p>}
      </div>

      <FormDialog open={objDialog} onClose={() => { setObjDialog(false); setEditItem(null); }} title={editItem ? "Edit Objective" : "New Objective"}
        defaultValues={editItem ? { title: editItem.title, description: editItem.description || "", level: editItem.level, period: editItem.period, status: editItem.status, owner_name: editItem.owner_name || "" } : undefined}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description" },
          { name: "level", label: "Level", type: "select", options: ["company", "team", "individual"] },
          { name: "period", label: "Period", type: "select", options: ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "H1 2026", "H2 2026", "2026"] },
          { name: "status", label: "Status", type: "select", options: ["On Track", "At Risk", "Behind", "Completed"] },
          { name: "owner_name", label: "Owner" },
        ]}
        onSubmit={handleSaveObj}
      />
      <FormDialog open={krDialog} onClose={() => setKrDialog(false)} title="Add Key Result"
        defaultValues={{ target_value: "100", current_value: "0", unit: "%" }}
        fields={[
          { name: "title", label: "Key Result", required: true },
          { name: "target_value", label: "Target Value", type: "number" },
          { name: "current_value", label: "Current Value", type: "number" },
          { name: "unit", label: "Unit" },
        ]}
        onSubmit={handleSaveKR}
      />
    </div>
  );
}
