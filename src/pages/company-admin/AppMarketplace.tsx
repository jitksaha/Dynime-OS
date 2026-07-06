// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import {
  Search, Filter, Star, Zap, CheckCircle2, ExternalLink, Loader2, ArrowRight,
  MessageSquare, Calendar, Mail, Smartphone, CreditCard, Target, Layout,
  Cloud, Globe, Webhook, Phone, Send, BookOpen, Table, Bug, Calculator,
  PieChart, FileText, Megaphone, GitBranch, HardDrive, DollarSign, Users,
  Square as SquareIcon, CheckSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare, Calendar, Mail, Smartphone, CreditCard, Target, Layout,
  Cloud, Globe, Webhook, Phone, Send, BookOpen, Table, Bug, Calculator,
  PieChart, FileText, Megaphone, GitBranch, HardDrive, DollarSign, Users,
  Square: SquareIcon, CheckSquare, Zap, MessageCircle: MessageSquare,
  Workflow: GitBranch, Github: Globe,
};

interface App {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description: string | null;
  icon_name: string;
  category: string;
  subcategory: string | null;
  auth_type: string;
  is_featured: boolean;
  is_native: boolean;
  is_zapier_available: boolean;
  website_url: string | null;
  supported_triggers: string[];
  supported_actions: string[];
  popularity_score: number;
}

interface Connection {
  id: string;
  app_id: string;
  status: string;
  webhook_url: string | null;
  zapier_webhook_url: string | null;
  events_sent: number;
  events_received: number;
  last_synced_at: string | null;
}

const CATEGORIES = ["All", "Communication", "Productivity", "Finance", "Marketing", "Automation", "Developer"];

export default function AppMarketplace() {
  const { tenantId } = useTenant();
  const [apps, setApps] = useState<App[]>([]);
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadApps();
  }, [tenantId]);

  const loadApps = async () => {
    const { data: appsData } = await supabase
      .from("integration_apps")
      .select("*")
      .eq("is_active", true)
      .order("popularity_score", { ascending: false });

    setApps((appsData as any[]) || []);

    if (tenantId) {
      const { data: connData } = await supabase
        .from("tenant_app_connections")
        .select("*")
        .eq("tenant_id", tenantId);
      const map: Record<string, Connection> = {};
      ((connData as any[]) || []).forEach((c: any) => { map[c.app_id] = c; });
      setConnections(map);
    }
    setLoading(false);
  };

  const filteredApps = useMemo(() => {
    let result = apps;
    if (activeCategory !== "All") {
      result = result.filter(a => a.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.subcategory && a.subcategory.toLowerCase().includes(q))
      );
    }
    return result;
  }, [apps, activeCategory, search]);

  const featuredApps = useMemo(() => apps.filter(a => a.is_featured).slice(0, 6), [apps]);

  const handleConnect = async () => {
    if (!tenantId || !selectedApp) return;
    setSaving(true);
    try {
      const payload: any = {
        tenant_id: tenantId,
        app_id: selectedApp.id,
        connection_type: webhookUrl ? "zapier" : "native",
        status: "active",
        zapier_webhook_url: webhookUrl || null,
        connected_by: (await supabase.auth.getUser()).data.user?.id,
      };
      const existing = connections[selectedApp.id];
      if (existing) {
        await supabase.from("tenant_app_connections").update(payload as any).eq("id", existing.id);
      } else {
        const { data } = await supabase.from("tenant_app_connections").insert(payload as any).select().single();
        if (data) {
          setConnections(prev => ({ ...prev, [selectedApp.id]: data as any }));
        }
      }
      toast.success(`${selectedApp.name} connected!`);
      setConnectDialogOpen(false);
      setWebhookUrl("");
      loadApps();
    } catch {
      toast.error("Failed to connect");
    }
    setSaving(false);
  };

  const handleDisconnect = async (appId: string) => {
    const conn = connections[appId];
    if (!conn) return;
    await supabase.from("tenant_app_connections").update({ status: "disconnected" } as any).eq("id", conn.id);
    setConnections(prev => {
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    toast.success("Disconnected");
  };

  const getIcon = (iconName: string) => ICON_MAP[iconName] || Zap;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">App Marketplace</h1>
            <p className="text-xs text-muted-foreground">
              Connect {apps.length}+ apps to sync your workflows • Native + Zapier powered
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {Object.keys(connections).length} Connected
        </Badge>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps (Slack, Stripe, Mailchimp...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs whitespace-nowrap">
              {cat}
              {cat !== "All" && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({apps.filter(a => a.category === cat).length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Featured Section */}
      {activeCategory === "All" && !search && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Featured Integrations</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredApps.map(app => {
              const Icon = getIcon(app.icon_name);
              const isConnected = !!connections[app.id];
              return (
                <div
                  key={app.id}
                  onClick={() => { setSelectedApp(app); setConnectDialogOpen(true); }}
                  className="relative bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  {app.is_native && (
                    <Badge className="absolute top-3 right-3 text-[10px] bg-primary/10 text-primary border-0">
                      Native
                    </Badge>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{app.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{app.subcategory || app.category}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1">
                      {app.supported_triggers.slice(0, 2).map(t => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Apps Grid */}
      <div>
        {activeCategory !== "All" || search ? null : (
          <h2 className="text-sm font-semibold text-foreground mb-3">All Apps</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredApps.map(app => {
            const Icon = getIcon(app.icon_name);
            const isConnected = !!connections[app.id];
            return (
              <div
                key={app.id}
                className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-all group cursor-pointer"
                onClick={() => { setSelectedApp(app); setConnectDialogOpen(true); }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{app.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{app.subcategory || app.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {app.is_native && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Native</Badge>
                    )}
                    {app.is_zapier_available && !app.is_native && (
                      <Badge variant="outline" className="text-[10px]">Zapier</Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{app.description}</p>
                <div className="flex items-center justify-between">
                  {isConnected ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive h-7"
                        onClick={e => { e.stopPropagation(); handleDisconnect(app.id); }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="text-xs h-7 w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Connect <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filteredApps.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No apps found. Try a different search or category.
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="max-w-lg z-[60]">
          {selectedApp && (() => {
            const Icon = getIcon(selectedApp.icon_name);
            const isConnected = !!connections[selectedApp.id];
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle>{selectedApp.name}</DialogTitle>
                      <DialogDescription>{selectedApp.description}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Triggers & Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Triggers</Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedApp.supported_triggers.map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t.replace(/_/g, ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Actions</Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedApp.supported_actions.map(a => (
                          <Badge key={a} variant="secondary" className="text-[10px]">{a.replace(/_/g, ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Connection Method */}
                  {!isConnected && (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted/50 rounded-xl">
                        <h4 className="text-xs font-semibold text-foreground mb-1">
                          {selectedApp.is_native ? "🔌 Native Connection" : "⚡ Connect via Zapier Webhook"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedApp.is_native
                            ? "This app has a built-in integration. Click Connect to activate."
                            : "Paste your Zapier webhook URL to connect this app. Create a Zap at zapier.com with a Webhook trigger."}
                        </p>
                      </div>

                      {!selectedApp.is_native && (
                        <div>
                          <Label className="text-xs">Zapier Webhook URL</Label>
                          <Input
                            placeholder="https://hooks.zapier.com/hooks/catch/..."
                            value={webhookUrl}
                            onChange={e => setWebhookUrl(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}

                      <Button onClick={handleConnect} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Connect {selectedApp.name}
                      </Button>
                    </div>
                  )}

                  {isConnected && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">Connected & Active</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {connections[selectedApp.id]?.events_sent || 0} events sent • {connections[selectedApp.id]?.events_received || 0} received
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-destructive"
                        onClick={() => { handleDisconnect(selectedApp.id); setConnectDialogOpen(false); }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  )}

                  {selectedApp.website_url && (
                    <a href={selectedApp.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Visit {selectedApp.name} website
                    </a>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
