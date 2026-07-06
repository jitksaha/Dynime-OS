import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Switch } from "@/components/ui/switch";

interface EscalationItem {
  id: string;
  conversation_id: string;
  reason: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

interface EscalationRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  is_active: boolean;
}

export default function EscalationManager() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const [queue, setQueue] = useState<EscalationItem[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    const [qRes, rRes] = await Promise.all([
      supabase.from("escalation_queue").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("escalation_rules").select("*").eq("tenant_id", tenantId).order("priority", { ascending: false }),
    ]);
    if (qRes.data) setQueue(qRes.data);
    if (rRes.data) setRules(rRes.data);
    setLoading(false);
  };

  const resolveEscalation = async (id: string) => {
    await supabase.from("escalation_queue").update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id,
    }).eq("id", id);
    toast.success("Escalation resolved");
    loadData();
  };

  const dismissEscalation = async (id: string) => {
    await supabase.from("escalation_queue").update({ status: "dismissed" }).eq("id", id);
    toast.success("Escalation dismissed");
    loadData();
  };

  const addRule = async () => {
    if (!tenantId) return;
    await supabase.from("escalation_rules").insert({
      tenant_id: tenantId,
      name: "New Rule",
      trigger_type: "low_confidence",
      trigger_config: { threshold: 0.5 },
      is_active: true,
    });
    toast.success("Rule added");
    loadData();
  };

  const updateRule = async (id: string, updates: Partial<EscalationRule>) => {
    await supabase.from("escalation_rules").update(updates).eq("id", id);
    loadData();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await supabase.from("escalation_rules").delete().eq("id", id);
    toast.success("Rule deleted");
    loadData();
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-500/10 text-red-600";
      case "high": return "bg-orange-500/10 text-orange-600";
      case "medium": return "bg-amber-500/10 text-amber-600";
      default: return "bg-blue-500/10 text-blue-600";
    }
  };

  const filteredQueue = queue.filter((e) => statusFilter === "all" || e.status === statusFilter);

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Escalation Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage human handoffs and escalation rules</p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Queue ({queue.filter((e) => e.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {filteredQueue.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500/40" />
              <p className="text-sm text-muted-foreground">No escalations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQueue.map((item) => (
                <div key={item.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.reason}</p>
                    </div>
                    {item.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => resolveEscalation(item.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => dismissEscalation(item.id)}>
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4 mt-4">
          <Button onClick={addRule}>
            <Plus className="h-4 w-4 mr-2" /> Add Rule
          </Button>

          {rules.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">No escalation rules configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className={`border rounded-xl p-4 ${rule.is_active ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={rule.name}
                        onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                        className="h-8 font-medium max-w-sm"
                      />
                      <Select value={rule.trigger_type} onValueChange={(v) => updateRule(rule.id, { trigger_type: v })}>
                        <SelectTrigger className="w-60 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low_confidence">Low Confidence</SelectItem>
                          <SelectItem value="negative_sentiment">Negative Sentiment</SelectItem>
                          <SelectItem value="keyword">Keyword Match</SelectItem>
                          <SelectItem value="repeated_unknown">Repeated Unknown</SelectItem>
                          <SelectItem value="high_risk_topic">High Risk Topic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.is_active} onCheckedChange={(v) => updateRule(rule.id, { is_active: v })} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
