// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { motion } from "framer-motion";
import { Calendar, Clock, Eye, Search, ArrowRight, TrendingUp, BookOpen, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  author_avatar: string | null;
  published_at: string;
  reading_time: number;
  views_count: number;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  post_count: number;
}

const POSTS_PER_PAGE = 12;

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  useEffect(() => {
    document.title = "Blog - Insights, Tips & Updates | Dynime";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Read the latest insights, tutorials, product updates, and industry news from Dynime. Expert content for growing businesses.");

    Promise.all([
      supabase.from("blog_posts").select("id,title,slug,excerpt,featured_image,category,tags,author_name,author_avatar,published_at,reading_time,views_count").eq("status", "published").order("published_at", { ascending: false }),
      supabase.from("blog_categories").select("*").order("name"),
    ]).then(([postsRes, catsRes]) => {
      if (postsRes.data) setPosts(postsRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return posts.filter(p => {
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.excerpt || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [posts, search, activeCategory]);

  const featuredPost = filtered[0];
  const restPosts = filtered.slice(1, visibleCount);
  const hasMore = filtered.length > visibleCount;

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(POSTS_PER_PAGE); }, [search, activeCategory]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Dynime Blog",
    "description": "Latest insights, tutorials, and updates from Dynime",
    "url": window.location.href,
    "blogPost": posts.slice(0, 10).map(p => ({
      "@type": "BlogPosting",
      "headline": p.title,
      "datePublished": p.published_at,
      "author": { "@type": "Person", "name": p.author_name },
      "url": `${window.location.origin}/blog/${p.slug}`,
    })),
  };

  const postCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [posts]);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full bg-accent/5 blur-3xl" />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              {posts.length} Articles Published
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight mb-4">
              Insights & <span className="text-primary">Resources</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Expert articles, tutorials, and industry analysis to help you grow your business smarter.
            </p>
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-card border-border text-base"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <div className="sticky top-[64px] z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3 lg:justify-center snap-x snap-mandatory">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 snap-start transition-all ${activeCategory === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              All <span className="ml-1 text-xs opacity-70">({posts.length})</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 snap-start transition-all ${activeCategory === cat.name ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                {cat.name} <span className="ml-1 text-xs opacity-70">({postCounts[cat.name] || 0})</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="space-y-12">
            {/* Featured skeleton */}
            <div className="grid md:grid-cols-2 gap-0 rounded-2xl border border-border overflow-hidden">
              <Skeleton className="h-72 md:h-80" />
              <div className="p-8 space-y-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-4"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-5 rounded-2xl bg-primary/5 mb-6"><BookOpen className="h-10 w-10 text-primary/30" /></div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No articles found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {search ? `No results for "${search}". Try a different search term.` : "Blog posts are coming soon. Stay tuned!"}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-4 text-sm text-primary font-medium hover:underline">Clear search</button>
            )}
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featuredPost && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                <Link to={`/blog/${featuredPost.slug}`} className="group grid md:grid-cols-2 gap-0 rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                  <div className="relative h-64 md:h-80 bg-muted overflow-hidden">
                    {featuredPost.featured_image ? (
                      <img src={featuredPost.featured_image} alt={featuredPost.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <TrendingUp className="h-16 w-16 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-primary text-primary-foreground shadow-lg">{featuredPost.category}</Badge>
                      <Badge className="bg-background/80 backdrop-blur-sm text-foreground shadow-lg">Featured</Badge>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(featuredPost.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{featuredPost.reading_time} min read</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{featuredPost.views_count?.toLocaleString()}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-tight">{featuredPost.title}</h2>
                    <p className="text-muted-foreground line-clamp-3 mb-6 leading-relaxed">{featuredPost.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-primary/10">{featuredPost.author_name.charAt(0)}</div>
                        <span className="text-sm font-medium text-foreground">{featuredPost.author_name}</span>
                      </div>
                      <span className="text-sm text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read article <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restPosts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                  <Link to={`/blog/${post.slug}`} className="group flex flex-col h-full rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                    <div className="relative h-48 bg-muted overflow-hidden">
                      {post.featured_image ? (
                        <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                          <BookOpen className="h-10 w-10 text-primary/15" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground text-[11px] shadow-sm">{post.category}</Badge>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_time} min</span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-snug">{post.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{post.excerpt}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{post.author_name.charAt(0)}</div>
                          <span className="text-xs font-medium text-muted-foreground">{post.author_name}</span>
                        </div>
                        <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">Read <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => setVisibleCount(v => v + POSTS_PER_PAGE)}
                  className="px-8 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/30 transition-all"
                >
                  Load more articles ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}

            {/* Post count */}
            <p className="text-center text-sm text-muted-foreground mt-8">
              Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} articles
            </p>
          </>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
