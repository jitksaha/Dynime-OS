// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Instagram,
  Facebook,
  MessageCircle,
  Twitter,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";

type Platform = "instagram" | "facebook" | "whatsapp" | "twitter" | "messenger";

interface ChannelCredential {
  id: string;
  tenant_id: string;
  platform: Platform;
  display_name: string | null;
  app_id: string | null;
  page_id: string | null;
  page_access_token: string | null;
  business_account_id: string | null;
  phone_number_id: string | null;
  verify_token: string | null;
  bearer_token: string | null;
  api_key: string | null;
  api_secret: string | null;
  access_token: string | null;
  access_token_secret: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  verification_status: string | null;
  last_verified_at: string | null;
  verification_error: string | null;
}

const PLATFORM_META: Record<Platform, {
  label: string;
  icon: any;
  color: string;
  fields: Array<{ key: keyof ChannelCredential; label: string; secret?: boolean; help?: string }>;
  setupGuide: string;
}> = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "from-pink-500 to-purple-500",
    fields: [
      { key: "app_id", label: "Meta App ID", help: "From developers.facebook.com → My Apps" },
      { key: "app_secret", label: "Meta App Secret", secret: true },
      { key: "business_account_id", label: "Instagram Business Account ID" },
      { key: "page_access_token", label: "Page Access Token", secret: true, help: "Long-lived token from Graph API Explorer" },
      { key: "verify_token", label: "Webhook Verify Token", help: "Any random string you choose — used to verify webhook setup" },
    ],
    setupGuide: "https://developers.facebook.com/docs/instagram-api/getting-started",
  },
  facebook: {
    label: "Facebook Page",
    icon: Facebook,
    color: "from-blue-500 to-blue-700",
    fields: [
      { key: "app_id", label: "Meta App ID" },
      { key: "app_secret", label: "Meta App Secret", secret: true },
      { key: "page_id", label: "Facebook Page ID" },
      { key: "page_access_token", label: "Page Access Token", secret: true },
      { key: "verify_token", label: "Webhook Verify Token" },
    ],
    setupGuide: "https://developers.facebook.com/docs/messenger-platform/getting-started",
  },
  messenger: {
    label: "Messenger",
    icon: MessageCircle,
    color: "from-blue-400 to-indigo-500",
    fields: [
      { key: "app_id", label: "Meta App ID" },
      { key: "app_secret", label: "Meta App Secret", secret: true },
      { key: "page_id", label: "Facebook Page ID" },
      { key: "page_access_token", label: "Page Access Token", secret: true },
      { key: "verify_token", label: "Webhook Verify Token" },
    ],
    setupGuide: "https://developers.facebook.com/docs/messenger-platform/getting-started",
  },
  whatsapp: {
    label: "WhatsApp Business",
    icon: MessageCircle,
    color: "from-green-500 to-emerald-600",
    fields: [
      { key: "business_account_id", label: "WhatsApp Business Account ID" },
      { key: "phone_number_id", label: "Phone Number ID" },
      { key: "page_access_token", label: "Permanent Access Token", secret: true },
      { key: "verify_token", label: "Webhook Verify Token" },
      { key: "app_secret", label: "App Secret (for webhook signing)", secret: true },
    ],
    setupGuide: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
  },
  twitter: {
    label: "X / Twitter",
    icon: Twitter,
    color: "from-slate-700 to-slate-900",
    fields: [
      { key: "api_key", label: "API Key (Consumer Key)" },
      { key: "api_secret", label: "API Secret (Consumer Secret)", secret: true },
      { key: "access_token", label: "Access Token", secret: true },
      { key: "access_token_secret", label: "Access Token Secret", secret: true },
      { key: "bearer_token", label: "Bearer Token", secret: true },
    ],
    setupGuide: "https://developer.x.com/en/portal/dashboard",
  },
};

export default function SocialChannels() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [credentials, setCredentials] = useState<ChannelCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ platform: Platform; cred?: ChannelCredential } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Partial<ChannelCredential>>({});
  const [saving, setSaving] = useState(false);

  const supabaseProjectRef = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID || "";
  const webhookBase = supabaseProjectRef
    ? `https://${supabaseProjectRef}.supabase.co/functions/v1`
    : "https://YOUR-PROJECT.supabase.co/functions/v1";

  useEffect(() => {
    if (tenantId) load();
  }, [tenantId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("social_channel_credentials")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setCredentials((data as any) || []);
    setLoading(false);
  };

  const openNew = (platform: Platform) => {
    setEditing({ platform });
    setForm({ platform, is_active: true, display_name: PLATFORM_META[platform].label });
  };

  const openEdit = (cred: ChannelCredential) => {
    setEditing({ platform: cred.platform, cred });
    setForm(cred);
  };

  const close = () => {
    setEditing(null);
    setForm({});
  };

  const save = async () => {
    if (!tenantId || !editing) return;
    setSaving(true);
    const payload: any = {
      ...form,
      tenant_id: tenantId,
      platform: editing.platform,
    };

    let error;
    if (editing.cred) {
      ({ error } = await supabase
        .from("social_channel_credentials")
        .update(payload)
        .eq("id", editing.cred.id));
    } else {
      payload.created_by = profile?.user_id;
      ({ error } = await supabase.from("social_channel_credentials").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing.cred ? "Channel updated" : "Channel connected");
    close();
    load();
  };

  const toggleActive = async (cred: ChannelCredential) => {
    const { error } = await supabase
      .from("social_channel_credentials")
      .update({ is_active: !cred.is_active })
      .eq("id", cred.id);
    if (error) return toast.error(error.message);
    toast.success(cred.is_active ? "Disabled" : "Enabled");
    load();
  };

  const remove = async (cred: ChannelCredential) => {
    if (!confirm(`Remove this ${PLATFORM_META[cred.platform].label} connection?`)) return;
    const { error } = await supabase
      .from("social_channel_credentials")
      .delete()
      .eq("id", cred.id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const copyWebhookUrl = (platform: Platform) => {
    const url = `${webhookBase}/${platform === "whatsapp" ? "whatsapp-webhook" : "meta-webhook"}?tenant_id=${tenantId}`;
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied");
  };

  const statusBadge = (cred: ChannelCredential) => {
    if (!cred.is_active) {
      return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />Disabled</Badge>;
    }
    switch (cred.verification_status) {
      case "verified":
        return <Badge className="gap-1 bg-green-500/10 text-green-700 hover:bg-green-500/15"><CheckCircle2 className="h-3 w-3" />Verified</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Social Channels</h1>
        <p className="text-sm text-muted-foreground">
          Connect your social media accounts so the AI agent can read incoming messages and reply on your behalf.
        </p>
      </div>

      {/* Connect new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connect a new channel</CardTitle>
          <CardDescription>
            You'll need credentials from each platform's developer portal. Each company manages its own tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
              const meta = PLATFORM_META[p];
              const Icon = meta.icon;
              return (
                <button
                  key={p}
                  onClick={() => openNew(p)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors`}
                >
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connected channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected channels ({credentials.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {credentials.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No channels connected yet. Pick one above to get started.
            </p>
          )}
          {credentials.map((cred) => {
            const meta = PLATFORM_META[cred.platform];
            const Icon = meta.icon;
            return (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{cred.display_name || meta.label}</span>
                      {statusBadge(cred)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {cred.page_id && `Page ${cred.page_id}`}
                      {cred.phone_number_id && `Phone ${cred.phone_number_id}`}
                      {cred.business_account_id && !cred.page_id && !cred.phone_number_id && `Business ${cred.business_account_id}`}
                      {cred.last_verified_at && ` · Verified ${new Date(cred.last_verified_at).toLocaleDateString()}`}
                    </p>
                    {cred.verification_error && (
                      <p className="text-xs text-destructive truncate mt-0.5">{cred.verification_error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => copyWebhookUrl(cred.platform)} title="Copy webhook URL">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Switch checked={cred.is_active} onCheckedChange={() => toggleActive(cred)} />
                  <Button variant="ghost" size="sm" onClick={() => openEdit(cred)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(cred)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = PLATFORM_META[editing.platform].icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {editing.cred ? "Edit" : "Connect"} {PLATFORM_META[editing.platform].label}
                </DialogTitle>
                <DialogDescription>
                  Need credentials?{" "}
                  <a
                    href={PLATFORM_META[editing.platform].setupGuide}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Setup guide <ExternalLink className="h-3 w-3" />
                  </a>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Display name</Label>
                  <Input
                    value={form.display_name || ""}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    placeholder="e.g. Main Instagram"
                  />
                </div>

                {PLATFORM_META[editing.platform].fields.map((f) => {
                  const fieldKey = f.key as string;
                  const isShown = showSecrets[fieldKey];
                  return (
                    <div key={fieldKey} className="space-y-1.5">
                      <Label className="flex items-center justify-between">
                        <span>{f.label}</span>
                        {f.secret && (
                          <button
                            type="button"
                            onClick={() => setShowSecrets((s) => ({ ...s, [fieldKey]: !isShown }))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </Label>
                      <Input
                        type={f.secret && !isShown ? "password" : "text"}
                        value={(form as any)[fieldKey] || ""}
                        onChange={(e) => setForm({ ...form, [fieldKey]: e.target.value })}
                        placeholder={f.help}
                      />
                      {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                    </div>
                  );
                })}

                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Webhook URL — paste this into the platform's webhook settings</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${webhookBase}/${editing.platform === "whatsapp" ? "whatsapp-webhook" : "meta-webhook"}?tenant_id=${tenantId}`}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyWebhookUrl(editing.platform)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Receive messages from this channel</p>
                  </div>
                  <Switch
                    checked={form.is_active ?? true}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : editing.cred ? "Save changes" : "Connect"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
