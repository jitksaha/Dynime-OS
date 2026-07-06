// @ts-nocheck
import { useState, useCallback } from "react";
import { Search, Replace, AlertTriangle, CheckCircle2, Loader2, Database, FileText, Globe, Settings, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SearchMatch {
  id: string;
  table: string;
  column: string;
  recordId: string;
  label: string;
  context: string;
  matchText: string;
  selected: boolean;
}

interface SearchScope {
  key: string;
  label: string;
  icon: React.ElementType;
  table: string;
  columns: { name: string; label: string }[];
  labelColumn: string;
  enabled: boolean;
}

const DEFAULT_SCOPES: SearchScope[] = [
  {
    key: "pages", label: "Pages (CMS)", icon: FileText, table: "managed_pages",
    columns: [
      { name: "title", label: "Title" },
      { name: "slug", label: "Slug" },
      { name: "content", label: "Content" },
      { name: "seo_title", label: "SEO Title" },
      { name: "seo_description", label: "SEO Description" },
    ],
    labelColumn: "title", enabled: true,
  },
  {
    key: "blog", label: "Blog Posts", icon: FileText, table: "blog_posts",
    columns: [
      { name: "title", label: "Title" },
      { name: "content", label: "Content" },
      { name: "excerpt", label: "Excerpt" },
      { name: "seo_title", label: "SEO Title" },
      { name: "seo_description", label: "SEO Description" },
      { name: "seo_keywords", label: "SEO Keywords" },
      { name: "author_name", label: "Author" },
    ],
    labelColumn: "title", enabled: true,
  },
  {
    key: "seo", label: "SEO Metadata", icon: Globe, table: "seo_metadata",
    columns: [
      { name: "page_path", label: "Page Path" },
      { name: "title", label: "Title" },
      { name: "description", label: "Description" },
      { name: "keywords", label: "Keywords" },
      { name: "og_title", label: "OG Title" },
      { name: "og_description", label: "OG Description" },
      { name: "canonical_url", label: "Canonical URL" },
    ],
    labelColumn: "page_path", enabled: true,
  },
  {
    key: "settings", label: "Platform Settings", icon: Settings, table: "platform_settings",
    columns: [
      { name: "key", label: "Key" },
      { name: "value", label: "Value" },
    ],
    labelColumn: "key", enabled: true,
  },
  {
    key: "email_templates", label: "Email Templates", icon: FileText, table: "communication_templates",
    columns: [
      { name: "name", label: "Name" },
      { name: "subject", label: "Subject" },
      { name: "body", label: "Body" },
    ],
    labelColumn: "name", enabled: true,
  },
  {
    key: "nav_menus", label: "Navigation Menus", icon: LayoutDashboard, table: "nav_menu_items",
    columns: [
      { name: "label", label: "Label" },
      { name: "url", label: "URL" },
    ],
    labelColumn: "label", enabled: true,
  },
  {
    key: "blog_categories", label: "Blog Categories", icon: FileText, table: "blog_categories",
    columns: [
      { name: "name", label: "Name" },
      { name: "description", label: "Description" },
      { name: "seo_title", label: "SEO Title" },
      { name: "seo_description", label: "SEO Description" },
    ],
    labelColumn: "name", enabled: true,
  },
  {
    key: "departments", label: "Departments", icon: Database, table: "departments",
    columns: [
      { name: "name", label: "Name" },
      { name: "description", label: "Description" },
      { name: "head_name", label: "Head Name" },
    ],
    labelColumn: "name", enabled: false,
  },
  {
    key: "tenants", label: "Companies / Tenants", icon: Database, table: "tenants",
    columns: [
      { name: "name", label: "Name" },
      { name: "slug", label: "Slug" },
      { name: "industry", label: "Industry" },
    ],
    labelColumn: "name", enabled: false,
  },
  {
    key: "solutions", label: "Industry Solutions", icon: Globe, table: "industry_solutions",
    columns: [
      { name: "title", label: "Title" },
      { name: "subtitle", label: "Subtitle" },
      { name: "description", label: "Description" },
      { name: "slug", label: "Slug" },
    ],
    labelColumn: "title", enabled: false,
  },
];

function highlightMatch(text: string, searchTerm: string, caseSensitive: boolean): string {
  if (!searchTerm) return text;
  const flags = caseSensitive ? "g" : "gi";
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, flags), "【$1】");
}

export default function SearchReplace() {
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [scopes, setScopes] = useState<SearchScope[]>(DEFAULT_SCOPES);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleScope = (key: string) => {
    setScopes(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s));
  };

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) { toast.error("Enter a search term"); return; }
    const enabledScopes = scopes.filter(s => s.enabled);
    if (enabledScopes.length === 0) { toast.error("Enable at least one scope"); return; }

    setSearching(true);
    setMatches([]);
    const allMatches: SearchMatch[] = [];
    const pattern = `%${searchText}%`;

    for (const scope of enabledScopes) {
      try {
        const selectCols = ["id", scope.labelColumn, ...scope.columns.map(c => c.name)].filter((v, i, a) => a.indexOf(v) === i);
        const { data, error } = await supabase
          .from(scope.table as any)
          .select(selectCols.join(","))
          .or(scope.columns.map(c => `${c.name}.ilike.${pattern}`).join(","))
          .limit(50);

        if (error) {
          console.warn(`Skipped ${scope.table}:`, error.message);
          continue;
        }

        for (const row of (data || []) as any[]) {
          for (const col of scope.columns) {
            const val = row[col.name];
            if (val && typeof val === "string") {
              const check = caseSensitive ? val.includes(searchText) : val.toLowerCase().includes(searchText.toLowerCase());
              if (check) {
                const idx = caseSensitive ? val.indexOf(searchText) : val.toLowerCase().indexOf(searchText.toLowerCase());
                const start = Math.max(0, idx - 40);
                const end = Math.min(val.length, idx + searchText.length + 40);
                const context = (start > 0 ? "..." : "") + val.slice(start, end) + (end < val.length ? "..." : "");

                allMatches.push({
                  id: `${scope.table}-${row.id}-${col.name}`,
                  table: scope.table,
                  column: col.name,
                  recordId: row.id,
                  label: `${scope.label} → ${row[scope.labelColumn] || row.id} → ${col.label}`,
                  context,
                  matchText: val.slice(idx, idx + searchText.length),
                  selected: true,
                });
              }
            }
          }
        }
      } catch {
        console.warn(`Error searching ${scope.table}`);
      }
    }

    setMatches(allMatches);
    setSearched(true);
    setSearching(false);
    if (allMatches.length === 0) toast.info("No matches found");
  }, [searchText, scopes, caseSensitive]);

  const toggleMatch = (id: string) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));
  };

  const toggleAll = (selected: boolean) => {
    setMatches(prev => prev.map(m => ({ ...m, selected })));
  };

  const handleReplace = async () => {
    setConfirmOpen(false);
    const selected = matches.filter(m => m.selected);
    if (selected.length === 0) { toast.error("No matches selected"); return; }
    if (replaceText === searchText) { toast.error("Search and replace text are identical"); return; }

    setReplacing(true);
    let successCount = 0;
    let errorCount = 0;

    // Group by table+recordId+column to batch
    const grouped = new Map<string, SearchMatch>();
    for (const m of selected) {
      const key = `${m.table}::${m.recordId}::${m.column}`;
      if (!grouped.has(key)) grouped.set(key, m);
    }

    for (const [, match] of grouped) {
      try {
        // Read current value
        const { data: current } = await supabase
          .from(match.table as any)
          .select(match.column)
          .eq("id", match.recordId)
          .single();

        if (current) {
          const currentVal = (current as any)[match.column] as string;
          let newVal: string;
          if (caseSensitive) {
            newVal = currentVal.split(searchText).join(replaceText);
          } else {
            const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            newVal = currentVal.replace(new RegExp(escaped, "gi"), replaceText);
          }

          const { error } = await supabase
            .from(match.table as any)
            .update({ [match.column]: newVal } as any)
            .eq("id", match.recordId);

          if (error) { errorCount++; } else { successCount++; }
        }
      } catch {
        errorCount++;
      }
    }

    setReplacing(false);
    toast.success(`Replaced in ${successCount} field(s)${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
    // Re-search to refresh
    if (successCount > 0) handleSearch();
  };

  const selectedCount = matches.filter(m => m.selected).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-brand">Search & Replace</h1>
        <p className="text-sm text-muted-foreground mt-1">Find and replace text across pages, settings, blog, SEO metadata, templates, and database records.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Scope selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Search Scope</CardTitle>
            <CardDescription className="text-xs">Select which areas to search</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {scopes.map(scope => {
              const Icon = scope.icon;
              return (
                <label key={scope.key} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox checked={scope.enabled} onCheckedChange={() => toggleScope(scope.key)} />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{scope.label}</span>
                </label>
              );
            })}
          </CardContent>
        </Card>

        {/* Main panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search inputs */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Search className="h-3.5 w-3.5" /> Find
                  </Label>
                  <Input
                    placeholder="Text to find..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Replace className="h-3.5 w-3.5" /> Replace with
                  </Label>
                  <Input
                    placeholder="Replacement text..."
                    value={replaceText}
                    onChange={e => setReplaceText(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={caseSensitive} onCheckedChange={setCaseSensitive} id="case" />
                  <Label htmlFor="case" className="text-sm">Case sensitive</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} disabled={searching || !searchText.trim()}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    Search
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={replacing || selectedCount === 0 || !replaceText}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {replacing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Replace className="h-4 w-4 mr-2" />}
                    Replace ({selectedCount})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {searched && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {matches.length} Match{matches.length !== 1 ? "es" : ""} Found
                  </CardTitle>
                  {matches.length > 0 && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>Select All</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Deselect All</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {matches.length > 0 && (
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <div className="divide-y divide-border">
                      {matches.map(match => (
                        <label
                          key={match.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={match.selected}
                            onCheckedChange={() => toggleMatch(match.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] shrink-0">{match.table}</Badge>
                              <span className="text-sm font-medium truncate">{match.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono break-all leading-relaxed">
                              {match.context.split("【").map((part, i) => {
                                if (i === 0) return part;
                                const [highlighted, rest] = part.split("】");
                                return (
                                  <span key={i}>
                                    <mark className="bg-primary/20 text-primary font-bold rounded px-0.5">{highlighted}</mark>
                                    {rest}
                                  </span>
                                );
                              })}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Replace
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to replace <strong>"{searchText}"</strong> with <strong>"{replaceText}"</strong> in <strong>{selectedCount}</strong> selected match{selectedCount !== 1 ? "es" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Replace All Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
