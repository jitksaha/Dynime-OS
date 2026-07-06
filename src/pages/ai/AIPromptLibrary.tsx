import { useState, useEffect } from "react";
import {
  BookOpen, Search, Star, Plus, Trash2, Copy, Loader2, Sparkles,
  MessageSquare, DollarSign, Users, BarChart, Target, FileText,
  CheckSquare, Headphones, TrendingUp, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

interface Prompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  is_global: boolean;
  is_shared: boolean;
  use_count: number;
  created_by: string | null;
}

const CATEGORIES = [
  "All", "General", "Sales", "Accounting", "HR", "Marketing",
  "Finance", "Projects", "Support", "Operations", "Strategy", "Communication", "Productivity",
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Sales: TrendingUp, Accounting: DollarSign, HR: Users, Marketing: Target,
  Finance: BarChart, Projects: CheckSquare, Support: Headphones,
  Operations: Settings, Strategy: Star, Communication: MessageSquare,
  Productivity: FileText, General: Sparkles,
};

export default function AIPromptLibrary() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, [tenantId]);

  const loadPrompts = async () => {
    const { data } = await supabase
      .from("ai_prompt_library")
      .select("*")
      .order("use_count", { ascending: false });
    setPrompts((data as any[]) || []);
    setLoading(false);
  };

  const filteredPrompts = prompts.filter(p => {
    const matchesCat = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.prompt.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCreate = async () => {
    if (!newTitle.trim() || !newPrompt.trim() || !tenantId) return;
    setSaving(true);
    await supabase.from("ai_prompt_library").insert({
      tenant_id: tenantId,
      created_by: user?.id,
      title: newTitle.trim(),
      prompt: newPrompt.trim(),
      category: newCategory,
    } as any);
    toast.success("Prompt saved!");
    setCreateOpen(false);
    setNewTitle("");
    setNewPrompt("");
    loadPrompts();
    setSaving(false);
  };

  const handleCopy = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ai_prompt_library").delete().eq("id", id);
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast.success("Prompt deleted");
  };

  const handleUsePrompt = async (prompt: Prompt) => {
    await supabase.from("ai_prompt_library").update({ use_count: prompt.use_count + 1 } as any).eq("id", prompt.id);
    handleCopy(prompt.prompt);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Prompt Library</h1>
            <p className="text-xs text-muted-foreground">
              {prompts.length} prompts • Pre-built + Custom templates
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/dynime-ai">
            <Button variant="outline" size="sm" className="text-xs">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Open Chat
            </Button>
          </Link>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Prompt
          </Button>
        </div>
      </div>

      {/* Search + Categories */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPrompts.map(prompt => {
          const CatIcon = CATEGORY_ICONS[prompt.category] || Sparkles;
          return (
            <div key={prompt.id} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CatIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{prompt.category}</Badge>
                </div>
                {prompt.is_global && <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-0">Built-in</Badge>}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{prompt.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{prompt.prompt}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{prompt.use_count} uses</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleUsePrompt(prompt)}>
                    <Copy className="h-3 w-3 mr-1" /> Use
                  </Button>
                  {!prompt.is_global && prompt.created_by === user?.id && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(prompt.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Prompt Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md z-[60]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Create Custom Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Title</Label>
              <Input placeholder="e.g., Weekly Sales Review" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[70]">
                  {CATEGORIES.filter(c => c !== "All").map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prompt Template</Label>
              <Textarea
                placeholder="Write your prompt template... Use [brackets] for variables."
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <Button onClick={handleCreate} disabled={saving || !newTitle.trim() || !newPrompt.trim()} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Save Prompt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
