import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, BookOpen, Search, ThumbsUp, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function CustomerKnowledgeBase() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("knowledge_base_articles")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setArticles(data || []);
      setLoading(false);
    })();
  }, [profile?.tenant_id]);

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(a => a.category))];

  const handleView = async (id: string) => {
    setExpanded(expanded === id ? null : id);
    await supabase.from("knowledge_base_articles").update({ views: (articles.find(a => a.id === id)?.views || 0) + 1 }).eq("id", id);
  };

  const handleHelpful = async (id: string) => {
    await supabase.from("knowledge_base_articles").update({ helpful_count: (articles.find(a => a.id === id)?.helpful_count || 0) + 1 }).eq("id", id);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, helpful_count: (a.helpful_count || 0) + 1 } : a));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">Find answers and helpful articles</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="pl-9 h-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No articles found</p>
        </div>
      ) : (
        categories.map(cat => (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-foreground mb-3 capitalize">{cat}</h2>
            <div className="space-y-2">
              {filtered.filter(a => a.category === cat).map(article => (
                <div
                  key={article.id}
                  className={cn("border rounded-xl bg-card overflow-hidden transition-all", expanded === article.id ? "border-primary/30" : "border-border")}
                >
                  <div
                    className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleView(article.id)}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm font-medium text-foreground">{article.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                      <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {article.views || 0}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" /> {article.helpful_count || 0}</span>
                    </div>
                  </div>
                  {expanded === article.id && (
                    <div className="border-t border-border px-5 py-4">
                      <div className="prose prose-sm max-w-none text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                        {article.content || "No content available"}
                      </div>
                      <button
                        onClick={() => handleHelpful(article.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Was this helpful?
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
