// @ts-nocheck
import { useState, useEffect } from "react";
import { Zap, ArrowRight, ExternalLink, Loader2, Star, Search, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ZapTemplate {
  id: string;
  name: string;
  description: string;
  trigger_app: string;
  trigger_event: string;
  action_app: string;
  action_event: string;
  category: string;
  zapier_template_url: string | null;
  popularity_score: number;
}

interface TenantZap {
  id: string;
  name: string;
  webhook_url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
}

const TEMPLATE_CATEGORIES = ["All", "Sales", "HR", "Finance", "Marketing", "Productivity", "Support"];

export default function ZapierAutomationHub() {
  const { tenantId } = useTenant();
  const [templates, setTemplates] = useState<ZapTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("templates");
  const [activeCat, setActiveCat] = useState("All");
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [newZapName, setNewZapName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [tenantZaps, setTenantZaps] = useState<TenantZap[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    const { data } = await supabase
      .from("zapier_templates")
      .select("*")
      .eq("is_active", true)
      .order("popularity_score", { ascending: false });
    setTemplates((data as any[]) || []);

    if (tenantId) {
      const { data: connData } = await supabase
        .from("tenant_app_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("connection_type", "zapier");
      setTenantZaps(((connData as any[]) || []).map((c: any) => ({
        id: c.id,
        name: c.config?.name || "Custom Zap",
        webhook_url: c.zapier_webhook_url || "",
        events: c.config?.events || [],
        is_active: c.status === "active",
        last_triggered_at: c.last_synced_at,
      })));
    }
    setLoading(false);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesCat = activeCat === "All" || t.category === activeCat;
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddZap = async () => {
    if (!tenantId || !newWebhookUrl) return;
    setSaving(true);
    try {
      // Find the Zapier app
      const { data: zapierApp } = await supabase
        .from("integration_apps")
        .select("id")
        .eq("slug", "zapier")
        .single();

      if (!zapierApp) {
        toast.error("Zapier app not found");
        setSaving(false);
        return;
      }

      const { data } = await supabase.from("tenant_app_connections").insert({
        tenant_id: tenantId,
        app_id: (zapierApp as any).id,
        connection_type: "zapier",
        status: "active",
        zapier_webhook_url: newWebhookUrl,
        config: { name: newZapName || "Custom Zap" },
        connected_by: (await supabase.auth.getUser()).data.user?.id,
      } as any).select().single();

      if (data) {
        setTenantZaps(prev => [...prev, {
          id: (data as any).id,
          name: newZapName || "Custom Zap",
          webhook_url: newWebhookUrl,
          events: [],
          is_active: true,
          last_triggered_at: null,
        }]);
      }
      toast.success("Zap connected!");
      setWebhookDialogOpen(false);
      setNewZapName("");
      setNewWebhookUrl("");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const triggerTestZap = async (webhookUrl: string) => {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          event: "test.ping",
          timestamp: new Date().toISOString(),
          source: "dynime",
          message: "Test trigger from Dynime platform",
        }),
      });
      toast.success("Test event sent! Check your Zap history.");
    } catch {
      toast.error("Failed to send test event");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Zapier Automation Hub</h1>
            <p className="text-xs text-muted-foreground">
              Automate workflows with 7,000+ apps • Pre-built templates + custom webhooks
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setWebhookDialogOpen(true)}>
          <Zap className="h-3.5 w-3.5 mr-1.5" /> Add Custom Zap
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="text-xs">
            <Star className="h-3.5 w-3.5 mr-1" /> Zap Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="my-zaps" className="text-xs">
            <Zap className="h-3.5 w-3.5 mr-1" /> My Zaps ({tenantZaps.length})
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          {/* Search + Category */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map(template => (
              <div key={template.id} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Math.min(5, Math.ceil(template.popularity_score / 20)) }).map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{template.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
                  <span className="font-medium text-foreground">{template.trigger_app}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium text-foreground">{template.action_app}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => {
                      setNewZapName(template.name);
                      setWebhookDialogOpen(true);
                    }}
                  >
                    Use Template
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <a href="https://zapier.com/apps" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* My Zaps Tab */}
        <TabsContent value="my-zaps" className="space-y-4 mt-4">
          {tenantZaps.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-2xl">
              <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No Zaps connected yet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Add your first Zapier webhook to start automating
              </p>
              <Button size="sm" onClick={() => setWebhookDialogOpen(true)}>
                <Zap className="h-3.5 w-3.5 mr-1.5" /> Create Your First Zap
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tenantZaps.map(zap => (
                <div key={zap.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{zap.name}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[240px]">
                          {zap.webhook_url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={zap.is_active ? "default" : "secondary"} className="text-[10px]">
                        {zap.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => triggerTestZap(zap.webhook_url)}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Zap Dialog */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="max-w-md z-[60]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Connect Zapier Webhook
            </DialogTitle>
            <DialogDescription>
              Create a Zap at zapier.com with a "Webhooks by Zapier" trigger, then paste the webhook URL below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">Quick Setup:</p>
              <p>1. Go to <a href="https://zapier.com/app/editor" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">zapier.com/app/editor</a></p>
              <p>2. Choose "Webhooks by Zapier" as the trigger</p>
              <p>3. Select "Catch Hook" event</p>
              <p>4. Copy the webhook URL and paste it below</p>
              <p>5. Choose your action app (Slack, Google Sheets, etc.)</p>
            </div>
            <div>
              <Label className="text-xs">Automation Name</Label>
              <Input
                placeholder="e.g., New Deal → Slack Alert"
                value={newZapName}
                onChange={e => setNewZapName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Zapier Webhook URL *</Label>
              <Input
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={newWebhookUrl}
                onChange={e => setNewWebhookUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleAddZap} disabled={saving || !newWebhookUrl} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Connect Zap
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
