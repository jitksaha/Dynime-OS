import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Pencil, Copy, Eye } from "lucide-react";
import VisualEditor from "@/components/visual-editor/VisualEditor";
import type { WidgetInstance } from "@/components/visual-editor/types";

interface ManagedPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  blocks: any[];
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  is_builtin?: boolean;
}

const BUILT_IN_PAGES: ManagedPage[] = [
  { id: "builtin-home", title: "Home", slug: "/", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-pricing", title: "Pricing", slug: "/pricing", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-blog", title: "Blog", slug: "/blog", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-contact", title: "Contact", slug: "/contact", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-partners", title: "Partners", slug: "/partners", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-testimonials", title: "Testimonials", slug: "/testimonials", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-help", title: "Help Center", slug: "/help", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-api-docs", title: "API Documentation", slug: "/api/docs", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-hrms", title: "Feature: HRMS", slug: "/features/hrms", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-crm", title: "Feature: CRM", slug: "/features/crm", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-accounting", title: "Feature: Accounting", slug: "/features/accounting", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-marketing", title: "Feature: Marketing", slug: "/features/marketing", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-helpdesk", title: "Feature: Helpdesk", slug: "/features/helpdesk", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-projects", title: "Feature: Projects", slug: "/features/projects", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-documents", title: "Feature: Documents", slug: "/features/documents", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-reports", title: "Feature: Reports", slug: "/features/reports", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-team-chat", title: "Feature: Team Chat", slug: "/features/team-chat", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-pos", title: "Feature: POS", slug: "/features/pos", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-calendar", title: "Feature: Calendar", slug: "/features/calendar", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-wallet", title: "Feature: Wallet", slug: "/features/wallet", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-workflows", title: "Feature: Workflows", slug: "/features/workflows", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-features-tax", title: "Feature: Tax Compliance", slug: "/features/tax-compliance", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-privacy", title: "Privacy Policy", slug: "/privacy", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-terms", title: "Terms of Service", slug: "/terms", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-refund", title: "Refund Policy", slug: "/refund", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-disclaimer", title: "Disclaimer", slug: "/disclaimer", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
  { id: "builtin-app-download", title: "App Download", slug: "/app-download", status: "published", blocks: [], seo_title: null, seo_description: null, created_at: "", updated_at: "", is_builtin: true },
];

export default function PageManagement() {
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ManagedPage | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", status: "draft", seo_title: "", seo_description: "", blocks: [] as WidgetInstance[] });

  const fetchPages = async () => {
    const { data } = await supabase.from("managed_pages").select("*").order("created_at", { ascending: false });
    const dbPages = ((data as any) || []).map((p: any) => ({ ...p, is_builtin: false }));
    // Merge built-in pages (exclude any whose slug already exists in DB)
    const dbSlugs = new Set(dbPages.map((p: ManagedPage) => p.slug));
    const builtIns = BUILT_IN_PAGES.filter(bp => !dbSlugs.has(bp.slug));
    setPages([...dbPages, ...builtIns]);
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const openNew = () => {
    setEditingPage(null);
    setForm({ title: "", slug: "", status: "draft", seo_title: "", seo_description: "", blocks: [] });
    setDialogOpen(true);
  };

  const openEdit = (page: ManagedPage) => {
    setEditingPage(page);
    // Convert old block format to widget format if needed
    const blocks = (page.blocks || []).map((b: any) => ({
      id: b.id || crypto.randomUUID(),
      type: b.type,
      props: b.props || b.content || {},
    }));
    setForm({
      title: page.title,
      slug: page.slug,
      status: page.status,
      seo_title: page.seo_title || "",
      seo_description: page.seo_description || "",
      blocks,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) return toast.error("Title and slug are required");
    const slug = form.slug.startsWith("/") ? form.slug : `/${form.slug}`;
    const payload = { title: form.title, slug, status: form.status, seo_title: form.seo_title || null, seo_description: form.seo_description || null, blocks: form.blocks as any };

    if (editingPage) {
      const { error } = await supabase.from("managed_pages").update(payload).eq("id", editingPage.id);
      if (error) return toast.error(error.message);
      toast.success("Page updated");
    } else {
      const { error } = await supabase.from("managed_pages").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Page created");
    }
    setDialogOpen(false);
    fetchPages();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("managed_pages").delete().eq("id", id);
    toast.success("Page deleted");
    fetchPages();
  };

  const duplicatePage = async (page: ManagedPage) => {
    const payload = { title: `${page.title} (Copy)`, slug: `${page.slug}-copy`, status: "draft", seo_title: page.seo_title, seo_description: page.seo_description, blocks: page.blocks as any };
    const { error } = await supabase.from("managed_pages").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Page duplicated");
    fetchPages();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Page Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Design pages with the Elementor-level visual editor</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Page</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-foreground">{pages.length}</p>
          <p className="text-xs text-muted-foreground">Total Pages</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-primary">{pages.filter(p => p.status === "published").length}</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-muted-foreground">{pages.filter(p => p.status === "draft").length}</p>
          <p className="text-xs text-muted-foreground">Drafts</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading pages...</div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No pages yet. Create your first page!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <div key={page.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{page.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{page.slug}</p>
                    {!page.is_builtin && <span className="text-xs text-muted-foreground">· {(page.blocks as any[])?.length || 0} widgets</span>}
                  </div>
                </div>
                <Badge variant={page.status === "published" ? "default" : "secondary"}>{page.status}</Badge>
                {page.is_builtin && <Badge variant="outline" className="text-[10px]">System</Badge>}
              </div>
              <div className="flex items-center gap-1">
                {!page.is_builtin && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicatePage(page)}><Copy className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(page.slug, "_blank")}><Eye className="h-4 w-4" /></Button>
                {!page.is_builtin && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(page)}><Pencil className="h-4 w-4" /></Button>}
                {!page.is_builtin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(page.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen Visual Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] flex flex-col p-0">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
            <DialogHeader className="p-0">
              <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Page Title" className="h-8 w-48 text-xs" />
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\-\/]/g, "") }))} placeholder="/slug" className="h-8 w-32 text-xs" />
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleSave}>{editingPage ? "Update" : "Create"}</Button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <VisualEditor
              widgets={form.blocks}
              onChange={(widgets) => setForm(f => ({ ...f, blocks: widgets }))}
              context="page"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
