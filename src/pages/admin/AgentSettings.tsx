import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Save, Bot, Shield, Zap, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AgentConfig {
  id?: string;
  default_mode: string;
  tone: string;
  custom_tone_instructions: string;
  confidence_threshold: number;
  strict_mode: boolean;
  blacklist_topics: string[];
  greeting_template: string;
  fallback_message: string;
  auto_cta_enabled: boolean;
  cta_options: string[];
  max_response_length: number;
}

const DEFAULTS: AgentConfig = {
  default_mode: "auto",
  tone: "friendly",
  custom_tone_instructions: "",
  confidence_threshold: 0.75,
  strict_mode: true,
  blacklist_topics: [],
  greeting_template: "Hi! 👋 How can I help you today?",
  fallback_message: "Let me confirm this with the team and get back to you shortly.",
  auto_cta_enabled: true,
  cta_options: ["Place order", "Book now", "Talk to team"],
  max_response_length: 500,
};

export default function AgentSettings() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [config, setConfig] = useState<AgentConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blacklistInput, setBlacklistInput] = useState("");
  const [ctaInput, setCtaInput] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("agent_configs")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();
      if (data) setConfig(data as any);
      setLoading(false);
    })();
  }, [tenantId]);

  const save = async () => {
    if (!tenantId) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      default_mode: config.default_mode,
      tone: config.tone,
      custom_tone_instructions: config.custom_tone_instructions || null,
      confidence_threshold: config.confidence_threshold,
      strict_mode: config.strict_mode,
      blacklist_topics: config.blacklist_topics,
      greeting_template: config.greeting_template || null,
      fallback_message: config.fallback_message,
      auto_cta_enabled: config.auto_cta_enabled,
      cta_options: config.cta_options,
      max_response_length: config.max_response_length,
    };

    const { error } = config.id
      ? await supabase.from("agent_configs").update(payload).eq("id", config.id)
      : await supabase.from("agent_configs").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Agent settings saved!");
  };

  const addBlacklistTopic = () => {
    if (!blacklistInput.trim()) return;
    setConfig((p) => ({ ...p, blacklist_topics: [...p.blacklist_topics, blacklistInput.trim()] }));
    setBlacklistInput("");
  };

  const removeBlacklistTopic = (idx: number) => {
    setConfig((p) => ({ ...p, blacklist_topics: p.blacklist_topics.filter((_, i) => i !== idx) }));
  };

  const addCta = () => {
    if (!ctaInput.trim()) return;
    setConfig((p) => ({ ...p, cta_options: [...p.cta_options, ctaInput.trim()] }));
    setCtaInput("");
  };

  const removeCta = (idx: number) => {
    setConfig((p) => ({ ...p, cta_options: p.cta_options.filter((_, i) => i !== idx) }));
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Agent Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure how your AI social media agent behaves</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Response Mode */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Response Mode</h2>
        </div>
        <Select value={config.default_mode} onValueChange={(v) => setConfig((p) => ({ ...p, default_mode: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">🤖 Auto — AI replies instantly</SelectItem>
            <SelectItem value="approval">✅ Approval — AI drafts, human approves</SelectItem>
            <SelectItem value="assist">💡 Assist — AI suggests, human decides</SelectItem>
            <SelectItem value="off">👤 Off — Human only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Brand Voice */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Brand Voice</h2>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Tone</label>
          <Select value={config.tone} onValueChange={(v) => setConfig((p) => ({ ...p, tone: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">😊 Friendly</SelectItem>
              <SelectItem value="professional">💼 Professional</SelectItem>
              <SelectItem value="sales_driven">🚀 Sales-Driven</SelectItem>
              <SelectItem value="premium">✨ Premium</SelectItem>
              <SelectItem value="custom">🎨 Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {config.tone === "custom" && (
          <Textarea
            placeholder="Describe your brand voice (e.g., 'Casual, witty, use emojis sparingly, always mention our eco-friendly mission')"
            value={config.custom_tone_instructions}
            onChange={(e) => setConfig((p) => ({ ...p, custom_tone_instructions: e.target.value }))}
            rows={3}
          />
        )}
        <div>
          <label className="text-sm font-medium mb-1 block">Greeting Template</label>
          <Input
            value={config.greeting_template}
            onChange={(e) => setConfig((p) => ({ ...p, greeting_template: e.target.value }))}
            placeholder="Hi! 👋 How can I help you today?"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Max Response Length</label>
          <Input
            type="number"
            value={config.max_response_length}
            onChange={(e) => setConfig((p) => ({ ...p, max_response_length: parseInt(e.target.value) || 500 }))}
          />
        </div>
      </div>

      {/* Safety */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Safety</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Strict Mode</p>
            <p className="text-xs text-muted-foreground">AI won't respond if confidence is below threshold</p>
          </div>
          <Switch checked={config.strict_mode} onCheckedChange={(v) => setConfig((p) => ({ ...p, strict_mode: v }))} />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Confidence Threshold: {(config.confidence_threshold * 100).toFixed(0)}%
          </label>
          <Slider
            value={[config.confidence_threshold * 100]}
            onValueChange={([v]) => setConfig((p) => ({ ...p, confidence_threshold: v / 100 }))}
            max={100}
            min={10}
            step={5}
          />
          <p className="text-xs text-muted-foreground mt-1">Below this, the AI defers to a human or uses the fallback message</p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Fallback Message</label>
          <Input
            value={config.fallback_message}
            onChange={(e) => setConfig((p) => ({ ...p, fallback_message: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Blacklisted Topics</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={blacklistInput}
              onChange={(e) => setBlacklistInput(e.target.value)}
              placeholder="Add topic..."
              onKeyDown={(e) => e.key === "Enter" && addBlacklistTopic()}
            />
            <Button variant="outline" onClick={addBlacklistTopic}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.blacklist_topics.map((t, i) => (
              <span key={i} className="text-xs bg-red-500/10 text-red-600 px-2 py-1 rounded-full cursor-pointer hover:bg-red-500/20" onClick={() => removeBlacklistTopic(i)}>
                {t} ×
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Conversion Optimization</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto CTA Suggestions</p>
            <p className="text-xs text-muted-foreground">AI will suggest call-to-action when appropriate</p>
          </div>
          <Switch checked={config.auto_cta_enabled} onCheckedChange={(v) => setConfig((p) => ({ ...p, auto_cta_enabled: v }))} />
        </div>
        {config.auto_cta_enabled && (
          <div>
            <label className="text-sm font-medium mb-2 block">CTA Options</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={ctaInput}
                onChange={(e) => setCtaInput(e.target.value)}
                placeholder="Add CTA..."
                onKeyDown={(e) => e.key === "Enter" && addCta()}
              />
              <Button variant="outline" onClick={addCta}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {config.cta_options.map((c, i) => (
                <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full cursor-pointer hover:bg-primary/20" onClick={() => removeCta(i)}>
                  {c} ×
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
