import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, RefreshCw, Plus, CheckCircle, XCircle, Loader2, Store, ShoppingBag, Clock, Trash2, ExternalLink, HelpCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format } from "date-fns";

interface StoreIntegration {
  id?: string;
  platform: string;
  store_name: string;
  store_url: string;
  credentials: Record<string, string>;
  is_enabled: boolean;
  sync_products: boolean;
  sync_orders: boolean;
  sync_customers: boolean;
  sync_categories: boolean;
  last_synced_at: string | null;
  sync_status: string;
  sync_error: string | null;
}

interface SyncLog {
  id: string;
  sync_type: string;
  direction: string;
  status: string;
  items_synced: number;
  items_failed: number;
  started_at: string;
  completed_at: string | null;
  integration_id: string;
}

const PLATFORM_CONFIGS = {
  woocommerce: {
    name: "WooCommerce",
    icon: Store,
    color: "bg-purple-600",
    fields: [
      { key: "consumer_key", label: "Consumer Key", required: true },
      { key: "consumer_secret", label: "Consumer Secret", required: true },
    ],
    urlPlaceholder: "https://your-store.com",
    description: "Import products, orders & customers from your WooCommerce store into POS.",
    docUrl: "https://woocommerce.com/document/woocommerce-rest-api/",
    steps: [
      "Go to your WordPress admin panel → WooCommerce → Settings → Advanced → REST API.",
      "Click \"Add key\". Enter a description (e.g. \"POS\").",
      "Set Permissions to \"Read\" (we only import data).",
      "Click \"Generate API key\".",
      "Copy the Consumer Key and Consumer Secret and paste them below.",
    ],
  },
  shopify: {
    name: "Shopify",
    icon: ShoppingBag,
    color: "bg-green-600",
    fields: [
      { key: "access_token", label: "Admin API Access Token", required: true },
    ],
    urlPlaceholder: "https://your-store.myshopify.com",
    description: "Import products, orders & customers from your Shopify store into POS.",
    docUrl: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
    steps: [
      "Go to your Shopify Admin → Settings → Apps and sales channels → Develop apps.",
      "Click \"Create an app\" and give it a name (e.g. \"POS\").",
      "Under \"Configuration\", add API scopes: read_products, read_orders, read_customers.",
      "Click \"Install app\" and confirm.",
      "Copy the Admin API access token (shown only once) and paste it below.",
    ],
  },
};

export default function ProductHubIntegrations() {
  const { tenantId, userId } = useTenant();
  const { isCompanyAdmin } = useUserRole();
  const [integrations, setIntegrations] = useState<StoreIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<"woocommerce" | "shopify">("woocommerce");
  const [form, setForm] = useState<StoreIntegration>({
    platform: "woocommerce",
    store_name: "",
    store_url: "",
    credentials: {},
    is_enabled: false,
    sync_products: true,
    sync_orders: true,
    sync_customers: true,
    sync_categories: true,
    last_synced_at: null,
    sync_status: "idle",
    sync_error: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("pdm_store_integrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (data) setIntegrations(data as any[]);
  };

  const fetchSyncLogs = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("pdm_sync_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (data) setSyncLogs(data as any[]);
  };

  useEffect(() => {
    fetchIntegrations();
    fetchSyncLogs();
  }, [tenantId]);

  const openAddDialog = (platform: "woocommerce" | "shopify") => {
    setEditingPlatform(platform);
    setEditingId(null);
    setForm({
      platform,
      store_name: "",
      store_url: "",
      credentials: {},
      is_enabled: false,
      sync_products: true,
      sync_orders: true,
      sync_customers: true,
      sync_categories: true,
      last_synced_at: null,
      sync_status: "idle",
      sync_error: null,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (integration: StoreIntegration & { id: string }) => {
    setEditingPlatform(integration.platform as "woocommerce" | "shopify");
    setEditingId(integration.id);
    setForm({ ...integration });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.store_name.trim() || !form.store_url.trim()) {
      toast.error("Store name and URL are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId!,
        created_by: userId!,
        platform: form.platform,
        store_name: form.store_name,
        store_url: form.store_url,
        credentials: form.credentials,
        is_enabled: form.is_enabled,
        sync_products: form.sync_products,
        sync_orders: form.sync_orders,
        sync_customers: form.sync_customers,
        sync_categories: form.sync_categories,
      };
      if (editingId) {
        const { error } = await supabase.from("pdm_store_integrations").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Integration updated");
      } else {
        const { error } = await supabase.from("pdm_store_integrations").insert(payload);
        if (error) throw error;
        toast.success("Integration added");
      }
      setDialogOpen(false);
      fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (integration: StoreIntegration & { id: string }, syncType = "full") => {
    setSyncing(integration.id);
    try {
      const { data, error } = await supabase.functions.invoke("pos-store-sync", {
        body: { integrationId: integration.id, syncType, tenantId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Imported ${data.itemsSynced} items${data.itemsFailed > 0 ? `, ${data.itemsFailed} failed` : ""}`);
      } else {
        toast.error(data?.error || "Import failed");
      }
      fetchIntegrations();
      fetchSyncLogs();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pdm_store_integrations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Integration removed"); fetchIntegrations(); }
  };

  const toggleEnabled = async (integration: StoreIntegration & { id: string }) => {
    await supabase.from("pdm_store_integrations").update({ is_enabled: !integration.is_enabled }).eq("id", integration.id);
    fetchIntegrations();
  };

  if (!isCompanyAdmin) {
    return <div className="text-center py-12 text-muted-foreground">You need Company Admin access to manage store integrations.</div>;
  }

  const config = PLATFORM_CONFIGS[editingPlatform];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Integrations</h1>
          <p className="text-muted-foreground">Import products & orders from your eCommerce stores into POS</p>
        </div>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Connected Stores</TabsTrigger>
          <TabsTrigger value="sync-logs">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {/* Add new buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => openAddDialog("woocommerce")} className="gap-2">
              <Store className="h-4 w-4" /> <Plus className="h-3 w-3" /> Import from WooCommerce
            </Button>
            <Button variant="outline" onClick={() => openAddDialog("shopify")} className="gap-2">
              <ShoppingBag className="h-4 w-4" /> <Plus className="h-3 w-3" /> Import from Shopify
            </Button>
          </div>

          {/* Integration cards */}
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium">No store integrations yet</p>
                <p className="text-sm">Connect a WooCommerce or Shopify store to import products & orders</p>
              </CardContent>
            </Card>
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
                          <div className={`p-2.5 rounded-lg ${pc?.color || "bg-muted"} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{i.store_name}</h3>
                              <Badge variant={i.is_enabled ? "default" : "secondary"}>
                                {i.is_enabled ? "Active" : "Disabled"}
                              </Badge>
                              {i.sync_status === "success" && <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Imported</Badge>}
                              {i.sync_status === "failed" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}
                              {i.sync_status === "syncing" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Importing</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{i.store_url}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {i.sync_products && <Badge variant="outline" className="text-xs">Products</Badge>}
                              {i.sync_orders && <Badge variant="outline" className="text-xs">Orders</Badge>}
                              {i.sync_customers && <Badge variant="outline" className="text-xs">Customers</Badge>}
                              {i.sync_categories && <Badge variant="outline" className="text-xs">Categories</Badge>}
                            </div>
                            {i.last_synced_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                Last imported: {format(new Date(i.last_synced_at), "MMM d, yyyy HH:mm")}
                              </p>
                            )}
                            {i.sync_error && <p className="text-xs text-destructive mt-1">{i.sync_error}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={i.is_enabled} onCheckedChange={() => toggleEnabled(i)} />
                          <Button size="sm" variant="outline" onClick={() => handleSync(i)} disabled={syncing === i.id}>
                            {syncing === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(i)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(i.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sync-logs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Date</TableHead>
                     <TableHead>Type</TableHead>
                     <TableHead>Direction</TableHead>
                     <TableHead>Status</TableHead>
                    <TableHead className="text-right">Synced</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{format(new Date(log.started_at), "MMM d, HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline">{log.sync_type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">Import</Badge></TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{log.items_synced}</TableCell>
                      <TableCell className="text-right">{log.items_failed}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.completed_at ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {syncLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No import history yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {config && <config.icon className="h-5 w-5" />}
              {editingId ? `Edit ${config?.name} Store` : `Add ${config?.name} Store`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">{config?.description}</p>
            {config && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-full justify-start text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />
                    How to get your API credentials
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded-md border bg-muted/50 p-4 space-y-3">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      {config.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                    <a
                      href={config.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Read official {config.name} documentation
                    </a>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            <div>
              <Label>Store Name *</Label>
              <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="My Store" />
            </div>
            <div>
              <Label>Store URL *</Label>
              <Input value={form.store_url} onChange={(e) => setForm({ ...form, store_url: e.target.value })} placeholder={config?.urlPlaceholder} />
            </div>
            {config?.fields.map((field) => (
              <div key={field.key}>
                <Label>{field.label} {field.required && "*"}</Label>
                <div className="relative">
                  <Input
                    type={showSecrets[field.key] ? "text" : "password"}
                    value={form.credentials[field.key] || ""}
                    onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, [field.key]: e.target.value } })}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSecrets((p) => ({ ...p, [field.key]: !p[field.key] }))}
                  >
                    {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="text-sm">Import Products</Label>
                <Switch checked={form.sync_products} onCheckedChange={(v) => setForm({ ...form, sync_products: v })} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="text-sm">Import Orders</Label>
                <Switch checked={form.sync_orders} onCheckedChange={(v) => setForm({ ...form, sync_orders: v })} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="text-sm">Import Customers</Label>
                <Switch checked={form.sync_customers} onCheckedChange={(v) => setForm({ ...form, sync_customers: v })} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="text-sm">Import Categories</Label>
                <Switch checked={form.sync_categories} onCheckedChange={(v) => setForm({ ...form, sync_categories: v })} />
              </div>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="text-sm">Enable Integration</Label>
              <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Update" : "Add"} Integration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
