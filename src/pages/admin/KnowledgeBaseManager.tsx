import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, FileText, BookOpen, ShieldCheck, Package, RefreshCw, Search, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface KBDocument {
  id: string;
  title: string;
  content: string;
  doc_type: string;
  category_id: string | null;
  is_active: boolean;
  embedded_at: string | null;
  created_at: string;
}

interface KBCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

const DOC_TYPES = [
  { value: "product", label: "Product/Service", icon: Package },
  { value: "faq", label: "FAQ", icon: BookOpen },
  { value: "policy", label: "Policy", icon: ShieldCheck },
  { value: "general", label: "General", icon: FileText },
];

export default function KnowledgeBaseManager() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const [docs, setDocs] = useState<KBDocument[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editDoc, setEditDoc] = useState<Partial<KBDocument> | null>(null);
  const [saving, setSaving] = useState(false);
  const [embedding, setEmbedding] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    const [docsRes, catsRes] = await Promise.all([
      supabase.from("kb_documents").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("kb_categories").select("*").eq("tenant_id", tenantId).order("sort_order"),
    ]);
    if (docsRes.data) setDocs(docsRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    setLoading(false);
  };

  const saveDoc = async () => {
    if (!editDoc?.title || !editDoc?.content || !tenantId) return;
    setSaving(true);

    if (editDoc.id) {
      const { error } = await supabase.from("kb_documents").update({
        title: editDoc.title,
        content: editDoc.content,
        doc_type: editDoc.doc_type || "general",
        category_id: editDoc.category_id || null,
        is_active: editDoc.is_active ?? true,
      }).eq("id", editDoc.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Document updated");
    } else {
      const { error } = await supabase.from("kb_documents").insert({
        tenant_id: tenantId,
        title: editDoc.title,
        content: editDoc.content,
        doc_type: editDoc.doc_type || "general",
        category_id: editDoc.category_id || null,
        is_active: true,
        created_by: user?.id,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Document created");
    }

    setSaving(false);
    setEditDoc(null);
    loadData();
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document? This will also remove its embeddings.")) return;
    await supabase.from("kb_documents").delete().eq("id", id);
    toast.success("Document deleted");
    loadData();
  };

  const embedDoc = async (id: string) => {
    setEmbedding(id);
    try {
      const { data, error } = await supabase.functions.invoke("kb-embed", {
        body: { document_id: id, tenant_id: tenantId },
      });
      if (error) throw error;
      toast.success(`Embedded: ${data.chunks_created} chunks created`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Embedding failed");
    } finally {
      setEmbedding(null);
    }
  };

  const embedAll = async () => {
    const unembedded = docs.filter((d) => d.is_active && !d.embedded_at);
    if (unembedded.length === 0) { toast.info("All documents are already embedded"); return; }
    for (const doc of unembedded) {
      await embedDoc(doc.id);
    }
  };

  const filtered = docs.filter((d) => {
    if (filterType !== "all" && d.doc_type !== filterType) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add products, FAQs, policies — the AI agent uses this data to answer customer questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={embedAll} disabled={!!embedding}>
            <RefreshCw className={`h-4 w-4 mr-2 ${embedding ? "animate-spin" : ""}`} />
            Embed All
          </Button>
          <Dialog open={!!editDoc} onOpenChange={(v) => !v && setEditDoc(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditDoc({ doc_type: "general", is_active: true })}>
                <Plus className="h-4 w-4 mr-2" /> Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editDoc?.id ? "Edit Document" : "New Knowledge Base Document"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Document title"
                  value={editDoc?.title || ""}
                  onChange={(e) => setEditDoc((p) => ({ ...p, title: e.target.value }))}
                />
                <Select value={editDoc?.doc_type || "general"} onValueChange={(v) => setEditDoc((p) => ({ ...p, doc_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Document content — write everything the AI should know about this topic..."
                  value={editDoc?.content || ""}
                  onChange={(e) => setEditDoc((p) => ({ ...p, content: e.target.value }))}
                  rows={12}
                  className="font-mono text-sm"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editDoc?.is_active ?? true}
                    onCheckedChange={(v) => setEditDoc((p) => ({ ...p, is_active: v }))}
                  />
                  <span className="text-sm text-muted-foreground">Active (included in AI responses)</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveDoc} disabled={saving || !editDoc?.title || !editDoc?.content}>
                    {saving ? "Saving..." : editDoc?.id ? "Update" : "Create"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditDoc(null)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DOC_TYPES.map((t) => {
          const count = docs.filter((d) => d.doc_type === t.value).length;
          const Icon = t.icon;
          return (
            <div key={t.value} className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Documents */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No documents yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add products, FAQs, or policies for your AI agent</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div key={doc.id} className={`border rounded-xl p-4 transition-colors ${doc.is_active ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type}
                    </span>
                    {doc.embedded_at ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Embedded
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" /> Not embedded
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-foreground truncate">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{doc.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => embedDoc(doc.id)} disabled={embedding === doc.id}>
                    <RefreshCw className={`h-3.5 w-3.5 ${embedding === doc.id ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditDoc(doc)}>Edit</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
