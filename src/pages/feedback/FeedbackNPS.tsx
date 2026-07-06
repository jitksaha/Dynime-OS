// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { MessageSquareHeart, Plus, BarChart3, TrendingUp, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Survey { id: string; title: string; survey_type: string; status: string; questions: any[]; trigger_event: string; created_at: string; }
interface Response { id: string; survey_id: string; respondent_name: string; respondent_email: string; score: number; sentiment: string; created_at: string; }

export default function FeedbackNPS() {
  const { tenantId, userId } = useTenant();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", survey_type: "nps", trigger_event: "manual" });
  const [activeTab, setActiveTab] = useState<"surveys" | "responses" | "analytics">("surveys");

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    const [s, r] = await Promise.all([
      supabase.from("feedback_surveys" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("feedback_responses" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    ]);
    setSurveys((s.data as any[]) || []);
    setResponses((r.data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createSurvey = async () => {
    if (!form.title || !tenantId) return;
    const { error } = await supabase.from("feedback_surveys" as any).insert({
      title: form.title, survey_type: form.survey_type, trigger_event: form.trigger_event,
      tenant_id: tenantId, created_by: userId, questions: [{ text: "How likely are you to recommend us?", type: "rating" }],
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Survey created");
    setShowForm(false);
    setForm({ title: "", survey_type: "nps", trigger_event: "manual" });
    fetch();
  };

  const npsScore = responses.length > 0
    ? Math.round(((responses.filter(r => r.score >= 9).length - responses.filter(r => r.score <= 6).length) / responses.length) * 100)
    : 0;

  const avgScore = responses.length > 0 ? (responses.reduce((a, r) => a + (r.score || 0), 0) / responses.length).toFixed(1) : "0";

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MessageSquareHeart className="h-6 w-6 text-primary" /> Feedback & NPS</h1>
          <p className="text-sm text-muted-foreground mt-1">Collect customer satisfaction data and track NPS scores</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Survey
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{surveys.length}</p>
          <p className="text-xs text-muted-foreground">Surveys</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{responses.length}</p>
          <p className="text-xs text-muted-foreground">Responses</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className={`text-2xl font-bold ${npsScore >= 0 ? "text-success" : "text-destructive"}`}>{npsScore}</p>
          <p className="text-xs text-muted-foreground">NPS Score</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{avgScore}</p>
          <p className="text-xs text-muted-foreground">Avg Rating</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["surveys", "responses", "analytics"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">Create Survey</p>
          <input placeholder="Survey title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.survey_type} onChange={e => setForm(p => ({ ...p, survey_type: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="nps">NPS</option><option value="csat">CSAT</option><option value="custom">Custom</option>
            </select>
            <select value={form.trigger_event} onChange={e => setForm(p => ({ ...p, trigger_event: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="manual">Manual</option><option value="post_ticket">Post Ticket</option><option value="post_sale">Post Sale</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={createSurvey} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      {activeTab === "surveys" && (
        <div className="space-y-2">
          {surveys.length === 0 ? (
            <div className="text-center py-12"><Star className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No surveys yet</p></div>
          ) : surveys.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <div className={`p-2 rounded-lg ${s.status === "active" ? "bg-success/10" : "bg-secondary"}`}>
                <MessageSquareHeart className={`h-4 w-4 ${s.status === "active" ? "text-success" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.survey_type.toUpperCase()} · {s.trigger_event} · {responses.filter(r => r.survey_id === s.id).length} responses</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "responses" && (
        <div className="space-y-2">
          {responses.length === 0 ? (
            <div className="text-center py-12"><Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No responses yet</p></div>
          ) : responses.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${r.score >= 9 ? "bg-success/10 text-success" : r.score >= 7 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                {r.score}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{r.respondent_name || r.respondent_email || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${r.score >= 9 ? "bg-success/10 text-success" : r.score >= 7 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                {r.score >= 9 ? "Promoter" : r.score >= 7 ? "Passive" : "Detractor"}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl border border-border bg-card">
            <TrendingUp className="h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold text-foreground">{npsScore}</p>
            <p className="text-sm text-muted-foreground">Net Promoter Score</p>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-success">Promoters (9-10)</span><span>{responses.filter(r => r.score >= 9).length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-warning">Passives (7-8)</span><span>{responses.filter(r => r.score >= 7 && r.score < 9).length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-destructive">Detractors (0-6)</span><span>{responses.filter(r => r.score <= 6).length}</span></div>
            </div>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <BarChart3 className="h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold text-foreground">{avgScore}</p>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <Users className="h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold text-foreground">{responses.length}</p>
            <p className="text-sm text-muted-foreground">Total Responses</p>
          </div>
        </div>
      )}
    </div>
  );
}
