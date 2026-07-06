import { useState } from "react";
import { ArrowRightLeft, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface Props {
  currentProvider: string;
  config: {
    system_prompt: string;
    max_tokens: number;
    temperature: number;
    api_keys: Record<string, string>;
    enabled: boolean;
  };
  onMigrated: (newProvider: string, newModel: string) => void;
}

const TARGETS: { id: string; label: string; defaultModel: string }[] = [
  { id: "openai", label: "OpenAI (ChatGPT)", defaultModel: "gpt-4o-mini" },
  { id: "anthropic", label: "Anthropic (Claude)", defaultModel: "claude-3-5-sonnet-20241022" },
  { id: "google", label: "Google Gemini", defaultModel: "gemini-2.0-flash" },
];

export function AISettingsMigrationPanel({ currentProvider, config, onMigrated }: Props) {
  const [migrating, setMigrating] = useState<string | null>(null);

  const migrate = async (targetId: string) => {
    const target = TARGETS.find((t) => t.id === targetId)!;
    if (!config.api_keys[targetId]) {
      toast.error(`Add the ${target.label} API key first, then migrate.`);
      return;
    }
    setMigrating(targetId);
    const newConfig = {
      ...config,
      ai_provider: targetId,
      model: target.defaultModel,
    };
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "ai_config", value: newConfig as any }, { onConflict: "key" });
    setMigrating(null);
    if (error) {
      toast.error("Migration failed");
      return;
    }
    toast.success(`Switched to ${target.label} — settings preserved`);
    onMigrated(targetId, target.defaultModel);
  };

  const targets = TARGETS.filter((t) => t.id !== currentProvider);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Migrate to Another Provider</h2>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Switch the active AI provider in one click. Your system prompt, temperature, max tokens
        and saved API keys are preserved — the model is auto-set to a sensible default for the new provider.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {targets.map((t) => {
          const ready = !!config.api_keys[t.id];
          const busy = migrating === t.id;
          return (
            <button
              key={t.id}
              onClick={() => migrate(t.id)}
              disabled={busy || !ready}
              className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors disabled:opacity-50 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{t.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {ready ? "Ready to migrate" : "API key needed"}
                </p>
              </div>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : ready ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
