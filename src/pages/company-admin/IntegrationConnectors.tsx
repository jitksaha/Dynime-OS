// @ts-nocheck
import { useState, useEffect } from "react";
import { Link2, Calendar, MessageSquare, Zap, CheckCircle2, ExternalLink, Loader2, Mail, Smartphone, Globe, Webhook, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import IntegrationSetupWizard, { WIZARD_CONFIGS } from "@/components/IntegrationSetupWizard";

interface IntegrationItem {
  key: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  { key: "gmail", name: "Gmail", description: "Send emails via Gmail SMTP", icon: Mail, category: "Email" },
  { key: "slack", name: "Slack", description: "Send notifications to Slack channels", icon: MessageSquare, category: "Communication" },
  { key: "whatsapp", name: "WhatsApp Business", description: "Send messages via WhatsApp API", icon: Smartphone, category: "Communication" },
  { key: "google_calendar", name: "Google Calendar", description: "Sync events, meetings, and deadlines", icon: Calendar, category: "Productivity" },
  { key: "google_drive", name: "Google Drive", description: "Store and share files", icon: Globe, category: "Productivity" },
  { key: "zapier", name: "Zapier", description: "Connect 5,000+ apps via automation", icon: Zap, category: "Automation" },
  { key: "microsoft_teams", name: "Microsoft Teams", description: "Post notifications to Teams channels", icon: MessageSquare, category: "Communication" },
  { key: "webhooks", name: "Custom Webhook", description: "Send events to any HTTP endpoint", icon: Webhook, category: "Developer" },
];

export default function IntegrationConnectors() {
  const { tenantId } = useTenant();
  const [connected, setConnected] = useState<Record<string, { id: string; config: Record<string, any> }>>({});
  const [wizardOpen, setWizardOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("tenant_integrations")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_enabled", true);
      const map: Record<string, { id: string; config: Record<string, any> }> = {};
      (data || []).forEach((row: any) => {
        map[row.integration_key] = { id: row.id, config: row.config || {} };
      });
      setConnected(map);
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const disconnect = async (key: string) => {
    if (!connected[key]) return;
    await supabase.from("tenant_integrations").update({ is_enabled: false } as any).eq("id", connected[key].id);
    setConnected(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toast.success("Integration disconnected");
  };

  const handleWizardSave = async (config: Record<string, any>) => {
    if (!tenantId || !wizardOpen) return;
    setSaving(true);
    try {
      const existing = connected[wizardOpen];
      if (existing) {
        await supabase
          .from("tenant_integrations")
          .update({ config, is_enabled: true, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
        setConnected(prev => ({ ...prev, [wizardOpen]: { ...prev[wizardOpen], config } }));
      } else {
        const { data } = await supabase
          .from("tenant_integrations")
          .insert({ tenant_id: tenantId, integration_key: wizardOpen, is_enabled: true, config } as any)
          .select()
          .single();
        if (data) {
          setConnected(prev => ({ ...prev, [wizardOpen]: { id: (data as any).id, config } }));
        }
      }
      const intDef = INTEGRATIONS.find(i => i.key === wizardOpen);
      toast.success(`${intDef?.name || wizardOpen} connected successfully!`);
      setWizardOpen(null);
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Integration Connectors</h1>
          <p className="text-xs text-muted-foreground">Connect third-party services with guided step-by-step setup</p>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h2>
          <div className="grid gap-3">
            {INTEGRATIONS.filter(i => i.category === cat).map(integration => {
              const isConnected = !!connected[integration.key];
              const hasWizard = !!WIZARD_CONFIGS[integration.key];
              const Icon = integration.icon;

              return (
                <div key={integration.key} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{integration.name}</h3>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                          </span>
                          <button onClick={() => disconnect(integration.key)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> Disconnect
                          </button>
                        </>
                      ) : hasWizard ? (
                        <button
                          onClick={() => setWizardOpen(integration.key)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Easy Setup
                        </button>
                      ) : (
                        <button
                          onClick={() => setWizardOpen(integration.key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" /> Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Setup Wizard Modal */}
      {wizardOpen && WIZARD_CONFIGS[wizardOpen] && (() => {
        const def = INTEGRATIONS.find(d => d.key === wizardOpen);
        if (!def) return null;
        return (
          <IntegrationSetupWizard
            integrationKey={wizardOpen}
            integrationName={def.name}
            icon={def.icon}
            currentConfig={connected[wizardOpen]?.config || {}}
            saving={saving}
            onClose={() => setWizardOpen(null)}
            onSave={handleWizardSave}
          />
        );
      })()}
    </div>
  );
}
