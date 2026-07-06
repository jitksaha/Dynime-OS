import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { getAIErrorMessage } from "@/lib/aiErrorMessage";

interface AutoFillSuggestion {
  field_name: string;
  suggested_value: string;
  confidence: number;
}

interface NLSearchResult {
  module: string;
  filters: { column: string; operator: string; value: string }[];
  sort_by?: string;
  sort_order?: string;
  summary: string;
}

interface MeetingSummary {
  summary: string;
  key_points: string[];
  decisions?: string[];
  action_items: { task: string; assignee?: string; deadline?: string }[];
}

export function useAISmartFeatures() {
  const [loading, setLoading] = useState(false);

  const autoFillForm = useCallback(async (formType: string, currentData: Record<string, any>): Promise<AutoFillSuggestion[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-smart-features", {
        body: { type: "auto_fill", context: { form_type: formType, current_data: currentData } },
      });
      if (error) throw error;
      return data?.result?.suggestions || [];
    } catch (e: any) {
      toast.error(getAIErrorMessage(e, "AI auto-fill failed"));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const naturalLanguageSearch = useCallback(async (query: string): Promise<NLSearchResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-smart-features", {
        body: { type: "natural_language_search", context: { query } },
      });
      if (error) throw error;
      return data?.result || null;
    } catch (e: any) {
      toast.error(getAIErrorMessage(e, "AI search failed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const summarizeMeeting = useCallback(async (meetingNotes: string, meetingTitle?: string): Promise<MeetingSummary | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-smart-features", {
        body: { type: "meeting_summary", context: { notes: meetingNotes, title: meetingTitle } },
      });
      if (error) throw error;
      return data?.result || null;
    } catch (e: any) {
      toast.error(getAIErrorMessage(e, "AI summary failed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { autoFillForm, naturalLanguageSearch, summarizeMeeting, loading };
}
