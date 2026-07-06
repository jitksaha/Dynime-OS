import { useState } from "react";
import { Shield, Loader2, RefreshCw, AlertTriangle, Eye, Globe, Server, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Threat {
  id: string;
  title: string;
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string[];
  affected_users?: string[];
  affected_ips?: string[];
  remediation: string[];
  timestamp?: string;
}

interface ThreatResult {
  threat_level: string;
  security_score: number;
  summary: string;
  threats: Threat[];
  stats: { total_login_attempts?: number; failed_logins?: number; unique_ips?: number; active_sessions?: number; api_requests_analyzed?: number; suspicious_ips?: string[] };
  recommendations: string[];
}

const severityColors: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

const categoryIcons: Record<string, typeof Shield> = {
  brute_force: AlertTriangle,
  impossible_travel: Globe,
  api_abuse: Server,
  privilege_escalation: Shield,
  session_anomaly: Activity,
  data_exfiltration: Eye,
};

const threatLevelColors: Record<string, string> = {
  low: "text-emerald-500",
  moderate: "text-amber-500",
  elevated: "text-orange-500",
  high: "text-destructive",
  critical: "text-destructive",
};

export default function AIThreatDetection() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatResult | null>(null);
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null);

  const runScan = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-threat-detection", { body: { tenant_id: tenantId } });
      if (error) throw error;
      if (data?.result) setResult(data.result);
      else throw new Error("No result returned");
      toast.success("Security scan complete");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> AI Threat Detection
          </h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered security analysis of logins, sessions, API usage & audit trails</p>
        </div>
        <Button onClick={runScan} disabled={loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {loading ? "Scanning..." : "Run Security Scan"}
        </Button>
      </div>

      {!result && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Scan Run Yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">Click "Run Security Scan" to analyze login attempts, active sessions, API requests, and audit logs for potential threats.</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing security data across all vectors...</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Security Score</p>
                <p className={`text-4xl font-bold ${result.security_score >= 70 ? "text-emerald-500" : result.security_score >= 40 ? "text-amber-500" : "text-destructive"}`}>{result.security_score}</p>
                <Progress value={result.security_score} className="mt-3 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Threat Level</p>
                <p className={`text-2xl font-bold capitalize ${threatLevelColors[result.threat_level] || "text-foreground"}`}>{result.threat_level}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Threats Found</p>
                <p className="text-4xl font-bold text-foreground">{result.threats.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Failed Logins</p>
                <p className="text-4xl font-bold text-amber-500">{result.stats.failed_logins || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">of {result.stats.total_login_attempts || 0} attempts</p>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Analysis Summary</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p></CardContent>
          </Card>

          {/* Threats List */}
          {result.threats.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Detected Threats</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.threats.sort((a, b) => {
                  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                  return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
                }).map(threat => {
                  const Icon = categoryIcons[threat.category] || AlertTriangle;
                  const isExpanded = expandedThreat === threat.id;
                  return (
                    <div key={threat.id} className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedThreat(isExpanded ? null : threat.id)}>
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-sm text-foreground">{threat.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{threat.category.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={severityColors[threat.severity]}>{threat.severity}</Badge>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 pl-8">
                          <p className="text-sm text-foreground">{threat.description}</p>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Evidence</p>
                            <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">{threat.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
                          </div>
                          {threat.affected_ips?.length ? (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Affected IPs</p>
                              <div className="flex flex-wrap gap-1">{threat.affected_ips.map((ip, i) => <Badge key={i} variant="secondary" className="text-xs font-mono">{ip}</Badge>)}</div>
                            </div>
                          ) : null}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Remediation</p>
                            <ul className="list-disc list-inside text-sm text-emerald-600 space-y-0.5">{threat.remediation.map((r, i) => <li key={i}>{r}</li>)}</ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Security Recommendations</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
