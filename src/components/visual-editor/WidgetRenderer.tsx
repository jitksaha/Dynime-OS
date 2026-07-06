import { useState, useEffect, useRef } from "react";
import type { WidgetInstance } from "./types";
import { Star, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

// ─── Individual Widget Renderers ─────────────────────────────────────

function HeadingWidget({ props }: { props: Record<string, any> }) {
  const Tag = (props.tag || "h2") as keyof JSX.IntrinsicElements;
  return (
    <Tag
      style={{ textAlign: props.align, color: props.color || undefined, fontSize: props.fontSize, fontWeight: props.fontWeight, letterSpacing: props.letterSpacing }}
      className="text-foreground"
    >
      {props.text}
    </Tag>
  );
}

function TextEditorWidget({ props }: { props: Record<string, any> }) {
  return (
    <div
      style={{ textAlign: props.align, color: props.color || undefined, fontSize: props.fontSize, lineHeight: props.lineHeight }}
      className="text-foreground prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: simpleMarkdown(props.content || "") }}
    />
  );
}

function ImageWidget({ props }: { props: Record<string, any> }) {
  const shadowMap: Record<string, string> = { none: "", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-xl" };
  const img = (
    <div>
      <img
        src={props.src}
        alt={props.alt}
        style={{ width: props.width, borderRadius: props.borderRadius, objectFit: props.objectFit }}
        className={`max-w-full ${shadowMap[props.shadow] || ""}`}
      />
      {props.caption && <p className="text-xs text-muted-foreground mt-2 text-center">{props.caption}</p>}
    </div>
  );
  return props.link ? <a href={props.link} target="_blank" rel="noopener noreferrer">{img}</a> : img;
}

function ButtonWidget({ props }: { props: Record<string, any> }) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-primary text-primary hover:bg-primary/10",
    ghost: "text-primary hover:bg-primary/10",
  };
  const sizes: Record<string, string> = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-8 py-3 text-base" };
  return (
    <div style={{ textAlign: props.align }}>
      <a
        href={props.url || "#"}
        className={`inline-flex items-center justify-center font-medium transition-colors ${variants[props.variant] || variants.primary} ${sizes[props.size] || sizes.md} ${props.fullWidth ? "w-full" : ""}`}
        style={{ borderRadius: props.borderRadius }}
      >
        {props.text}
      </a>
    </div>
  );
}

function SpacerWidget({ props }: { props: Record<string, any> }) {
  return <div style={{ height: props.height }} />;
}

function DividerWidget({ props }: { props: Record<string, any> }) {
  return (
    <div style={{ textAlign: props.align, width: "100%" }}>
      <hr
        style={{ borderStyle: props.style, borderWidth: `${props.weight}px 0 0 0`, borderColor: props.color || "hsl(var(--border))", width: props.width, display: "inline-block" }}
      />
    </div>
  );
}

function GoogleMapsWidget({ props }: { props: Record<string, any> }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(props.address)}&z=${props.zoom}&output=embed`;
  return <iframe src={src} width="100%" height={props.height} style={{ border: 0, borderRadius: 8 }} allowFullScreen loading="lazy" />;
}

function IconBoxWidget({ props }: { props: Record<string, any> }) {
  return (
    <div style={{ textAlign: props.align }} className="p-6 rounded-xl border border-border bg-card">
      <div style={{ fontSize: props.iconSize, color: props.iconColor || undefined }} className="mb-3">{props.icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{props.heading}</h3>
      <p className="text-sm text-muted-foreground">{props.description}</p>
    </div>
  );
}

function ImageBoxWidget({ props }: { props: Record<string, any> }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <img src={props.src} alt={props.heading} style={{ height: props.imageHeight, objectFit: "cover", width: "100%" }} />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-1">{props.heading}</h3>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </div>
    </div>
  );
}

function StarRatingWidget({ props }: { props: Record<string, any> }) {
  const stars = [];
  for (let i = 1; i <= (props.maxStars || 5); i++) {
    const filled = i <= Math.floor(props.rating);
    const half = !filled && i - 0.5 <= props.rating;
    stars.push(
      <Star key={i} size={props.size} fill={filled || half ? (props.color || "#f59e0b") : "none"} color={props.color || "#f59e0b"} strokeWidth={1.5} style={{ opacity: filled ? 1 : half ? 0.7 : 0.3 }} />
    );
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stars}
      {props.label && <span className="text-sm text-muted-foreground ml-2">{props.label}</span>}
    </div>
  );
}

function CounterWidget({ props }: { props: Record<string, any> }) {
  const [count, setCount] = useState(props.startValue || 0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const end = props.endValue || 0;
    const dur = props.duration || 2000;
    const steps = 60;
    const inc = (end - (props.startValue || 0)) / steps;
    let current = props.startValue || 0;
    const timer = setInterval(() => {
      current += inc;
      if (current >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, dur / steps);
    return () => clearInterval(timer);
  }, [props.endValue, props.startValue, props.duration]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-bold text-foreground">{props.prefix}{count.toLocaleString()}{props.suffix}</div>
      <div className="text-sm text-muted-foreground mt-1">{props.title}</div>
    </div>
  );
}

function TestimonialWidget({ props }: { props: Record<string, any> }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: props.rating || 0 }).map((_, i) => <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />)}
      </div>
      <p className="text-foreground italic mb-4">"{props.quote}"</p>
      <div className="flex items-center gap-3">
        {props.avatar && <img src={props.avatar} alt={props.name} className="w-10 h-10 rounded-full object-cover" />}
        <div>
          <p className="text-sm font-semibold text-foreground">{props.name}</p>
          <p className="text-xs text-muted-foreground">{props.role}</p>
        </div>
      </div>
    </div>
  );
}

function TabsWidget({ props }: { props: Record<string, any> }) {
  const [active, setActive] = useState(0);
  const items = props.items || [];
  return (
    <div>
      <div className="flex border-b border-border mb-4 gap-1 overflow-x-auto">
        {items.map((item: any, i: number) => (
          <button key={i} onClick={() => setActive(i)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${active === i ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {item.title}
          </button>
        ))}
      </div>
      {items[active] && <div className="text-sm text-foreground">{items[active].content}</div>}
    </div>
  );
}

function AccordionWidget({ props }: { props: Record<string, any> }) {
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) => {
    if (props.allowMultiple) setOpen((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
    else setOpen((prev) => prev.includes(i) ? [] : [i]);
  };
  return (
    <div className="space-y-2">
      {(props.items || []).map((item: any, i: number) => (
        <div key={i} className="border border-border rounded-lg overflow-hidden">
          <button onClick={() => toggle(i)} className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground hover:bg-muted/50">
            {item.title}
            <ChevronDown size={16} className={`transition-transform ${open.includes(i) ? "rotate-180" : ""}`} />
          </button>
          {open.includes(i) && <div className="px-4 pb-4 text-sm text-muted-foreground">{item.content}</div>}
        </div>
      ))}
    </div>
  );
}

function AlertWidget({ props }: { props: Record<string, any> }) {
  const variants: Record<string, { bg: string; icon: React.ReactNode }> = {
    info: { bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", icon: <Info size={18} className="text-blue-600" /> },
    success: { bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800", icon: <CheckCircle2 size={18} className="text-green-600" /> },
    warning: { bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800", icon: <AlertTriangle size={18} className="text-yellow-600" /> },
    error: { bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: <XCircle size={18} className="text-red-600" /> },
  };
  const v = variants[props.variant] || variants.info;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${v.bg}`}>
      {v.icon}
      <div>
        {props.title && <p className="text-sm font-semibold text-foreground">{props.title}</p>}
        <p className="text-sm text-foreground/80">{props.content}</p>
      </div>
    </div>
  );
}

function IconListWidget({ props }: { props: Record<string, any> }) {
  return (
    <ul style={{ gap: props.spacing }} className="flex flex-col">
      {(props.items || []).map((item: any, i: number) => (
        <li key={i} className="flex items-center gap-3 text-sm text-foreground">
          <span style={{ color: props.iconColor || undefined }} className="text-lg">{item.icon}</span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function CTAWidget({ props }: { props: Record<string, any> }) {
  return (
    <div style={{ textAlign: props.align, backgroundColor: props.bgColor || undefined }} className="p-8 sm:p-12 rounded-2xl bg-primary/5 border border-primary/10">
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{props.heading}</h2>
      <p className="text-muted-foreground mb-6 max-w-xl mx-auto">{props.description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href={props.buttonUrl || "#"} className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          {props.buttonText}
        </a>
        {props.secondaryText && (
          <a href={props.secondaryUrl || "#"} className="inline-flex items-center px-6 py-3 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
            {props.secondaryText}
          </a>
        )}
      </div>
    </div>
  );
}

function PricingTableWidget({ props }: { props: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(props.items || []).map((plan: any, i: number) => (
        <div key={i} className={`p-6 rounded-xl border ${plan.highlighted ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border"} bg-card`}>
          <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
          <div className="mt-3 mb-4">
            <span className="text-3xl font-bold text-foreground">{plan.price}</span>
            <span className="text-muted-foreground text-sm">{plan.period}</span>
          </div>
          <ul className="space-y-2 mb-6">
            {(plan.features || []).map((f: string, fi: number) => (
              <li key={fi} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 size={14} className="text-primary shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <a href={plan.ctaUrl || "#"} className={`block text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.highlighted ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"}`}>
            {plan.cta}
          </a>
        </div>
      ))}
    </div>
  );
}

function CountdownWidget({ props }: { props: Record<string, any> }) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(props.targetDate).getTime() - Date.now());
      setRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [props.targetDate]);
  const units = [
    props.showDays !== false && { label: "Days", value: remaining.days },
    props.showHours !== false && { label: "Hours", value: remaining.hours },
    props.showMinutes !== false && { label: "Min", value: remaining.minutes },
    props.showSeconds !== false && { label: "Sec", value: remaining.seconds },
  ].filter(Boolean) as { label: string; value: number }[];
  return (
    <div className="text-center">
      {props.title && <h3 className="text-lg font-semibold text-foreground mb-4">{props.title}</h3>}
      <div className="flex items-center justify-center gap-3">
        {units.map((u) => (
          <div key={u.label} className="flex flex-col items-center p-4 rounded-xl bg-card border border-border min-w-[70px]">
            <span className="text-2xl font-bold text-foreground">{String(u.value).padStart(2, "0")}</span>
            <span className="text-xs text-muted-foreground mt-1">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBarWidget({ props }: { props: Record<string, any> }) {
  return (
    <div className="space-y-4">
      {(props.items || []).map((bar: any, i: number) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">{bar.label}</span>
            {props.showPercent && <span className="text-xs text-muted-foreground">{bar.value}%</span>}
          </div>
          <div className="w-full bg-muted rounded-full overflow-hidden" style={{ height: props.height || 8 }}>
            <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${bar.value}%`, backgroundColor: props.color || undefined }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoWidget({ props }: { props: Record<string, any> }) {
  const ratios: Record<string, string> = { "16:9": "56.25%", "4:3": "75%", "1:1": "100%", "9:16": "177.78%" };
  return (
    <div style={{ paddingBottom: ratios[props.aspectRatio] || "56.25%" }} className="relative w-full rounded-lg overflow-hidden">
      <iframe src={props.url} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
    </div>
  );
}

function ImageCarouselWidget({ props }: { props: Record<string, any> }) {
  const [current, setCurrent] = useState(0);
  const items = props.items || [];
  useEffect(() => {
    if (!props.autoplay || items.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % items.length), props.interval || 4000);
    return () => clearInterval(t);
  }, [props.autoplay, props.interval, items.length]);
  if (items.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-lg" style={{ height: props.height }}>
      <img src={items[current]?.src} alt={items[current]?.alt} className="w-full h-full object-cover transition-opacity duration-500" />
      {props.showArrows && items.length > 1 && (
        <>
          <button onClick={() => setCurrent((c) => (c - 1 + items.length) % items.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 text-foreground hover:bg-background"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrent((c) => (c + 1) % items.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 text-foreground hover:bg-background"><ChevronRight size={20} /></button>
        </>
      )}
      {props.showDots && items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_: any, i: number) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-background/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageGalleryWidget({ props }: { props: Record<string, any> }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${props.columns || 3}, 1fr)`, gap: props.gap }}>
      {(props.items || []).map((img: any, i: number) => (
        <img key={i} src={img.src} alt={img.alt} className="w-full aspect-square object-cover" style={{ borderRadius: props.borderRadius }} />
      ))}
    </div>
  );
}

function HeroSectionWidget({ props }: { props: Record<string, any> }) {
  return (
    <div
      style={{ textAlign: props.align, backgroundImage: props.bgImage ? `url(${props.bgImage})` : undefined, backgroundColor: props.bgColor || undefined, backgroundSize: "cover", backgroundPosition: "center" }}
      className="relative py-16 sm:py-24 px-6 rounded-2xl overflow-hidden"
    >
      {props.overlay && props.bgImage && <div className="absolute inset-0 bg-black/50" />}
      <div className="relative z-10 max-w-3xl mx-auto">
        <h1 className={`text-3xl sm:text-5xl font-bold mb-4 ${props.bgImage ? "text-white" : "text-foreground"}`}>{props.heading}</h1>
        <p className={`text-lg mb-8 ${props.bgImage ? "text-white/80" : "text-muted-foreground"}`}>{props.subheading}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {props.ctaText && <a href={props.ctaUrl || "#"} className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90">{props.ctaText}</a>}
          {props.secondaryCtaText && <a href={props.secondaryCtaUrl || "#"} className="px-6 py-3 rounded-lg border border-white/30 text-white font-medium text-sm hover:bg-white/10">{props.secondaryCtaText}</a>}
        </div>
      </div>
    </div>
  );
}

function ColumnsWidget({ props }: { props: Record<string, any> }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${props.count || 2}, 1fr)`, gap: props.gap }}>
      {(props.items || []).map((col: any, i: number) => (
        <div key={i} className="text-sm text-foreground">{col.content}</div>
      ))}
    </div>
  );
}

function FeaturesGridWidget({ props }: { props: Record<string, any> }) {
  return (
    <div>
      {props.heading && <h2 className="text-2xl font-bold text-foreground text-center mb-2">{props.heading}</h2>}
      {props.description && <p className="text-muted-foreground text-center mb-8">{props.description}</p>}
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${props.columns || 3}, 1fr)` }}>
        {(props.items || []).map((item: any, i: number) => (
          <div key={i} className="p-6 rounded-xl border border-border bg-card text-center">
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsBarWidget({ props }: { props: Record<string, any> }) {
  return (
    <div style={{ backgroundColor: props.bgColor || undefined }} className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 py-8 px-4 rounded-xl bg-muted/30">
      {(props.items || []).map((s: any, i: number) => (
        <div key={i} className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function TeamWidget({ props }: { props: Record<string, any> }) {
  return (
    <div>
      {props.heading && <h2 className="text-2xl font-bold text-foreground text-center mb-8">{props.heading}</h2>}
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${props.columns || 3}, 1fr)` }}>
        {(props.items || []).map((m: any, i: number) => (
          <div key={i} className="text-center p-4 rounded-xl border border-border bg-card">
            {m.avatar && <img src={m.avatar} alt={m.name} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" />}
            <h3 className="text-sm font-semibold text-foreground">{m.name}</h3>
            <p className="text-xs text-muted-foreground">{m.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineWidget({ props }: { props: Record<string, any> }) {
  return (
    <div>
      {props.heading && <h2 className="text-2xl font-bold text-foreground text-center mb-8">{props.heading}</h2>}
      <div className="relative pl-8 space-y-8">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
        {(props.items || []).map((ev: any, i: number) => (
          <div key={i} className="relative">
            <div className="absolute -left-5 top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
            <span className="text-xs text-muted-foreground">{ev.date}</span>
            <h3 className="text-sm font-semibold text-foreground">{ev.title}</h3>
            <p className="text-sm text-muted-foreground">{ev.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQWidget({ props }: { props: Record<string, any> }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {props.heading && <h2 className="text-2xl font-bold text-foreground text-center mb-8">{props.heading}</h2>}
      <div className="space-y-2 max-w-2xl mx-auto">
        {(props.items || []).map((item: any, i: number) => (
          <div key={i} className="border border-border rounded-lg">
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground">
              {item.question}
              <ChevronDown size={16} className={`transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <div className="px-4 pb-4 text-sm text-muted-foreground">{item.answer}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogoCloudWidget({ props }: { props: Record<string, any> }) {
  return (
    <div className="text-center">
      {props.heading && <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">{props.heading}</p>}
      <div className="flex flex-wrap items-center justify-center gap-8">
        {(props.items || []).map((c: any, i: number) => (
          <div key={i} className="text-muted-foreground text-sm font-medium">
            {c.logo ? <img src={c.logo} alt={c.name} className="h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" /> : c.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialIconsWidget({ props }: { props: Record<string, any> }) {
  const shapes: Record<string, string> = { circle: "rounded-full", rounded: "rounded-lg", square: "rounded-none" };
  return (
    <div style={{ textAlign: props.align }} className="flex flex-wrap gap-2 items-center justify-center">
      {(props.items || []).map((s: any, i: number) => (
        <a key={i} href={s.url || "#"} target="_blank" rel="noopener" className={`inline-flex items-center justify-center bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${shapes[props.shape] || "rounded-lg"}`} style={{ width: props.size + 16, height: props.size + 16, fontSize: props.size * 0.6 }}>
          {s.platform?.charAt(0).toUpperCase()}
        </a>
      ))}
    </div>
  );
}

function ToggleWidget({ props }: { props: Record<string, any> }) {
  return <AccordionWidget props={{ ...props, allowMultiple: true }} />;
}

// ─── Simple Markdown Parser ──────────────────────────────────────
function simpleMarkdown(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
    .replace(/\n/g, "<br/>");
}

// ─── Main Widget Renderer ────────────────────────────────────────
const RENDERERS: Record<string, React.FC<{ props: Record<string, any> }>> = {
  heading: HeadingWidget,
  text_editor: TextEditorWidget,
  image: ImageWidget,
  button: ButtonWidget,
  spacer: SpacerWidget,
  divider: DividerWidget,
  google_maps: GoogleMapsWidget,
  icon_box: IconBoxWidget,
  image_box: ImageBoxWidget,
  star_rating: StarRatingWidget,
  counter: CounterWidget,
  testimonial: TestimonialWidget,
  tabs: TabsWidget,
  accordion: AccordionWidget,
  toggle: ToggleWidget,
  social_icons: SocialIconsWidget,
  alert: AlertWidget,
  icon_list: IconListWidget,
  cta: CTAWidget,
  pricing_table: PricingTableWidget,
  countdown: CountdownWidget,
  progress_bar: ProgressBarWidget,
  video: VideoWidget,
  image_carousel: ImageCarouselWidget,
  image_gallery: ImageGalleryWidget,
  hero_section: HeroSectionWidget,
  columns: ColumnsWidget,
  features_grid: FeaturesGridWidget,
  stats_bar: StatsBarWidget,
  team: TeamWidget,
  timeline: TimelineWidget,
  faq: FAQWidget,
  logo_cloud: LogoCloudWidget,
};

export function WidgetRenderer({ widget }: { widget: WidgetInstance }) {
  const Component = RENDERERS[widget.type];
  if (!Component) return <div className="p-4 text-xs text-muted-foreground">Unknown widget: {widget.type}</div>;
  return <Component props={widget.props} />;
}

export default WidgetRenderer;
