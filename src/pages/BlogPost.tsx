// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { motion } from "framer-motion";
import { Calendar, Clock, Eye, ArrowLeft, Share2, BookOpen, ChevronRight, ArrowRight, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  author_avatar: string | null;
  published_at: string;
  reading_time: number;
  views_count: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  schema_markup: any;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  category: string;
  published_at: string;
  reading_time: number;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setPost(null);
    window.scrollTo(0, 0);
    (async () => {
      const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("status", "published").single();
      if (data) {
        setPost(data as BlogPost);
        supabase.from("blog_posts").update({ views_count: (data.views_count || 0) + 1 }).eq("id", data.id).then();
        const { data: rel } = await supabase.from("blog_posts").select("id,title,slug,excerpt,featured_image,category,published_at,reading_time").eq("status", "published").eq("category", data.category).neq("id", data.id).order("published_at", { ascending: false }).limit(3);
        if (rel) setRelated(rel);

        document.title = data.seo_title || `${data.title} | Dynime Blog`;
        const setMeta = (name: string, content: string | null) => {
          if (!content) return;
          let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          if (!el) { el = document.createElement("meta"); (name.startsWith("og:") || name.startsWith("twitter:")) ? el.setAttribute("property", name) : el.setAttribute("name", name); document.head.appendChild(el); }
          el.setAttribute("content", content);
        };
        setMeta("description", data.seo_description || data.excerpt);
        setMeta("keywords", data.seo_keywords);
        setMeta("og:title", data.og_title || data.title);
        setMeta("og:description", data.og_description || data.excerpt);
        setMeta("og:image", data.og_image || data.featured_image);
        setMeta("og:type", "article");
        setMeta("twitter:card", "summary_large_image");
        setMeta("twitter:title", data.og_title || data.title);
        setMeta("twitter:description", data.og_description || data.excerpt);
        if (data.canonical_url) {
          let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
          if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
          link.href = data.canonical_url;
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  const sharePost = async () => {
    try {
      await navigator.share({ title: post?.title, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  const jsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.featured_image || post.og_image,
    "datePublished": post.published_at,
    "dateModified": post.published_at,
    "author": { "@type": "Person", "name": post.author_name },
    "publisher": { "@type": "Organization", "name": "Dynime" },
    "mainEntityOfPage": { "@type": "WebPage", "@id": window.location.href },
    "wordCount": post.content?.split(/\s+/).length || 0,
    "keywords": post.tags?.join(", "),
    ...(post.schema_markup || {}),
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-3/4" />
          <div className="flex gap-4"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-24" /></div>
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <div className="space-y-4 pt-4">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="p-5 rounded-2xl bg-primary/5 mb-6"><BookOpen className="h-12 w-12 text-primary/30" /></div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Post not found</h1>
          <p className="text-muted-foreground mb-6 text-center max-w-md">This article may have been removed or doesn't exist.</p>
          <Link to="/blog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

      {/* Hero Featured Image */}
      {post.featured_image && (
        <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[480px] overflow-hidden bg-muted">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 pb-8">
            <Badge className="bg-primary text-primary-foreground text-xs mb-3">{post.category}</Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight drop-shadow-sm">
              {post.title}
            </h1>
          </div>
        </div>
      )}

      {/* Article content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground pt-6 pb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground truncate max-w-[250px]">{post.title}</span>
        </nav>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Title if no featured image */}
          {!post.featured_image && (
            <div className="pt-4 pb-6">
              <Badge variant="secondary" className="text-xs mb-4">{post.category}</Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-4 leading-tight">{post.title}</h1>
            </div>
          )}

          {/* Meta bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 py-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-primary/10">
                {post.author_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{post.author_name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_time} min read</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <button onClick={sharePost} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed py-8 border-b border-border italic">{post.excerpt}</p>
          )}

          {/* Content */}
          <div className="py-10 prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-10 prose-headings:mb-4
            prose-h2:text-2xl prose-h2:border-b prose-h2:border-border prose-h2:pb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-2xl prose-img:border prose-img:border-border
            prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-xl prose-blockquote:py-2 prose-blockquote:px-4
            prose-li:text-muted-foreground
            prose-strong:text-foreground
            prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
            prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-xl
          ">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="py-8 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Tags</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${tag}`}
                    className="px-3 py-1.5 rounded-full bg-muted/80 text-sm text-muted-foreground border border-border hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="py-6 border-t border-border">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to all articles
            </Link>
          </div>
        </motion.div>
      </article>

      {/* Related Posts */}
      {related.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">Related Articles</h2>
              <Link to="/blog" className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div className="relative h-44 bg-muted overflow-hidden">
                    {r.featured_image ? (
                      <img src={r.featured_image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                        <BookOpen className="h-8 w-8 text-primary/15" />
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground text-[11px]">{r.category}</Badge>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{new Date(r.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>·</span>
                      <span>{r.reading_time} min read</span>
                    </div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{r.title}</h3>
                    {r.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{r.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
