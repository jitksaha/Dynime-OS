// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { Search, Globe, Star, Filter, Handshake, ArrowRight, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { ModuleGrid } from "@/components/landing/ModuleGrid";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "technology", label: "Technology" },
  { value: "consulting", label: "Consulting" },
  { value: "reseller", label: "Reseller" },
  { value: "integration", label: "Integration" },
  { value: "agency", label: "Agency" },
  { value: "financial", label: "Financial" },
  { value: "logistics", label: "Logistics" },
  { value: "other", label: "Other" },
];

const TIERS = [
  { value: "all", label: "All Tiers" },
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "standard", label: "Standard" },
];

const tierColors: Record<string, string> = {
  platinum: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  silver: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  standard: "bg-muted text-muted-foreground",
};

const tierGradients: Record<string, string> = {
  platinum: "from-violet-500/10 to-violet-600/5 border-violet-200 dark:border-violet-800/40",
  gold: "from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800/40",
  silver: "from-slate-300/20 to-slate-400/5 border-slate-200 dark:border-slate-700",
  standard: "from-muted/50 to-muted/20 border-border",
};

export default function Partners() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [tier, setTier] = useState("all");

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", category, tier],
    queryFn: async () => {
      let q = supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order")
        .order("name");
      if (category !== "all") q = q.eq("category", category);
      if (tier !== "all") q = q.eq("tier", tier);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const filtered = partners.filter(
    (p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.short_description || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const featured = filtered.filter((p: any) => p.is_featured);
  const rest = filtered.filter((p: any) => !p.is_featured);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center relative z-10">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">🤝 Partner Ecosystem</Badge>
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
            Our Trusted Partners
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Discover our network of technology, consulting, and integration partners helping businesses grow worldwide.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search partners by name, service, or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-card/80 backdrop-blur-sm"
              />
            </div>
            <Link to="/partners/apply">
              <Button variant="outline" className="gap-2 h-11">
                <Handshake className="h-4 w-4" /> Become a Partner
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[170px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-[150px]">
                <Star className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} partner{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Featured Carousel */}
        {featured.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Featured Partners
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featured.map((p: any) => (
                <PartnerCard key={p.id} partner={p} featured />
              ))}
            </div>
          </div>
        )}

        {/* All Partners Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-muted" />
                  <div className="h-5 w-2/3 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rest.length === 0 && featured.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Globe className="h-14 w-14 text-muted-foreground/20 mb-4" />
              <h3 className="font-semibold text-foreground text-lg">No partners found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
            </CardContent>
          </Card>
        ) : rest.length > 0 ? (
          <>
            {featured.length > 0 && (
              <h2 className="text-lg font-semibold text-foreground">All Partners</h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((p: any) => (
                <PartnerCard key={p.id} partner={p} />
              ))}
            </div>
          </>
        ) : null}

        {/* CTA */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">Want to become a partner?</h3>
              <p className="text-muted-foreground mt-1">Join our partner program and unlock exclusive benefits, resources, and growth opportunities.</p>
            </div>
            <Link to="/partners/apply">
              <Button size="lg" className="gap-2 shrink-0">
                Apply Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <ModuleGrid
        eyebrow="Resell the platform"
        title="Every module your clients could ask for"
        description="Partners earn recurring commissions on the entire catalog — not just the modules you helped configure."
      />
      <PublicFooter />
    </div>
  );
}

function PartnerCard({ partner, featured = false }: { partner: any; featured?: boolean }) {
  const gradient = tierGradients[partner.tier] || tierGradients.standard;

  return (
    <Link to={`/partners/${partner.slug}`}>
      <Card className={`group hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${
        featured ? `bg-gradient-to-br ${gradient} ring-1 ring-primary/10` : "hover:border-primary/20"
      }`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="h-12 w-12 rounded-xl object-cover border border-border shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <span className="text-lg font-bold text-primary">{partner.name[0]}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{partner.name}</h3>
                {partner.is_featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{partner.category}</Badge>
                <Badge className={`text-[10px] px-1.5 py-0 border-0 ${tierColors[partner.tier] || tierColors.standard}`}>
                  {partner.tier}
                </Badge>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
          </div>

          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {partner.short_description || partner.description || "No description available"}
          </p>

          {partner.country && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Globe className="h-3 w-3" /> {partner.country}
            </p>
          )}

          {partner.tags && partner.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {partner.tags.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
              ))}
              {partner.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{partner.tags.length - 3}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
