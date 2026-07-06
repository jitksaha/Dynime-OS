import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useLanguage } from "@/hooks/useLanguage";
import ReactMarkdown from "react-markdown";
import { getAIErrorMessage, PLATFORM_AI_ERROR_MESSAGE } from "@/lib/aiErrorMessage";

interface InsightData {
  content: string;
  generatedAt: string;
}

export function AIInsightsWidget({ businessData }: { businessData: Record<string, any> }) {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-business-insights", {
        body: { businessData },
      });
      if (error) throw error;
      setInsights({
        content: data?.insights || "No insights available.",
        generatedAt: new Date().toLocaleString(),
      });
    } catch (e: any) {
      console.error("AI Insights error:", e);
      setInsights({
        content: getAIErrorMessage(e, PLATFORM_AI_ERROR_MESSAGE),
        generatedAt: new Date().toLocaleString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-gradient-to-r from-primary/8 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t("ai_insights")}</h3>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("analyzing")}
            </>
          ) : insights ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5" />
              {t("generate_insights")}
            </>
          )}
        </button>
      </div>

      <div className="p-5">
        {!insights && !loading && (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center gap-6">
              {[
                { icon: TrendingUp, label: "Trends", color: "text-success", bg: "bg-success/10" },
                { icon: AlertTriangle, label: "Anomalies", color: "text-warning", bg: "bg-warning/10" },
                { icon: Lightbulb, label: "Actions", color: "text-info", bg: "bg-info/10" },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className={`p-3 rounded-2xl ${bg} shadow-sm`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Get AI-powered analysis of your CRM, HRMS, and accounting data with actionable recommendations.
            </p>
          </div>
        )}

        {loading && !insights && (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping" />
            </div>
            <p className="text-xs text-muted-foreground">{t("analyzing")}</p>
          </div>
        )}

        {insights && (
          <div className="space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
              <ReactMarkdown>{insights.content}</ReactMarkdown>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-right pt-2 border-t border-border">Generated: {insights.generatedAt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
