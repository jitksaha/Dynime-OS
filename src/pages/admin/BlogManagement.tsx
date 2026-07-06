// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, Search, Sparkles, Globe, FileText, Tag, BarChart3, Palette } from "lucide-react";
import VisualEditor from "@/components/visual-editor/VisualEditor";
import type { WidgetInstance } from "@/components/visual-editor/types";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  status: string;
  published_at: string | null;
  reading_time: number;
  views_count: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots: string | null;
  ai_seo_score: number | null;
  ai_seo_suggestions: any;
  created_at: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  post_count: number;
}

const emptyPost = {
  title: "", slug: "", excerpt: "", content: "", featured_image: "", category: "General",
  tags: [] as string[], author_name: "Admin", status: "draft",
  seo_title: "", seo_description: "", seo_keywords: "", og_title: "", og_description: "", og_image: "", canonical_url: "", robots: "index, follow",
  visual_blocks: [] as WidgetInstance[],
};

export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPost, setEditPost] = useState<typeof emptyPost & { id?: string }>(emptyPost);
  const [tagInput, setTagInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", description: "" });

  const fetchData = async () => {
    const [postsRes, catsRes] = await Promise.all([
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_categories").select("*").order("name"),
    ]);
    if (postsRes.data) setPosts(postsRes.data as BlogPost[]);
    if (catsRes.data) setCategories(catsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const calcReadingTime = (content: string) => Math.max(1, Math.ceil(content.split(/\s+/).length / 200));

  const handleSave = async () => {
    if (!editPost.title) { toast.error("Title is required"); return; }
    const slug = editPost.slug || generateSlug(editPost.title);
    const payload = {
      ...editPost,
      slug,
      reading_time: calcReadingTime(editPost.content),
      published_at: editPost.status === "published" ? (editPost.id ? undefined : new Date().toISOString()) : null,
    };

    if (editPost.id) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editPost.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Post updated");
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Post created");
    }
    setDialogOpen(false);
    setEditPost(emptyPost);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast.success("Post deleted");
    fetchData();
  };

  const addTag = () => {
    if (tagInput.trim() && !editPost.tags.includes(tagInput.trim())) {
      setEditPost(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setEditPost(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }));
  };

  const aiOptimizeSEO = async () => {
    setAiLoading(true);
    try {
      const { data } = await supabase.functions.invoke("ai-assistant", {
        body: {
          message: `Analyze this blog post for SEO optimization and return a JSON object with these fields: seo_title (max 60 chars, include primary keyword), seo_description (max 160 chars, compelling with CTA), seo_keywords (comma-separated, 5-8 keywords), og_title, og_description. Also include ai_seo_score (0-100) and ai_seo_suggestions (array of improvement tips).

Title: ${editPost.title}
Content: ${editPost.content.slice(0, 2000)}
Category: ${editPost.category}
Tags: ${editPost.tags.join(", ")}

Return ONLY valid JSON, no markdown.`,
        },
      });
      if (data?.reply) {
        try {
          const cleaned = data.reply.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          const seo = JSON.parse(cleaned);
          setEditPost(p => ({
            ...p,
            seo_title: seo.seo_title || p.seo_title,
            seo_description: seo.seo_description || p.seo_description,
            seo_keywords: seo.seo_keywords || p.seo_keywords,
            og_title: seo.og_title || p.og_title,
            og_description: seo.og_description || p.og_description,
          }));
          toast.success(`AI SEO Score: ${seo.ai_seo_score || "N/A"}/100`);
          if (seo.ai_seo_suggestions?.length) {
            seo.ai_seo_suggestions.forEach((s: string) => toast.info(s, { duration: 6000 }));
          }
        } catch {
          toast.error("AI returned invalid format. Try again.");
        }
      }
    } catch (e: any) {
      toast.error("AI optimization failed: " + (e.message || "Unknown error"));
    }
    setAiLoading(false);
  };

  const addCategory = async () => {
    if (!newCat.name) return;
    const slug = newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("blog_categories").insert({ name: newCat.name, slug, description: newCat.description || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Category added");
    setNewCat({ name: "", description: "" });
    setCatDialogOpen(false);
    fetchData();
  };

  const filtered = posts.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Management</h1>
          <p className="text-sm text-muted-foreground">Create, manage, and optimize blog posts with AI-powered SEO</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Tag className="h-4 w-4 mr-1" /> Categories</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <Badge key={c.id} variant="secondary">{c.name} ({c.post_count})</Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  <Input placeholder="Category name" value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Description (optional)" value={newCat.description} onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))} />
                  <Button onClick={addCategory} size="sm">Add Category</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => { setEditPost(emptyPost); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: posts.length, icon: FileText },
          { label: "Published", value: posts.filter(p => p.status === "published").length, icon: Globe },
          { label: "Drafts", value: posts.filter(p => p.status === "draft").length, icon: Edit },
          { label: "Total Views", value: posts.reduce((a, p) => a + (p.views_count || 0), 0), icon: BarChart3 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search posts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Views</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">SEO</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground line-clamp-1">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><Badge variant="outline" className="text-xs">{p.category}</Badge></td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.views_count}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {p.ai_seo_score ? (
                        <span className={`text-xs font-semibold ${p.ai_seo_score >= 80 ? "text-green-600" : p.ai_seo_score >= 50 ? "text-yellow-600" : "text-red-600"}`}>{p.ai_seo_score}/100</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "published" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/blog/${p.slug}`, "_blank")}><Eye className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditPost({ ...emptyPost, ...p, tags: p.tags || [], id: p.id } as any);
                          setDialogOpen(true);
                        }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No posts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPost.id ? "Edit Post" : "Create New Post"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="content" className="mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="content"><FileText className="h-4 w-4 mr-1" /> Content</TabsTrigger>
              <TabsTrigger value="visual"><Palette className="h-4 w-4 mr-1" /> Visual Editor</TabsTrigger>
              <TabsTrigger value="seo"><Globe className="h-4 w-4 mr-1" /> SEO</TabsTrigger>
              <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-1" /> AI Optimize</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input value={editPost.title} onChange={e => setEditPost(p => ({ ...p, title: e.target.value, slug: p.slug || generateSlug(e.target.value) }))} placeholder="Enter post title" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editPost.slug} onChange={e => setEditPost(p => ({ ...p, slug: e.target.value }))} placeholder="auto-generated-slug" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editPost.category} onValueChange={v => setEditPost(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editPost.status} onValueChange={v => setEditPost(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Author Name</Label>
                  <Input value={editPost.author_name} onChange={e => setEditPost(p => ({ ...p, author_name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Featured Image URL</Label>
                  <Input value={editPost.featured_image || ""} onChange={e => setEditPost(p => ({ ...p, featured_image: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="col-span-2">
                  <Label>Excerpt</Label>
                  <Textarea value={editPost.excerpt || ""} onChange={e => setEditPost(p => ({ ...p, excerpt: e.target.value }))} rows={2} placeholder="Brief description..." />
                </div>
                <div className="col-span-2">
                  <Label>Content (Markdown supported)</Label>
                  <Textarea value={editPost.content} onChange={e => setEditPost(p => ({ ...p, content: e.target.value }))} rows={12} placeholder="Write your blog content here... Markdown is supported." className="font-mono text-sm" />
                </div>
                <div className="col-span-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add a tag" />
                    <Button onClick={addTag} size="sm" variant="outline">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {editPost.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>{tag} ×</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="visual" className="mt-4">
              <div className="h-[500px]">
                <VisualEditor
                  widgets={editPost.visual_blocks || []}
                  onChange={(widgets) => setEditPost(p => ({ ...p, visual_blocks: widgets }))}
                  context="post"
                />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label>SEO Title <span className="text-xs text-muted-foreground">({(editPost.seo_title || "").length}/60)</span></Label>
                  <Input value={editPost.seo_title || ""} onChange={e => setEditPost(p => ({ ...p, seo_title: e.target.value }))} placeholder="SEO optimized title" maxLength={70} />
                </div>
                <div>
                  <Label>Meta Description <span className="text-xs text-muted-foreground">({(editPost.seo_description || "").length}/160)</span></Label>
                  <Textarea value={editPost.seo_description || ""} onChange={e => setEditPost(p => ({ ...p, seo_description: e.target.value }))} rows={3} placeholder="Compelling meta description" maxLength={170} />
                </div>
                <div>
                  <Label>Keywords</Label>
                  <Input value={editPost.seo_keywords || ""} onChange={e => setEditPost(p => ({ ...p, seo_keywords: e.target.value }))} placeholder="keyword1, keyword2, keyword3" />
                </div>
                <div>
                  <Label>OG Title</Label>
                  <Input value={editPost.og_title || ""} onChange={e => setEditPost(p => ({ ...p, og_title: e.target.value }))} placeholder="Open Graph title" />
                </div>
                <div>
                  <Label>OG Description</Label>
                  <Textarea value={editPost.og_description || ""} onChange={e => setEditPost(p => ({ ...p, og_description: e.target.value }))} rows={2} placeholder="Open Graph description" />
                </div>
                <div>
                  <Label>OG Image URL</Label>
                  <Input value={editPost.og_image || ""} onChange={e => setEditPost(p => ({ ...p, og_image: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label>Canonical URL</Label>
                  <Input value={editPost.canonical_url || ""} onChange={e => setEditPost(p => ({ ...p, canonical_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label>Robots</Label>
                  <Select value={editPost.robots || "index, follow"} onValueChange={v => setEditPost(p => ({ ...p, robots: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="index, follow">index, follow</SelectItem>
                      <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                      <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                      <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Google Preview */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Google Search Preview</p>
                  <p className="text-blue-600 dark:text-blue-400 text-lg font-medium truncate">{editPost.seo_title || editPost.title || "Page Title"}</p>
                  <p className="text-green-700 dark:text-green-500 text-sm truncate">{editPost.canonical_url || `dynime.com/blog/${editPost.slug || "..."}`}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{editPost.seo_description || editPost.excerpt || "Meta description will appear here..."}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" /> AI SEO Optimizer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Let AI analyze your post and generate optimized SEO metadata. It will score your content, suggest improvements, and auto-fill SEO fields.
                  </p>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-medium text-foreground">AI will optimize:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>SEO title with primary keyword (max 60 chars)</li>
                      <li>Meta description with compelling CTA (max 160 chars)</li>
                      <li>Focus keywords for your content</li>
                      <li>Open Graph metadata for social sharing</li>
                      <li>Content readability score</li>
                      <li>Keyword density analysis</li>
                      <li>Actionable improvement suggestions</li>
                    </ul>
                  </div>
                  <Button onClick={aiOptimizeSEO} disabled={aiLoading || !editPost.title} className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiLoading ? "Analyzing with AI..." : "Optimize SEO with AI"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Requires post title and content for best results</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editPost.id ? "Update" : "Create"} Post</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
