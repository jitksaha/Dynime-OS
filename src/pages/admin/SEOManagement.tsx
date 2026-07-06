import { useState, useEffect, memo } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Search, Save, Globe, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

// Extracted outside component to prevent re-creation on every render (fixes focus loss)
const SEOInputField = memo(({
  label, value, onChange, placeholder, maxLen, multiline, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; maxLen?: number; multiline?: boolean; hint?: string;
}) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {maxLen && (
        <span className={`text-[10px] ${value.length > maxLen ? "text-destructive" : "text-muted-foreground"}`}>
          {value.length}/{maxLen}
        </span>
      )}
    </div>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    )}
    {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
));
SEOInputField.displayName = "SEOInputField";

interface PageSEO {
  id: string;
  route_path: string;
  page_name: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  meta_image: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  canonical_url: string | null;
  robots: string | null;
}

export default function SEOManagement() {
  const [pages, setPages] = useState<PageSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Partial<PageSEO>>>({});

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data } = await supabase
      .from("page_seo")
      .select("*")
      .order("route_path");
    if (data) setPages(data as PageSEO[]);
    setLoading(false);
  };

  const getEdit = (id: string): Partial<PageSEO> => editData[id] || {};

  const updateField = (id: string, field: keyof PageSEO, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const handleSave = async (page: PageSEO) => {
    const changes = editData[page.id];
    if (!changes || Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }
    setSaving(page.id);
    const { error } = await supabase
      .from("page_seo")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", page.id);
    setSaving(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`SEO updated for ${page.page_name}`);
      setEditData((prev) => {
        const next = { ...prev };
        delete next[page.id];
        return next;
      });
      fetchPages();
    }
  };

  const filtered = pages.filter(
    (p) =>
      p.page_name.toLowerCase().includes(search.toLowerCase()) ||
      p.route_path.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SEO Management</h1>
          <p className="text-sm text-muted-foreground">Manage meta titles, descriptions, keywords, and social sharing tags for all pages</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{pages.length} pages</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages by name or route..."
          className="w-full h-10 rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((page) => {
          const isExpanded = expandedId === page.id;
          const edits = getEdit(page.id);
          const val = (field: keyof PageSEO) => (edits[field] as string) ?? (page[field] as string) ?? "";

          return (
            <div key={page.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : page.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{page.page_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{page.route_path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editData[page.id] && Object.keys(editData[page.id]).length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">unsaved</span>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border pt-4 space-y-5">
                  {/* Basic SEO */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic SEO</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SEOInputField
                        label="Meta Title"
                        value={val("meta_title")}
                        onChange={(v) => updateField(page.id, "meta_title", v)}
                        placeholder="Page title for search engines"
                        maxLen={60}
                        hint="Recommended: Under 60 characters"
                      />
                      <SEOInputField
                        label="Page Name"
                        value={val("page_name")}
                        onChange={(v) => updateField(page.id, "page_name", v)}
                        placeholder="Internal page name"
                      />
                    </div>
                    <div className="mt-3">
                      <SEOInputField
                        label="Meta Description"
                        value={val("meta_description")}
                        onChange={(v) => updateField(page.id, "meta_description", v)}
                        placeholder="Brief description for search results"
                        maxLen={160}
                        multiline
                        hint="Recommended: Under 160 characters"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <SEOInputField
                        label="Keywords"
                        value={val("meta_keywords")}
                        onChange={(v) => updateField(page.id, "meta_keywords", v)}
                        placeholder="keyword1, keyword2, keyword3"
                        hint="Comma-separated keywords"
                      />
                      <SEOInputField
                        label="Robots"
                        value={val("robots")}
                        onChange={(v) => updateField(page.id, "robots", v)}
                        placeholder="index, follow"
                        hint="e.g. index, follow | noindex, nofollow"
                      />
                    </div>
                    <div className="mt-3">
                      <SEOInputField
                        label="Meta Image URL"
                        value={val("meta_image")}
                        onChange={(v) => updateField(page.id, "meta_image", v)}
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                    <div className="mt-3">
                      <SEOInputField
                        label="Canonical URL"
                        value={val("canonical_url")}
                        onChange={(v) => updateField(page.id, "canonical_url", v)}
                        placeholder={`${window.location.origin}/page`}
                      />
                    </div>
                  </div>

                  {/* Open Graph */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Open Graph (Facebook, LinkedIn)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SEOInputField
                        label="OG Title"
                        value={val("og_title")}
                        onChange={(v) => updateField(page.id, "og_title", v)}
                        placeholder="Falls back to Meta Title"
                      />
                      <SEOInputField
                        label="OG Image URL"
                        value={val("og_image")}
                        onChange={(v) => updateField(page.id, "og_image", v)}
                        placeholder="https://example.com/og-image.png"
                      />
                    </div>
                    <div className="mt-3">
                      <SEOInputField
                        label="OG Description"
                        value={val("og_description")}
                        onChange={(v) => updateField(page.id, "og_description", v)}
                        placeholder="Falls back to Meta Description"
                        multiline
                      />
                    </div>
                  </div>

                  {/* Twitter */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Twitter Card</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SEOInputField
                        label="Twitter Title"
                        value={val("twitter_title")}
                        onChange={(v) => updateField(page.id, "twitter_title", v)}
                        placeholder="Falls back to Meta Title"
                      />
                      <SEOInputField
                        label="Twitter Image URL"
                        value={val("twitter_image")}
                        onChange={(v) => updateField(page.id, "twitter_image", v)}
                        placeholder="Falls back to Meta Image"
                      />
                    </div>
                    <div className="mt-3">
                      <SEOInputField
                        label="Twitter Description"
                        value={val("twitter_description")}
                        onChange={(v) => updateField(page.id, "twitter_description", v)}
                        placeholder="Falls back to Meta Description"
                        multiline
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {val("meta_title") && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Search Preview</h3>
                      <div className="bg-background border border-border rounded-lg p-4 max-w-lg">
                        <p className="text-sm text-primary truncate">{val("canonical_url") || `${window.location.origin}${page.route_path}`}</p>
                        <p className="text-base text-blue-600 font-medium truncate mt-0.5">
                          {page.route_path === "/" ? val("meta_title") : val("meta_title")}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {val("meta_description") || "No description set"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSave(page)}
                      disabled={saving === page.id}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving === page.id ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No pages found matching "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
