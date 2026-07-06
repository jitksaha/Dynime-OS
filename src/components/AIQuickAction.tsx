import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { getAIErrorMessage } from "@/lib/aiErrorMessage";

interface AIQuickActionProps {
  operation: "email_draft" | "hr_assist" | "sales_intelligence" | "expense_analysis";
  context: any;
  label?: string;
  onResult: (result: any) => void;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Reusable AI action button that calls the ai-business-ops edge function.
 * Embed in any module for contextual AI features.
 */
export function AIQuickAction({ operation, context, label = "AI Assist", onResult, className = "", size = "sm" }: AIQuickActionProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!tenantId) { toast.error("No company selected"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-business-ops", {
        body: { operation, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onResult(data.result);
      toast.success("AI analysis complete");
    } catch (e: any) {
      toast.error(getAIErrorMessage(e, "AI failed"));
    }
    setLoading(false);
  };

  const sizeClasses = size === "sm"
    ? "px-2.5 py-1.5 text-xs gap-1.5"
    : "px-4 py-2 text-sm gap-2";

  return (
    <button
      onClick={run}
      disabled={loading || !tenantId}
      className={`inline-flex items-center rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors ${sizeClasses} ${className}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
