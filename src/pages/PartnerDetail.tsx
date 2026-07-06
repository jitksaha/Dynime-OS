// @ts-nocheck
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Globe, Mail, Phone, Star, Linkedin, Twitter, Instagram } from "lucide-react";

const tierColors: Record<string, string> = {
  platinum: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  silver: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  standard: "bg-muted text-muted-foreground",
};

const socialIcons: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
};

export default function PartnerDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner-detail", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const socialLinks = (partner?.social_links as Record<string, string>) || {};
  const services = (partner?.services as string[]) || [];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link to="/partners" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Partners
        </Link>

        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-20 w-20 rounded-2xl bg-muted" />
            <div className="h-8 w-1/2 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        ) : !partner ? (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-foreground">Partner not found</h2>
            <p className="text-muted-foreground mt-2">This partner may no longer be available.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {partner.logo_url ? (
                <img src={partner.logo_url} alt={partner.name} className="h-20 w-20 rounded-2xl object-cover border border-border" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{partner.name[0]}</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{partner.name}</h1>
                  {partner.is_featured && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary">{partner.category}</Badge>
                  <Badge className={`border-0 ${tierColors[partner.tier] || tierColors.standard}`}>{partner.tier}</Badge>
                  {partner.country && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> {partner.country}
                    </span>
                  )}
                </div>
                {partner.short_description && (
                  <p className="text-muted-foreground mt-3">{partner.short_description}</p>
                )}
              </div>
            </div>

            {/* Description */}
            {partner.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-3">About</h2>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{partner.description}</p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Services */}
              {services.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-3">Services</h2>
                    <div className="flex flex-wrap gap-2">
                      {services.map((s) => (
                        <Badge key={s} variant="outline" className="text-sm">{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact & Links */}
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h2 className="text-lg font-semibold text-foreground mb-3">Contact & Links</h2>
                  {partner.website && (
                    <a href={partner.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" /> {partner.website}
                    </a>
                  )}
                  {partner.contact_email && (
                    <a href={`mailto:${partner.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Mail className="h-4 w-4" /> {partner.contact_email}
                    </a>
                  )}
                  {partner.contact_phone && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" /> {partner.contact_phone}
                    </p>
                  )}
                  {Object.keys(socialLinks).length > 0 && (
                    <div className="flex gap-3 pt-2">
                      {Object.entries(socialLinks).map(([key, url]) => {
                        const Icon = socialIcons[key] || Globe;
                        return (
                          <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary/10 transition-colors">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tags */}
            {partner.tags && partner.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {partner.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
