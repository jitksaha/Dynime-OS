import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { MessageCircle, ArrowRight, Star, CheckCircle2, ChevronDown } from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import ReactMarkdown from "react-markdown";
import { useAppInfo } from "@/hooks/useAppInfo";

interface Block {
  id: string;
  type: "hero" | "text" | "features" | "cta" | "image" | "testimonials" | "contact_info" | "faq" | "stats" | "pricing" | "video" | "divider" | "accordion" | "banner" | "gallery" | "timeline" | "team" | "logo_cloud";
  content: Record<string, any>;
}

interface ManagedPageData {
  title: string;
  slug: string;
  blocks: Block[];
  seo_title: string | null;
  seo_description: string | null;
}

function RenderBlock({ block }: { block: Block }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  switch (block.type) {
    case "hero":
      return (
        <div className="text-center mb-12 pt-4">
          {block.content.badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              {block.content.badge}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">{block.content.heading}</h1>
          {block.content.subheading && (
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">{block.content.subheading}</p>
          )}
          {block.content.cta_text && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={block.content.cta_link || "/signup"}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                {block.content.cta_text} <ArrowRight className="h-4 w-4" />
              </Link>
              {block.content.secondary_cta_text && (
                <Link
                  to={block.content.secondary_cta_link || "/contact"}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors"
                >
                  {block.content.secondary_cta_text}
                </Link>
              )}
            </div>
          )}
        </div>
      );

    case "text":
      return (
        <div className="mb-8">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">{block.content.heading}</h2>
          )}
          {block.content.body && (
            <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{block.content.body}</ReactMarkdown>
            </div>
          )}
        </div>
      );

    case "features":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-2">{block.content.heading}</h2>
          )}
          {block.content.description && (
            <p className="text-sm text-muted-foreground mb-6">{block.content.description}</p>
          )}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${(block.content.items || []).length >= 3 ? "lg:grid-cols-3" : ""} gap-4`}>
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-sm transition-all">
                {item.icon && <span className="text-2xl mb-3 block">{item.icon}</span>}
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                {item.links && (
                  <ul className="mt-3 space-y-1">
                    {item.links.map((link: string, li: number) => (
                      <li key={li} className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        {link}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="my-10 text-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] p-8 sm:p-12">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{block.content.heading}</h2>
          {block.content.description && (
            <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">{block.content.description}</p>
          )}
          {block.content.button_text && (
            <Link
              to={block.content.button_link || "/contact"}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              {block.content.button_text}
            </Link>
          )}
        </div>
      );

    case "contact_info":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {(block.content.items || []).map((item: any, idx: number) => (
            <div key={idx} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      );

    case "image":
      return (
        <div className="mb-8">
          <img src={block.content.url} alt={block.content.alt || ""} className="w-full rounded-xl border border-border shadow-sm" loading="lazy" />
          {block.content.caption && (
            <p className="text-xs text-muted-foreground text-center mt-2">{block.content.caption}</p>
          )}
        </div>
      );

    case "testimonials":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-6">{block.content.heading}</h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-6">
                {item.rating && (
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                )}
                <p className="text-sm text-foreground mb-4 italic">"{item.quote}"</p>
                <div className="flex items-center gap-3">
                  {item.avatar && <img src={item.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-6">{block.content.heading}</h2>
          )}
          <div className="space-y-2">
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{item.question}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "stats":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-6 text-center">{block.content.heading}</h2>
          )}
          <div className={`grid grid-cols-2 ${(block.content.items || []).length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="text-center p-6 rounded-xl border border-border bg-card">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{item.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "pricing":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-6 text-center">{block.content.heading}</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className={`rounded-xl border p-6 ${item.featured ? "border-primary bg-primary/[0.03] shadow-md" : "border-border bg-card"}`}>
                <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
                <p className="text-3xl font-bold text-foreground mt-2">{item.price}<span className="text-sm font-normal text-muted-foreground">/{item.period || "mo"}</span></p>
                {item.description && <p className="text-sm text-muted-foreground mt-2">{item.description}</p>}
                <ul className="mt-4 space-y-2">
                  {(item.features || []).map((f: string, fi: number) => (
                    <li key={fi} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {item.cta_text && (
                  <Link to={item.cta_link || "/signup"} className={`mt-5 w-full inline-flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${item.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border text-foreground hover:bg-muted"}`}>
                    {item.cta_text}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "video":
      return (
        <div className="mb-8">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-4">{block.content.heading}</h2>
          )}
          <div className="aspect-video rounded-xl overflow-hidden border border-border">
            <iframe
              src={block.content.url}
              title={block.content.heading || "Video"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {block.content.caption && (
            <p className="text-xs text-muted-foreground text-center mt-2">{block.content.caption}</p>
          )}
        </div>
      );

    case "divider":
      return (
        <hr className="my-8 border-border" />
      );

    case "accordion":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-4">{block.content.heading}</h2>
          )}
          <div className="space-y-2">
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "banner":
      return (
        <div className={`mb-8 p-6 rounded-xl ${block.content.variant === "warning" ? "bg-amber-500/10 border border-amber-500/20" : block.content.variant === "error" ? "bg-destructive/10 border border-destructive/20" : "bg-primary/10 border border-primary/20"}`}>
          {block.content.heading && (
            <h3 className="text-sm font-semibold text-foreground mb-1">{block.content.heading}</h3>
          )}
          <p className="text-sm text-muted-foreground">{block.content.body}</p>
        </div>
      );

    case "gallery":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-4">{block.content.heading}</h2>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="rounded-xl overflow-hidden border border-border">
                <img src={item.url} alt={item.alt || ""} className="w-full h-40 object-cover" loading="lazy" />
                {item.caption && <p className="text-xs text-muted-foreground p-2 text-center">{item.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      );

    case "timeline":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-6">{block.content.heading}</h2>
          )}
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                <div className="ml-2">
                  {item.date && <span className="text-xs font-medium text-primary">{item.date}</span>}
                  <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "team":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-6">{block.content.heading}</h2>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="text-center p-4 rounded-xl border border-border bg-card">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.name} className="h-16 w-16 rounded-full mx-auto object-cover mb-3" />
                ) : (
                  <div className="h-16 w-16 rounded-full mx-auto bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-lg font-bold text-primary">{(item.name || "?").charAt(0)}</span>
                  </div>
                )}
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.role}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "logo_cloud":
      return (
        <div className="mb-10">
          {block.content.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-6 text-center">{block.content.heading}</h2>
          )}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {(block.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="opacity-60 hover:opacity-100 transition-opacity">
                {item.url ? (
                  <img src={item.url} alt={item.name || ""} className="h-8 sm:h-10 object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{item.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

interface DynamicPageProps {
  slug: string;
  fallbackTitle: string;
  fallbackBlocks: Block[];
  children?: React.ReactNode;
  maxWidth?: string;
}

export default function DynamicPage({ slug, fallbackTitle, fallbackBlocks, children, maxWidth = "max-w-3xl" }: DynamicPageProps) {
  const { appInfo } = useAppInfo();
  const [page, setPage] = useState<ManagedPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("managed_pages")
        .select("title, slug, blocks, seo_title, seo_description")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (data) {
        setPage({
          ...data,
          blocks: (data.blocks || []) as unknown as Block[],
        });
      }
      setLoading(false);
    })();
  }, [slug]);

  const title = page?.title || fallbackTitle;
  const blocks = page ? page.blocks : fallbackBlocks;

  useEffect(() => {
    if (page?.seo_title) document.title = page.seo_title;
    else document.title = `${title} - ${appInfo.app_name}`;
  }, [page, title]);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16`}>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <>
            {blocks.map((block) => (
              <RenderBlock key={block.id} block={block} />
            ))}
            {children}
          </>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}

export { type Block };
