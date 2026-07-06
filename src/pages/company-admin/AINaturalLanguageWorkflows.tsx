import { useState } from "react";
import { GitBranch, Loader2, Sparkles, ArrowRight, Copy, Check, Zap, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const examples = [
  "When a deal closes over $10,000, send a Slack notification and create an invoice automatically",
  "Every Monday at 9am, send a summary email of all overdue invoices to the finance team",
  "When an employee submits a leave request, notify their manager and create an approval task",
  "If a support ticket is unresolved for 48 hours, escalate to manager and send a notification",
  "When a new employee is onboarded, create a welcome email, schedule orientation meeting, and assign training tasks",
];

interface WorkflowStep {
  order: number;
  name: string;
  type: string;
  config: Record<string, any>;
  condition?: { field: string; operator: string; value: string };
  on_failure?: string;
}

interface WorkflowResult {
  name: string;
  description: string;
  trigger: { type: string; module?: string; conditions?: { field: string; operator: string; value: string }[]; schedule?: string };
  steps: WorkflowStep[];
  estimated_complexity: "simple" | "moderate" | "complex";
  modules_involved: string[];
  notes?: string[];
}

const complexityColors: Record<string, string> = {
  simple: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  moderate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  complex: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

export default function AINaturalLanguageWorkflows() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!tenantId) { toast.error("No company selected"); return; }
    if (!description.trim()) { toast.error("Please describe your workflow"); return; }
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-workflow-nlp", { body: { tenant_id: tenantId, description: description.trim() } });
      if (error) throw error;
      if (data?.result) setResult(data.result);
      else throw new Error("No result returned");
      toast.success("Workflow generated");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      toast.success("Workflow JSON copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-primary" /> Natural Language Workflows
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Describe your business process in plain English — AI converts it to a structured automation</p>
      </div>

      {/* Input */}
      <Card>
        <CardHeader><CardTitle className="text-base">Describe Your Workflow</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., When a deal closes over $10,000, send a Slack notification and create an invoice automatically..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="text-base"
          />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-1.5">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setDescription(ex)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {ex.length > 60 ? ex.slice(0, 60) + "…" : ex}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={loading || !description.trim()} className="w-full" size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loading ? "Generating Workflow..." : "Generate Workflow"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <>
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" /> {result.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={complexityColors[result.estimated_complexity]}>{result.estimated_complexity}</Badge>
                  <Button variant="outline" size="sm" onClick={copyJson}>
                    {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? "Copied" : "Copy JSON"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {result.modules_involved.map((m, i) => <Badge key={i} variant="secondary" className="text-xs capitalize">{m.replace(/_/g, " ")}</Badge>)}
              </div>
            </CardContent>
          </Card>

          {/* Trigger */}
          <Card>
            <CardHeader><CardTitle className="text-base">Trigger</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{result.trigger.type.replace(/_/g, " ")}</p>
                  {result.trigger.module && <p className="text-xs text-muted-foreground">Module: {result.trigger.module}</p>}
                  {result.trigger.schedule && <p className="text-xs text-muted-foreground font-mono">Schedule: {result.trigger.schedule}</p>}
                </div>
              </div>
              {result.trigger.conditions?.length ? (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Conditions</p>
                  {result.trigger.conditions.map((c, i) => (
                    <p key={i} className="text-sm text-foreground">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{c.field}</span>{" "}
                      <span className="text-muted-foreground">{c.operator}</span>{" "}
                      <span className="font-semibold">{c.value}</span>
                    </p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader><CardTitle className="text-base">Workflow Steps</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {result.steps.sort((a, b) => a.order - b.order).map((step, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-border">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">{step.order}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{step.name}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">{step.type.replace(/_/g, " ")}</Badge>
                          {step.on_failure && <Badge variant="outline" className="text-[10px]">On fail: {step.on_failure}</Badge>}
                        </div>
                        {step.condition && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Condition: <span className="font-mono">{step.condition.field} {step.condition.operator} {step.condition.value}</span>
                          </p>
                        )}
                        {Object.keys(step.config).length > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/30 text-xs font-mono text-muted-foreground overflow-x-auto">
                            {JSON.stringify(step.config, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    {i < result.steps.length - 1 && (
                      <div className="flex justify-center py-1"><ArrowRight className="h-4 w-4 text-muted-foreground/40 rotate-90" /></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {result.notes?.length ? (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Implementation Notes</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
