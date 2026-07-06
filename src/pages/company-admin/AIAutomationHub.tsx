import { useState } from "react";
import { Brain, Zap, Receipt, TrendingUp, Loader2, CheckCircle2, AlertTriangle, Sparkles, Mail, Users, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";

type TabId = "email_draft" | "hr_assist" | "sales_intelligence" | "expense_analysis";

export default function AIAutomationHub() {
  const { tenantId } = useTenant();
  const { formatPrice: fp } = useTenantCurrency();
  const [activeTab, setActiveTab] = useState<TabId>("email_draft");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [emailContext, setEmailContext] = useState("");

  const tabs = [
    { id: "email_draft" as TabId, label: "Smart Email", icon: Mail, desc: "AI-drafted professional emails & follow-ups", color: "text-blue-500" },
    { id: "hr_assist" as TabId, label: "HR Smart Assist", icon: Users, desc: "Workforce analytics, risk detection & recommendations", color: "text-emerald-500" },
    { id: "sales_intelligence" as TabId, label: "Sales Intelligence", icon: BarChart3, desc: "Deal scoring, pipeline analysis & next-best-action", color: "text-amber-500" },
    { id: "expense_analysis" as TabId, label: "Finance Analysis", icon: Receipt, desc: "Expense anomalies, cash flow predictions & insights", color: "text-violet-500" },
  ];

  const runOperation = async () => {
    if (!tenantId) { toast.error("No company selected"); return; }
    setLoading(true);
    setResults(null);

    try {
      let context: any = {};

      if (activeTab === "email_draft") {
        if (!emailContext.trim()) { toast.error("Please describe what email you need"); setLoading(false); return; }
        // Fetch recent context data for better emails
        const [dealsRes, invoicesRes] = await Promise.all([
          supabase.from("deals").select("name, contact_name, stage, value").eq("tenant_id", tenantId).limit(5),
          supabase.from("invoices").select("client_name, status, due_date, total_amount").eq("tenant_id", tenantId).eq("status", "Pending").limit(5),
        ]);
        context = {
          request: emailContext,
          recent_deals: dealsRes.data || [],
          pending_invoices: invoicesRes.data || [],
          instruction: `Generate 2-3 professional email drafts based on this request: "${emailContext}". Use the provided business context to personalize.`,
        };
      } else if (activeTab === "hr_assist") {
        const [empRes, attRes, leaveRes, perfRes] = await Promise.all([
          supabase.from("employees").select("name, department, designation, status, joining_date, employment_type").eq("tenant_id", tenantId).limit(50),
          supabase.from("attendance_records").select("employee_name, status, attendance_date").eq("tenant_id", tenantId).gte("attendance_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]).limit(200),
          supabase.from("leave_requests").select("employee_name, leave_type, status, start_date, end_date").eq("tenant_id", tenantId).limit(30),
          supabase.from("performance_reviews").select("employee_name, rating, review_period, status").eq("tenant_id", tenantId).limit(30),
        ]);
        if (!empRes.data?.length) { toast.error("No employee data found"); setLoading(false); return; }
        context = {
          employees: empRes.data,
          attendance: attRes.data || [],
          leave_requests: leaveRes.data || [],
          performance: perfRes.data || [],
          instruction: "Analyze workforce data. Identify headcount trends, attendance risks, leave patterns, and performance gaps. Provide actionable HR recommendations.",
        };
      } else if (activeTab === "sales_intelligence") {
        const [dealsRes, ticketsRes] = await Promise.all([
          supabase.from("deals").select("id, name, value, stage, priority, source, contact_name, days_in_stage, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(30),
          supabase.from("tickets").select("status, priority, created_at").eq("tenant_id", tenantId).limit(50),
        ]);
        if (!dealsRes.data?.length) { toast.error("No deals found"); setLoading(false); return; }
        context = {
          deals: dealsRes.data,
          support_tickets: ticketsRes.data || [],
          instruction: "Analyze the sales pipeline. Score top deals, estimate win rates, identify risks, and recommend next-best-actions for each high-value opportunity.",
        };
      } else {
        const [expRes, invRes] = await Promise.all([
          supabase.from("expenses").select("id, description, amount, category, status, expense_date").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50),
          supabase.from("invoices").select("id, client_name, total_amount, status, due_date, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50),
        ]);
        if (!expRes.data?.length && !invRes.data?.length) { toast.error("No financial data found"); setLoading(false); return; }
        context = {
          expenses: expRes.data || [],
          invoices: invRes.data || [],
          instruction: "Analyze expenses and invoices. Detect anomalies, categorize spending patterns, predict cash flow, and recommend cost optimizations.",
        };
      }

      const { data, error } = await supabase.functions.invoke("ai-business-ops", {
        body: { operation: activeTab, context },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults({ type: activeTab, data: data.result });
      toast.success("AI analysis complete");
    } catch (e: any) {
      toast.error(e.message || "AI analysis failed");
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const trendIcon = (t: string) => t === "up" ? <ArrowUpRight className="h-3.5 w-3.5 text-destructive" /> : t === "down" ? <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const riskColor = (s: string) => s === "high" ? "text-destructive bg-destructive/10" : s === "medium" ? "text-amber-600 bg-amber-500/10" : "text-emerald-600 bg-emerald-500/10";

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Operations Hub</h1>
          <p className="text-xs text-muted-foreground">AI-powered tools for email, HR, sales & finance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResults(null); }}
            className={`flex flex-col items-start gap-1.5 p-3 rounded-xl text-left transition-all ${
              activeTab === tab.id
                ? "bg-primary/10 border-2 border-primary/30 shadow-sm"
                : "bg-card border border-border hover:border-primary/20 hover:bg-primary/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-primary" : tab.color}`} />
              <span className={`text-sm font-semibold ${activeTab === tab.id ? "text-primary" : "text-foreground"}`}>{tab.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground leading-tight">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Active Panel */}
      <div className="bg-card border border-border rounded-2xl p-6">
        {/* Email context input */}
        {activeTab === "email_draft" && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">What email do you need?</label>
            <textarea
              value={emailContext}
              onChange={e => setEmailContext(e.target.value)}
              placeholder="E.g. Follow up with client about overdue invoice, onboarding welcome email for new hire, sales pitch for enterprise deal..."
              className="w-full h-20 px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{tabs.find(t => t.id === activeTab)?.desc}</p>
          </div>
          <button
            onClick={runOperation}
            disabled={loading || !tenantId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? "Analyzing..." : "Run AI"}
          </button>
        </div>

        {/* ── Email Results ── */}
        {results?.type === "email_draft" && results.data?.drafts && (
          <div className="space-y-3 mt-4">
            {results.data.drafts.map((d: any, i: number) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-background group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase">{d.tone}</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{d.category}</span>
                  </div>
                  <button onClick={() => copyToClipboard(`Subject: ${d.subject}\n\n${d.body}`)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Subject: {d.subject}</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{d.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── HR Results ── */}
        {results?.type === "hr_assist" && (
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Workforce Summary</h4>
              <p className="text-sm text-foreground">{results.data.summary}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Headcount Analysis</h4>
              <p className="text-sm text-foreground">{results.data.headcount_analysis}</p>
            </div>
            {results.data.risk_areas?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk Areas</h4>
                <div className="grid gap-2">
                  {results.data.risk_areas.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${riskColor(r.severity)}`}>{r.severity}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{r.area}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                        <p className="text-xs text-primary mt-1 flex items-center gap-1"><Zap className="h-3 w-3" /> {r.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.data.recommendations?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommendations</h4>
                <ul className="space-y-1.5">
                  {results.data.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Sales Intelligence Results ── */}
        {results?.type === "sales_intelligence" && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-primary/5 text-center">
                <div className="text-xs text-muted-foreground">Pipeline Value</div>
                <div className="text-lg font-bold text-foreground mt-1">{fp(results.data.total_pipeline_value || 0)}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/5 text-center">
                <div className="text-xs text-muted-foreground">Est. Win Rate</div>
                <div className="text-lg font-bold text-emerald-600 mt-1">{results.data.win_rate_estimate}</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center col-span-2 sm:col-span-1">
                <div className="text-xs text-muted-foreground">Top Deals</div>
                <div className="text-lg font-bold text-foreground mt-1">{results.data.top_deals?.length || 0}</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm text-foreground">{results.data.pipeline_summary}</div>
            {results.data.top_deals?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deal Intelligence</h4>
                <div className="grid gap-2">
                  {results.data.top_deals.map((d: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-background">
                      <div className="text-center min-w-[48px]">
                        <div className="text-lg font-bold text-foreground">{d.score}</div>
                        <div className="text-[10px] text-muted-foreground">Score</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{d.name}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${riskColor(d.risk)}`}>{d.risk}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> {d.next_action}</p>
                      </div>
                      <div className="text-sm font-semibold text-foreground">{fp(d.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.data.recommendations?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Strategy Recommendations</h4>
                <ul className="space-y-1.5">
                  {results.data.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground"><TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Expense Analysis Results ── */}
        {results?.type === "expense_analysis" && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-destructive/5 text-center">
                <div className="text-xs text-muted-foreground">Total Expenses</div>
                <div className="text-lg font-bold text-foreground mt-1">{fp(results.data.total_expenses || 0)}</div>
              </div>
              {results.data.total_revenue != null && (
                <div className="p-3 rounded-xl bg-emerald-500/5 text-center">
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                  <div className="text-lg font-bold text-emerald-600 mt-1">{fp(results.data.total_revenue)}</div>
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm text-foreground">{results.data.executive_summary}</div>
            {results.data.top_categories?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Spending Categories</h4>
                <div className="grid gap-2">
                  {results.data.top_categories.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      {trendIcon(c.trend)}
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{c.category}</span>
                        {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{fp(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.data.anomalies?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Anomalies Detected</h4>
                <div className="grid gap-2">
                  {results.data.anomalies.map((a: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl border border-border">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${a.severity === "high" ? "text-destructive" : "text-amber-500"}`} />
                      <div>
                        <p className="text-sm text-foreground">{a.description}</p>
                        {a.amount && <p className="text-xs text-muted-foreground">{fp(a.amount)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.data.cash_flow_prediction && (
              <div className="p-3 rounded-xl bg-muted/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cash Flow Prediction</h4>
                <p className="text-sm text-foreground">{results.data.cash_flow_prediction}</p>
              </div>
            )}
            {results.data.recommendations?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost Optimization</h4>
                <ul className="space-y-1.5">
                  {results.data.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground"><Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && (
          <div className="text-center py-14 text-muted-foreground">
            <Brain className="h-14 w-14 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium">Click "Run AI" to analyze your business data</p>
            <p className="text-xs mt-1">AI will process your company's real data and return actionable insights</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">AI is analyzing your data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
