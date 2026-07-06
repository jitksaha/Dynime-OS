import { useState, useEffect } from "react";
import { BookOpen, Plus, Search, Eye, ThumbsUp, Pencil, Trash2, X, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  status: string;
  is_public: boolean;
  views_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
};

const CATEGORIES = ["general", "getting-started", "faq", "troubleshooting", "guides", "api", "billing", "security"];

export default function KnowledgeBase() {
  const { profile, user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({
    title: "", content: "", category: "general", tags: "", status: "draft", is_public: false,
  });

  const tenantId = profile?.tenant_id;

  const fetchArticles = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("knowledge_articles" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setArticles((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [tenantId]);

  const resetForm = () => {
    setForm({ title: "", content: "", category: "general", tags: "", status: "draft", is_public: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content) {
      toast.error("Title and content are required");
      return;
    }
    if (!tenantId || !user?.id) return;

    const payload: any = {
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      status: form.status,
      is_public: form.is_public,
      tenant_id: tenantId,
      created_by: user.id,
    };

    if (editingId) {
      const { error } = await supabase.from("knowledge_articles" as any).update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Article updated"); resetForm(); fetchArticles(); }
    } else {
      payload.sort_order = articles.length;
      const { error } = await supabase.from("knowledge_articles" as any).insert(payload);
      if (error) toast.error(error.message);
      else { toast.success("Article created"); resetForm(); fetchArticles(); }
    }
  };

  const startEdit = (a: Article) => {
    setForm({
      title: a.title,
      content: a.content,
      category: a.category,
      tags: a.tags?.join(", ") || "",
      status: a.status,
      is_public: a.is_public,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("knowledge_articles" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchArticles(); }
  };

  const togglePublish = async (a: Article) => {
    const newStatus = a.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("knowledge_articles" as any).update({ status: newStatus } as any).eq("id", a.id);
    if (error) toast.error(error.message);
    else fetchArticles();
  };

  const filtered = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || a.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage self-service documentation</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New Article
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{articles.length}</p>
          <p className="text-xs text-muted-foreground">Total Articles</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-success">{articles.filter(a => a.status === "published").length}</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{articles.reduce((sum, a) => sum + a.views_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Views</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{articles.filter(a => a.is_public).length}</p>
          <p className="text-xs text-muted-foreground">Public</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g, " ").replace(/\b\w/g, ch => ch.toUpperCase())}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editingId ? "Edit Article" : "New Article"}</p>
            <button onClick={resetForm} className="p-1 rounded-md hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g, " ").replace(/\b\w/g, ch => ch.toUpperCase())}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <input placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} className="rounded" />
              Make publicly accessible
            </label>
            <textarea placeholder="Content (supports markdown) *" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2 font-mono" rows={8} />
          </div>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            {editingId ? "Update" : "Create"} Article
          </button>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No articles found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || "bg-secondary"}`}>{a.status}</span>
                    {a.is_public ? <Globe className="h-3 w-3 text-success" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{a.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content.slice(0, 150)}...</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{a.views_count} views</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{a.helpful_count} helpful</span>
                    {a.tags?.length > 0 && <span>{a.tags.map(t => `#${t}`).join(" ")}</span>}
                    <span>Updated {format(new Date(a.updated_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePublish(a)} className={`px-2 py-1 text-[10px] font-medium rounded ${a.status === "published" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                    {a.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => startEdit(a)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteArticle(a.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
