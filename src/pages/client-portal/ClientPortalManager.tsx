import { useState, useEffect, useCallback } from "react";
import { Globe, Plus, FileText, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

export default function ClientPortalManager() {
  const { tenantId, userId } = useTenant();
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "" });

  const fetchPages = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("client_portal_pages" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order");
    setPages((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const savePage = async () => {
    if (!form.title || !tenantId) return;
    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-");

    if (editingId) {
      const { error } = await supabase.from("client_portal_pages" as any)
        .update({ title: form.title, slug, content: form.content } as any)
        .eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Page updated");
    } else {
      const { error } = await supabase.from("client_portal_pages" as any)
        .insert({ title: form.title, slug, content: form.content, tenant_id: tenantId, created_by: userId, sort_order: pages.length } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Page created");
    }
    setForm({ title: "", slug: "", content: "" });
    setEditingId(null);
    setShowForm(false);
    fetchPages();
  };

  const togglePublish = async (page: PortalPage) => {
    await supabase.from("client_portal_pages" as any).update({ is_published: !page.is_published } as any).eq("id", page.id);
    fetchPages();
  };

  const deletePage = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    await supabase.from("client_portal_pages" as any).delete().eq("id", id);
    toast.success("Deleted");
    fetchPages();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Globe className="h-6 w-6 text-primary" /> Client Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage branded self-service pages for your clients</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: "", slug: "", content: "" }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Page
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{pages.length}</p>
          <p className="text-xs text-muted-foreground">Total Pages</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-success">{pages.filter(p => p.is_published).length}</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-muted-foreground">{pages.filter(p => !p.is_published).length}</p>
          <p className="text-xs text-muted-foreground">Drafts</p>
        </div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">{editingId ? "Edit Page" : "New Portal Page"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Page Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input placeholder="URL slug (auto-generated)" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>
          <textarea placeholder="Page content..." value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            className="w-full h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none" />
          <div className="flex gap-2">
            <button onClick={savePage} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Save</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80">Cancel</button>
          </div>
        </div>
      )}

      {pages.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No portal pages yet. Create your first page to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map(page => (
            <div key={page.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <FileText className={`h-5 w-5 shrink-0 ${page.is_published ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{page.title}</p>
                <p className="text-xs text-muted-foreground">/{page.slug}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => togglePublish(page)} className="p-1.5 rounded-md hover:bg-secondary">
                  {page.is_published ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button onClick={() => { setEditingId(page.id); setForm({ title: page.title, slug: page.slug, content: page.content }); setShowForm(true); }}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => deletePage(page.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
