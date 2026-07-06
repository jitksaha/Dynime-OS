import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Truck, Eye, EyeOff, CheckCircle, XCircle, Loader2, Store, ShoppingBag,
  Plus, RefreshCw, Trash2, HelpCircle, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Courier Types ───
interface CourierConfig {
  id?: string; courier_key: string; display_name: string; is_enabled: boolean;
  is_sandbox: boolean; credentials: Record<string, string>; settings: Record<string, string>;
  last_tested_at: string | null; test_result: string | null;
}

const COURIER_TEMPLATES = [
  { key: "steadfast", name: "Steadfast", fields: [
    { key: "api_key", label: "API Key", required: true },
    { key: "secret_key", label: "Secret Key", required: true },
  ]},
  { key: "pathao", name: "Pathao", fields: [
    { key: "client_id", label: "Client ID", required: true },
    { key: "client_secret", label: "Client Secret", required: true },
    { key: "username", label: "Merchant Email", required: true },
    { key: "password", label: "Merchant Password", required: true },
  ]},
  { key: "redx", name: "RedX", fields: [
    { key: "token", label: "Token", required: true },
  ]},
];

// ─── Integration Types ───
interface StoreIntegration {
  id?: string; platform: string; store_name: string; store_url: string;
  credentials: Record<string, string>; is_enabled: boolean;
  sync_products: boolean; sync_orders: boolean; sync_customers: boolean; sync_categories: boolean;
  last_synced_at: string | null; sync_status: string; sync_error: string | null;
}
interface SyncLog {
  id: string; sync_type: string; status: string; items_synced: number;
  items_failed: number; started_at: string; completed_at: string | null;
}
const PLATFORM_CONFIGS = {
  woocommerce: {
    name: "WooCommerce", icon: Store, color: "bg-purple-600",
    fields: [
      { key: "consumer_key", label: "Consumer Key", required: true },
      { key: "consumer_secret", label: "Consumer Secret", required: true },
    ],
    urlPlaceholder: "https://your-store.com",
    description: "Import products, orders & customers from WooCommerce.",
    steps: [
      "Go to WordPress admin → WooCommerce → Settings → Advanced → REST API.",
      "Click 'Add key', set Permissions to 'Read'.",
      "Copy Consumer Key and Consumer Secret below.",
    ],
  },
  shopify: {
    name: "Shopify", icon: ShoppingBag, color: "bg-green-600",
    fields: [
      { key: "access_token", label: "Admin API Access Token", required: true },
    ],
    urlPlaceholder: "https://your-store.myshopify.com",
    description: "Import products, orders & customers from Shopify.",
    steps: [
      "Go to Shopify Admin → Settings → Apps → Develop apps.",
      "Create app, add scopes: read_products, read_orders, read_customers.",
      "Install app, copy Admin API access token below.",
    ],
  },
};

export default function ProductHubSettings() {
  const { tenantId, userId } = useTenant();
  const { isCompanyAdmin } = useUserRole();

  // Courier state
  const [courierConfigs, setCourierConfigs] = useState<Record<string, CourierConfig>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [savingCourier, setSavingCourier] = useState<string | null>(null);

  // Integration state
  const [integrations, setIntegrations] = useState<StoreIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [intDialogOpen, setIntDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<"woocommerce" | "shopify">("woocommerce");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [intForm, setIntForm] = useState<StoreIntegration>({
    platform: "woocommerce", store_name: "", store_url: "", credentials: {},
    is_enabled: false, sync_products: true, sync_orders: true, sync_customers: true,
    sync_categories: true, last_synced_at: null, sync_status: "idle", sync_error: null,
  });

  // ─── Courier Logic ───
  useEffect(() => {
    if (!tenantId) return;
    const fetchCourier = async () => {
      const { data } = await supabase.from("pdm_courier_configs").select("*").eq("tenant_id", tenantId);
      const map: Record<string, CourierConfig> = {};
      COURIER_TEMPLATES.forEach((t) => {
        const existing = data?.find((d: any) => d.courier_key === t.key);
        map[t.key] = existing ? {
          id: existing.id, courier_key: existing.courier_key, display_name: existing.display_name,
          is_enabled: existing.is_enabled, is_sandbox: existing.is_sandbox,
          credentials: existing.credentials as Record<string, string>,
          settings: existing.settings as Record<string, string>,
          last_tested_at: existing.last_tested_at, test_result: existing.test_result,
        } : {
          courier_key: t.key, display_name: t.name, is_enabled: false, is_sandbox: true,
          credentials: {}, settings: {}, last_tested_at: null, test_result: null,
        };
      });
      setCourierConfigs(map);
    };
    fetchCourier();
  }, [tenantId]);

  const updateCourierConfig = (key: string, updates: Partial<CourierConfig>) => {
    setCourierConfigs((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }));
  };
  const updateCred = (courierKey: string, fieldKey: string, value: string) => {
    setCourierConfigs((prev) => ({
      ...prev,
      [courierKey]: { ...prev[courierKey], credentials: { ...prev[courierKey].credentials, [fieldKey]: value } },
    }));
  };
  const handleSaveCourier = async (courierKey: string) => {
    const config = courierConfigs[courierKey];
    if (!config || !tenantId) return;
    setSavingCourier(courierKey);
    try {
      const payload = {
        tenant_id: tenantId, created_by: userId!, courier_key: courierKey,
        display_name: config.display_name, is_enabled: config.is_enabled,
        is_sandbox: config.is_sandbox, credentials: config.credentials, settings: config.settings,
      };
      if (config.id) {
        const { error } = await supabase.from("pdm_courier_configs").update(payload).eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("pdm_courier_configs").insert(payload).select().single();
        if (error) throw error;
        updateCourierConfig(courierKey, { id: data.id });
      }
      toast.success(`${config.display_name} saved`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingCourier(null); }
  };
  const handleTestCourier = async (courierKey: string) => {
    const config = courierConfigs[courierKey];
    if (!config) return;
    setTesting(courierKey);
    try {
      const { data, error } = await supabase.functions.invoke("pos-courier-test", {
        body: { courierKey, credentials: config.credentials, isSandbox: config.is_sandbox },
      });
      if (error) throw error;
      const result = data?.success ? "success" : "failed";
      updateCourierConfig(courierKey, { test_result: result, last_tested_at: new Date().toISOString() });
      if (config.id) await supabase.from("pdm_courier_configs").update({ test_result: result, last_tested_at: new Date().toISOString() }).eq("id", config.id);
      data?.success ? toast.success("Connection test passed!") : toast.error(data?.message || "Test failed");
    } catch (err: any) { toast.error(err.message); updateCourierConfig(courierKey, { test_result: "failed" }); }
    finally { setTesting(null); }
  };

  // ─── Integration Logic ───
  const fetchIntegrations = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("pdm_store_integrations").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setIntegrations(data as any[]);
  };
  const fetchSyncLogs = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("pdm_sync_logs").select("*").eq("tenant_id", tenantId).order("started_at", { ascending: false }).limit(20);
    if (data) setSyncLogs(data as any[]);
  };
  useEffect(() => { fetchIntegrations(); fetchSyncLogs(); }, [tenantId]);

  const openAddIntDialog = (platform: "woocommerce" | "shopify") => {
    setEditingPlatform(platform); setEditingId(null);
    setIntForm({ platform, store_name: "", store_url: "", credentials: {}, is_enabled: false, sync_products: true, sync_orders: true, sync_customers: true, sync_categories: true, last_synced_at: null, sync_status: "idle", sync_error: null });
    setIntDialogOpen(true);
  };
  const openEditIntDialog = (i: any) => {
    setEditingPlatform(i.platform); setEditingId(i.id); setIntForm({ ...i }); setIntDialogOpen(true);
  };
  const handleSaveIntegration = async () => {
    if (!intForm.store_name.trim() || !intForm.store_url.trim()) { toast.error("Store name and URL required"); return; }
    setSavingIntegration(true);
    try {
      const payload = { tenant_id: tenantId!, created_by: userId!, platform: intForm.platform, store_name: intForm.store_name, store_url: intForm.store_url, credentials: intForm.credentials, is_enabled: intForm.is_enabled, sync_products: intForm.sync_products, sync_orders: intForm.sync_orders, sync_customers: intForm.sync_customers, sync_categories: intForm.sync_categories };
      if (editingId) { const { error } = await supabase.from("pdm_store_integrations").update(payload).eq("id", editingId); if (error) throw error; toast.success("Updated"); }
      else { const { error } = await supabase.from("pdm_store_integrations").insert(payload); if (error) throw error; toast.success("Added"); }
      setIntDialogOpen(false); fetchIntegrations();
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingIntegration(false); }
  };
  const handleSync = async (integration: any) => {
    setSyncing(integration.id);
    try {
      const { data, error } = await supabase.functions.invoke("pos-store-sync", { body: { integrationId: integration.id, syncType: "full", tenantId } });
      if (error) throw error;
      data?.success ? toast.success(`Imported ${data.itemsSynced} items`) : toast.error(data?.error || "Failed");
      fetchIntegrations(); fetchSyncLogs();
    } catch (err: any) { toast.error(err.message); }
    finally { setSyncing(null); }
  };
  const handleDeleteInt = async (id: string) => {
    const { error } = await supabase.from("pdm_store_integrations").delete().eq("id", id);
    error ? toast.error(error.message) : (toast.success("Removed"), fetchIntegrations());
  };

  if (!isCompanyAdmin) {
    return <div className="text-center py-12 text-muted-foreground">You need Company Admin access to manage settings.</div>;
  }

  const intConfig = PLATFORM_CONFIGS[editingPlatform];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">POS Settings</h1>
        <p className="text-muted-foreground">Courier configuration & store integrations</p>
      </div>

      <Tabs defaultValue="couriers">
        <TabsList>
          <TabsTrigger value="couriers" className="gap-2"><Truck className="h-4 w-4" />Couriers</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Store className="h-4 w-4" />Integrations</TabsTrigger>
          <TabsTrigger value="sync-logs" className="gap-2"><Clock className="h-4 w-4" />Import History</TabsTrigger>
        </TabsList>

        {/* ─── Couriers Tab ─── */}
        <TabsContent value="couriers">
          <Tabs defaultValue="steadfast">
            <TabsList>
              {COURIER_TEMPLATES.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="gap-2">
                  <Truck className="h-4 w-4" />{t.name}
                  {courierConfigs[t.key]?.is_enabled && <Badge variant="default" className="text-[10px] px-1.5 py-0">ON</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
            {COURIER_TEMPLATES.map((template) => {
              const config = courierConfigs[template.key];
              if (!config) return null;
              return (
                <TabsContent key={template.key} value={template.key}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{template.name}</CardTitle>
                          <CardDescription>Configure {template.name} courier API</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2"><Label className="text-xs">Sandbox</Label><Switch checked={config.is_sandbox} onCheckedChange={(v) => updateCourierConfig(template.key, { is_sandbox: v })} /></div>
                          <div className="flex items-center gap-2"><Label className="text-xs">Enabled</Label><Switch checked={config.is_enabled} onCheckedChange={(v) => updateCourierConfig(template.key, { is_enabled: v })} /></div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant={config.is_sandbox ? "secondary" : "default"}>{config.is_sandbox ? "Sandbox" : "Live"}</Badge>
                        {config.test_result === "success" && <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>}
                        {config.test_result === "failed" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}
                      </div>
                      <div className="grid gap-4">
                        {template.fields.map((field) => (
                          <div key={field.key}>
                            <Label>{field.label} {field.required && "*"}</Label>
                            <div className="relative">
                              <Input type={showSecrets[`${template.key}_${field.key}`] ? "text" : "password"} value={config.credentials[field.key] || ""} onChange={(e) => updateCred(template.key, field.key, e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSecrets((p) => ({ ...p, [`${template.key}_${field.key}`]: !p[`${template.key}_${field.key}`] }))}>
                                {showSecrets[`${template.key}_${field.key}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button onClick={() => handleSaveCourier(template.key)} disabled={savingCourier === template.key}>
                          {savingCourier === template.key && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
                        </Button>
                        <Button variant="outline" onClick={() => handleTestCourier(template.key)} disabled={testing === template.key}>
                          {testing === template.key && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Test Connection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </TabsContent>

        {/* ─── Integrations Tab ─── */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => openAddIntDialog("woocommerce")} className="gap-2"><Store className="h-4 w-4" /><Plus className="h-3 w-3" />WooCommerce</Button>
            <Button variant="outline" onClick={() => openAddIntDialog("shopify")} className="gap-2"><ShoppingBag className="h-4 w-4" /><Plus className="h-3 w-3" />Shopify</Button>
          </div>
          {integrations.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No store integrations yet</p>
              <p className="text-sm">Connect a store to import products & orders</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((i: any) => {
                const pc = PLATFORM_CONFIGS[i.platform as keyof typeof PLATFORM_CONFIGS];
                const Icon = pc?.icon || Store;
                return (
                  <Card key={i.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-lg ${pc?.color || "bg-muted"} text-white`}><Icon className="h-5 w-5" /></div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{i.store_name}</h3>
                              <Badge variant={i.is_enabled ? "default" : "secondary"}>{i.is_enabled ? "Active" : "Disabled"}</Badge>
                              {i.sync_status === "success" && <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Imported</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{i.store_url}</p>
                            {i.last_synced_at && <p className="text-xs text-muted-foreground mt-1"><Clock className="h-3 w-3 inline mr-1" />Last: {format(new Date(i.last_synced_at), "MMM d, HH:mm")}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleSync(i)} disabled={syncing === i.id}>
                            {syncing === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditIntDialog(i)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteInt(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Sync Logs Tab ─── */}
        <TabsContent value="sync-logs">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Synced</TableHead><TableHead className="text-right">Failed</TableHead><TableHead>Duration</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{format(new Date(log.started_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell><Badge variant="outline">{log.sync_type}</Badge></TableCell>
                    <TableCell><Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge></TableCell>
                    <TableCell className="text-right">{log.items_synced}</TableCell>
                    <TableCell className="text-right">{log.items_failed}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.completed_at ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {syncLogs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No import history</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Integration Add/Edit Dialog */}
      <Dialog open={intDialogOpen} onOpenChange={setIntDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {intConfig && <intConfig.icon className="h-5 w-5" />}
              {editingId ? `Edit ${intConfig?.name}` : `Add ${intConfig?.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">{intConfig?.description}</p>
            {intConfig && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-full justify-start text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />How to get credentials
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded-md border bg-muted/50 p-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      {intConfig.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            <div><Label>Store Name *</Label><Input value={intForm.store_name} onChange={(e) => setIntForm({ ...intForm, store_name: e.target.value })} /></div>
            <div><Label>Store URL *</Label><Input value={intForm.store_url} onChange={(e) => setIntForm({ ...intForm, store_url: e.target.value })} placeholder={intConfig?.urlPlaceholder} /></div>
            {intConfig?.fields.map((f) => (
              <div key={f.key}>
                <Label>{f.label} *</Label>
                <Input type="password" value={intForm.credentials[f.key] || ""} onChange={(e) => setIntForm({ ...intForm, credentials: { ...intForm.credentials, [f.key]: e.target.value } })} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {(["sync_products", "sync_orders", "sync_customers", "sync_categories"] as const).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <Switch checked={intForm[k]} onCheckedChange={(v) => setIntForm({ ...intForm, [k]: v })} />
                  <Label className="text-sm capitalize">{k.replace("sync_", "")}</Label>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2"><Switch checked={intForm.is_enabled} onCheckedChange={(v) => setIntForm({ ...intForm, is_enabled: v })} /><Label>Enable Integration</Label></div>
            <Button onClick={handleSaveIntegration} disabled={savingIntegration}>
              {savingIntegration && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingId ? "Update" : "Add"} Integration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}