import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ClipboardList, Check, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmployeeSurveys() {
  const { user, profile } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user || !profile?.tenant_id) return;
    setLoading(true);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("employee_surveys").select("*").eq("tenant_id", profile.tenant_id).eq("status", "active"),
      supabase.from("survey_responses").select("*").eq("user_id", user.id),
    ]);
    setSurveys(s || []);
    setResponses(r || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, profile?.tenant_id]);

  const hasResponded = (surveyId: string) => responses.some(r => r.survey_id === surveyId);

  const handleSubmit = async (surveyId: string) => {
    setSubmitting(true);
    const { error } = await supabase.from("survey_responses").insert({
      tenant_id: profile?.tenant_id,
      survey_id: surveyId,
      user_id: user!.id,
      answers,
    });
    if (error) toast.error(error.message);
    else { toast.success("Response submitted!"); setActiveSurvey(null); setAnswers({}); fetchData(); }
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback & Surveys</h1>
        <p className="text-sm text-muted-foreground mt-1">Share your feedback and respond to company surveys</p>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No active surveys</p>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map(survey => {
            const responded = hasResponded(survey.id);
            const isActive = activeSurvey === survey.id;
            const questions = Array.isArray(survey.questions) ? survey.questions : [];

            return (
              <div key={survey.id} className={cn(
                "border rounded-xl bg-card overflow-hidden transition-all",
                isActive ? "border-primary/30" : "border-border"
              )}>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", responded ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-primary/10")}>
                      {responded ? <Check className="h-5 w-5 text-emerald-500" /> : <MessageSquare className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{survey.title}</p>
                      <p className="text-[10px] text-muted-foreground">{survey.description || `${questions.length} questions`}</p>
                    </div>
                  </div>
                  {responded ? (
                    <span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded-full">Completed</span>
                  ) : (
                    <Button size="sm" variant={isActive ? "outline" : "default"} onClick={() => setActiveSurvey(isActive ? null : survey.id)}>
                      {isActive ? "Close" : "Respond"}
                    </Button>
                  )}
                </div>

                {isActive && !responded && (
                  <div className="border-t border-border px-5 py-5 space-y-4">
                    {questions.map((q: any, i: number) => (
                      <div key={i}>
                        <label className="text-xs font-medium text-foreground mb-1.5 block">{i + 1}. {typeof q === "string" ? q : q.question || q.text || `Question ${i + 1}`}</label>
                        <Textarea
                          value={answers[`q${i}`] || ""}
                          onChange={e => setAnswers(prev => ({ ...prev, [`q${i}`]: e.target.value }))}
                          placeholder="Your answer..."
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    ))}
                    {questions.length === 0 && (
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1.5 block">Your Feedback</label>
                        <Textarea
                          value={answers.feedback || ""}
                          onChange={e => setAnswers(prev => ({ ...prev, feedback: e.target.value }))}
                          placeholder="Share your thoughts..."
                          rows={3}
                          className="text-xs"
                        />
                      </div>
                    )}
                    <Button size="sm" onClick={() => handleSubmit(survey.id)} disabled={submitting}>
                      {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Submit Response
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
