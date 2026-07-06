import { useState } from "react";
import { Brain, AlertTriangle, TrendingDown, Users, Shield, Loader2, RefreshCw, ChevronDown, ChevronUp, DollarSign, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AtRiskCustomer {
  customer_name: string;
  email?: string;
  churn_probability: number;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_signals: string[];
  last_interaction?: string;
  revenue_at_risk?: number;
  recommended_actions: string[];
}

interface ChurnResult {
  overall_health_score: number;
  summary: string;
  at_risk_customers: AtRiskCustomer[];
  trends: { payment_health?: string; engagement_trend?: string; support_sentiment?: string; pipeline_velocity?: string };
  retention_priorities: string[];
}

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AIChurnDetection() {
  const { tenantId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChurnResult | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  const runAnalysis = async () => {
    if (!tenantId) { toast.error("No company selected"); return; }
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-churn-detection", { body: { tenant_id: tenantId } });
      if (error) throw error;
      if (data?.result) setResult(data.result);
      else throw new Error("No result returned");
      toast.success("Churn analysis complete");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const healthColor = (score: number) => score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Predictive Churn Detection
          </h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered analysis of customer churn risk using CRM, invoice, and support data</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {loading ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {!result && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingDown className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Run Yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">Click "Run Analysis" to scan your CRM deals, invoices, payments, and support tickets for churn risk signals.</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing customer data across multiple signals...</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Health Score + Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Health Score</p>
                <p className={`text-4xl font-bold ${healthColor(result.overall_health_score)}`}>{result.overall_health_score}</p>
                <Progress value={result.overall_health_score} className="mt-3 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">At-Risk Customers</p>
                <p className="text-4xl font-bold text-foreground">{result.at_risk_customers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">identified</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Critical Risks</p>
                <p className="text-4xl font-bold text-destructive">{result.at_risk_customers.filter(c => c.risk_level === "critical").length}</p>
                <p className="text-xs text-muted-foreground mt-1">need immediate action</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Revenue at Risk</p>
                <p className="text-4xl font-bold text-amber-500">
                  {formatPrice(result.at_risk_customers.reduce((s, c) => s + (c.revenue_at_risk || 0), 0))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">total exposure</p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p></CardContent>
          </Card>

          {/* Trends */}
          {result.trends && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.trends.payment_health && (
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-emerald-500" /><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Health</p></div><p className="text-sm text-foreground">{result.trends.payment_health}</p></CardContent></Card>
              )}
              {result.trends.engagement_trend && (
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-blue-500" /><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engagement</p></div><p className="text-sm text-foreground">{result.trends.engagement_trend}</p></CardContent></Card>
              )}
              {result.trends.support_sentiment && (
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-amber-500" /><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Support Sentiment</p></div><p className="text-sm text-foreground">{result.trends.support_sentiment}</p></CardContent></Card>
              )}
              {result.trends.pipeline_velocity && (
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><TrendingDown className="h-4 w-4 text-violet-500" /><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline Velocity</p></div><p className="text-sm text-foreground">{result.trends.pipeline_velocity}</p></CardContent></Card>
              )}
            </div>
          )}

          {/* At-Risk Customers */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> At-Risk Customers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.at_risk_customers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No at-risk customers detected — your customer health looks great!</p>
              ) : (
                result.at_risk_customers.sort((a, b) => b.churn_probability - a.churn_probability).map((customer, i) => (
                  <div key={i} className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCustomer(expandedCustomer === i ? null : i)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{customer.churn_probability}%</div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{customer.customer_name}</p>
                          {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={riskColors[customer.risk_level]}>{customer.risk_level}</Badge>
                        {customer.revenue_at_risk != null && <span className="text-xs text-muted-foreground">{formatPrice(customer.revenue_at_risk)}</span>}
                        {expandedCustomer === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedCustomer === i && (
                      <div className="mt-4 space-y-3 pl-13">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Risk Signals</p>
                          <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">{customer.risk_signals.map((s, j) => <li key={j}>{s}</li>)}</ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recommended Actions</p>
                          <ul className="list-disc list-inside text-sm text-emerald-600 space-y-0.5">{customer.recommended_actions.map((a, j) => <li key={j}>{a}</li>)}</ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Retention Priorities */}
          {result.retention_priorities?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Retention Priorities</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                  {result.retention_priorities.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
