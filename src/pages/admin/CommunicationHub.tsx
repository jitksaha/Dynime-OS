import { useState, useEffect } from "react";
import { Mail, MessageSquare, Plus, Send, Loader2, Trash2, Phone, Edit2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  category: string;
  channel: string;
  subject: string | null;
  body: string;
  is_active: boolean;
}

const CATEGORIES = ["Welcome", "Onboarding", "Alert", "Reminder", "General"];

export default function CommunicationHub() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formChannel, setFormChannel] = useState("email");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");

  const tenantId = profile?.tenant_id;

  const fetchTemplates = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("communication_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [tenantId]);

  const resetForm = () => {
    setFormName("");
    setFormCategory("General");
    setFormChannel("email");
    setFormSubject("");
    setFormBody("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formBody.trim() || !tenantId || !user) return;

    if (editingId) {
      const { error } = await supabase
        .from("communication_templates")
        .update({ name: formName, category: formCategory, channel: formChannel, subject: formSubject || null, body: formBody })
        .eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Template updated");
    } else {
      const { error } = await supabase
        .from("communication_templates")
        .insert({ name: formName, category: formCategory, channel: formChannel, subject: formSubject || null, body: formBody, tenant_id: tenantId, created_by: user.id });
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Template created");
    }
    resetForm();
    fetchTemplates();
  };

  const handleEdit = (t: Template) => {
    setFormName(t.name);
    setFormCategory(t.category);
    setFormChannel(t.channel);
    setFormSubject(t.subject || "");
    setFormBody(t.body);
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("communication_templates").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Template deleted");
    fetchTemplates();
  };

  const openSendDialog = (templateId: string) => {
    setSendTemplateId(templateId);
    setRecipient("");
    setShowSendForm(true);
  };

  const handleSendNotification = async () => {
    if (!sendTemplateId || !recipient.trim() || !tenantId || !user) return;
    setSending(true);

    const template = templates.find(t => t.id === sendTemplateId);
    if (!template) { setSending(false); return; }

    if (template.channel === "sms") {
      // Trigger native SMS app with pre-filled message
      const smsBody = encodeURIComponent(template.body);
      const smsUrl = `sms:${recipient}?body=${smsBody}`;
      window.open(smsUrl, "_self");

      // Log it
      await supabase.from("communication_logs").insert({
        tenant_id: tenantId,
        template_id: template.id,
        channel: "sms",
        recipient,
        subject: template.subject,
        body: template.body,
        status: "triggered",
        sent_by: user.id,
      });

      toast.success("SMS app opened with pre-filled message");
    } else {
      // Email – log and show mailto fallback
      const mailSubject = encodeURIComponent(template.subject || template.name);
      const mailBody = encodeURIComponent(template.body);
      window.open(`mailto:${recipient}?subject=${mailSubject}&body=${mailBody}`, "_self");

      await supabase.from("communication_logs").insert({
        tenant_id: tenantId,
        template_id: template.id,
        channel: "email",
        recipient,
        subject: template.subject,
        body: template.body,
        status: "triggered",
        sent_by: user.id,
      });

      toast.success("Email client opened");
    }

    setSending(false);
    setShowSendForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Communication Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage email & SMS templates and send one-tap notifications</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity self-start"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit Template" : "New Template"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Template Name</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Welcome Email" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Category</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Channel</label>
              <select value={formChannel} onChange={e => setFormChannel(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            {formChannel === "email" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Subject Line</label>
                <input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="Welcome to {{company}}" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Body</label>
            <textarea value={formBody} onChange={e => setFormBody(e.target.value)} placeholder="Hi {{name}}, welcome to our platform..." rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!formName.trim() || !formBody.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
              {editingId ? "Update" : "Create"} Template
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showSendForm && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> One-Tap Notify
          </h2>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {templates.find(t => t.id === sendTemplateId)?.channel === "sms" ? "Phone Number" : "Email Address"}
            </label>
            <input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder={templates.find(t => t.id === sendTemplateId)?.channel === "sms" ? "+880XXXXXXXXXX" : "user@example.com"}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSendNotification} disabled={!recipient.trim() || sending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Now
            </button>
            <button onClick={() => setShowSendForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 && !showForm ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No templates yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first email or SMS template to start notifying users</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${t.channel === "sms" ? "bg-success/10" : "bg-info/10"}`}>
                    {t.channel === "sms" ? <Phone className="h-3.5 w-3.5 text-success" /> : <Mail className="h-3.5 w-3.5 text-info" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.category} · {t.channel}</p>
                  </div>
                </div>
              </div>
              {t.subject && <p className="text-xs text-muted-foreground truncate">Subject: {t.subject}</p>}
              <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <button onClick={() => openSendDialog(t.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  <Send className="h-3 w-3" /> Send
                </button>
                <button onClick={() => handleEdit(t)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors">
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => handleDelete(t.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
