import { useState, useEffect } from "react";
import { PenTool, Plus, Clock, CheckCircle, AlertCircle, Pencil, Trash2, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface ESignature {
  id: string;
  document_title: string;
  document_url: string | null;
  status: string;
  signer_name: string;
  signer_email: string;
  signed_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-warning bg-warning/10", label: "Pending" },
  sent: { icon: Send, color: "text-primary bg-primary/10", label: "Sent" },
  signed: { icon: CheckCircle, color: "text-success bg-success/10", label: "Signed" },
  expired: { icon: AlertCircle, color: "text-destructive bg-destructive/10", label: "Expired" },
  declined: { icon: AlertCircle, color: "text-destructive bg-destructive/10", label: "Declined" },
};

export default function ESignatures() {
  const { profile, user } = useAuth();
  const [signatures, setSignatures] = useState<ESignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    document_title: "", signer_name: "", signer_email: "", expires_at: "", notes: "",
  });

  const tenantId = profile?.tenant_id;

  const fetchData = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("e_signatures" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setSignatures((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const resetForm = () => {
    setForm({ document_title: "", signer_name: "", signer_email: "", expires_at: "", notes: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.document_title || !form.signer_name || !form.signer_email) {
      toast.error("Document title, signer name and email are required");
      return;
    }
    if (!tenantId || !user?.id) return;

    const payload: any = {
      document_title: form.document_title,
      signer_name: form.signer_name,
      signer_email: form.signer_email,
      notes: form.notes || null,
      expires_at: form.expires_at || null,
      tenant_id: tenantId,
      created_by: user.id,
    };

    if (editingId) {
      const { error } = await supabase.from("e_signatures" as any).update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Updated"); resetForm(); fetchData(); }
    } else {
      payload.status = "pending";
      const { error } = await supabase.from("e_signatures" as any).insert(payload);
      if (error) toast.error(error.message);
      else { toast.success("Signature request created"); resetForm(); fetchData(); }
    }
  };

  const startEdit = (s: ESignature) => {
    setForm({
      document_title: s.document_title,
      signer_name: s.signer_name,
      signer_email: s.signer_email,
      expires_at: s.expires_at?.slice(0, 10) || "",
      notes: s.notes || "",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const deleteSignature = async (id: string) => {
    if (!confirm("Delete this signature request?")) return;
    const { error } = await supabase.from("e_signatures" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchData(); }
  };

  const markAsSigned = async (id: string) => {
    const { error } = await supabase.from("e_signatures" as any).update({ status: "signed", signed_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Marked as signed"); fetchData(); }
  };

  const sendForSigning = async (id: string) => {
    const { error } = await supabase.from("e_signatures" as any).update({ status: "sent" } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Sent for signing"); fetchData(); }
  };

  const filtered = signatures.filter(s => filter === "all" || s.status === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <PenTool className="h-6 w-6 text-primary" /> E-Signatures
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Send, track, and manage document signatures</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {["all", "pending", "sent", "signed", "expired"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`p-3 rounded-xl border text-center transition-colors ${filter === s ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
            <p className="text-2xl font-bold text-foreground">{s === "all" ? signatures.length : signatures.filter(x => x.status === s).length}</p>
            <p className="text-xs text-muted-foreground capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editingId ? "Edit Request" : "New Signature Request"}</p>
            <button onClick={resetForm} className="p-1 rounded-md hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Document Title *" value={form.document_title} onChange={e => setForm(p => ({ ...p, document_title: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Signer Name *" value={form.signer_name} onChange={e => setForm(p => ({ ...p, signer_name: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="email" placeholder="Signer Email *" value={form.signer_email} onChange={e => setForm(p => ({ ...p, signer_email: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="date" placeholder="Expires At" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" rows={2} />
          </div>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            {editingId ? "Update" : "Create"} Request
          </button>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <PenTool className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No signature requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={s.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${cfg.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{s.document_title}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{s.signer_name} ({s.signer_email})</span>
                        <span>Created {format(new Date(s.created_at), "MMM d, yyyy")}</span>
                        {s.signed_at && <span className="text-success">Signed {format(new Date(s.signed_at), "MMM d, yyyy")}</span>}
                        {s.expires_at && <span>Expires {format(new Date(s.expires_at), "MMM d, yyyy")}</span>}
                      </div>
                      {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.status === "pending" && (
                      <button onClick={() => sendForSigning(s.id)} className="px-2 py-1 text-[10px] font-medium rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1">
                        <Send className="h-3 w-3" /> Send
                      </button>
                    )}
                    {(s.status === "pending" || s.status === "sent") && (
                      <button onClick={() => markAsSigned(s.id)} className="px-2 py-1 text-[10px] font-medium rounded bg-success/10 text-success hover:bg-success/20">Signed</button>
                    )}
                    <button onClick={() => startEdit(s)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteSignature(s.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
