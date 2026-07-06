// @ts-nocheck
import { useState, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  Search, Plus, Edit2, Trash2, Globe, Star, ExternalLink, Eye, GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORIES = ["technology", "consulting", "reseller", "integration", "agency", "financial", "logistics", "other"];
const TYPES = ["technology", "referral", "reseller", "strategic", "integration", "channel", "affiliate"];
const TIERS = ["platinum", "gold", "silver", "standard"];

const emptyPartner = {
  name: "", slug: "", logo_url: "", website: "", description: "", short_description: "",
  category: "technology", partner_type: "technology", tier: "standard",
  contact_name: "", contact_email: "", contact_phone: "", country: "",
  is_featured: false, is_active: true, sort_order: 0, tags: [] as string[],
};

export default function PartnerManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyPartner });
  const [tagsInput, setTagsInput] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (vals: any) => {
      const payload = {
        ...vals,
        slug: vals.slug || vals.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        tags: vals.tags?.length ? vals.tags : null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("partners").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Partner updated" : "Partner created");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partner deleted");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("partners").update({ is_active: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-partners"] }),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("partners").update({ is_featured: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-partners"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyPartner });
    setTagsInput("");
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name || "", slug: p.slug || "", logo_url: p.logo_url || "", website: p.website || "",
      description: p.description || "", short_description: p.short_description || "",
      category: p.category || "technology", partner_type: p.partner_type || "technology",
      tier: p.tier || "standard", contact_name: p.contact_name || "",
      contact_email: p.contact_email || "", contact_phone: p.contact_phone || "",
      country: p.country || "", is_featured: p.is_featured || false,
      is_active: p.is_active ?? true, sort_order: p.sort_order || 0,
      tags: p.tags || [],
    });
    setTagsInput((p.tags || []).join(", "));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    saveMutation.mutate({ ...form, tags });
  };

  const filtered = partners.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: partners.length,
    active: partners.filter((p: any) => p.is_active).length,
    featured: partners.filter((p: any) => p.is_featured).length,
    categories: new Set(partners.map((p: any) => p.category)).size,
  };

  const tierColor: Record<string, string> = {
    platinum: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    gold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    silver: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    standard: "bg-muted text-muted-foreground",
  };

  const PartnerApplications = lazy(() => import("./PartnerApplications"));
  const [mainTab, setMainTab] = useState("partners");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partner Management</h1>
          <p className="text-muted-foreground mt-1">Manage your partners directory and applications</p>
        </div>
        {mainTab === "partners" && (
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Partner</Button>
        )}
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-6">
          <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading...</div>}>
            <PartnerApplications />
          </Suspense>
        </TabsContent>

        <TabsContent value="partners" className="mt-6 space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Partners", value: stats.total, icon: Globe },
          { label: "Active", value: stats.active, icon: Eye },
          { label: "Featured", value: stats.featured, icon: Star },
          { label: "Categories", value: stats.categories, icon: GripVertical },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No partners found</TableCell></TableRow>
                ) : (
                  filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.name} className="h-9 w-9 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {p.name[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            {p.website && (
                              <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-0.5">
                                <ExternalLink className="h-3 w-3" /> {new URL(p.website).hostname}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${tierColor[p.tier] || tierColor.standard}`}>{p.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.country || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={p.is_featured}
                          onCheckedChange={(val) => toggleFeatured.mutate({ id: p.id, val })}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={(val) => toggleActive.mutate({ id: p.id, val })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Partner" : "Add New Partner"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
              <TabsTrigger value="contact" className="flex-1">Contact</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Partner Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Short Description</Label>
                <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} maxLength={150} />
              </div>
              <div className="space-y-1.5">
                <Label>Full Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tags (comma separated)</Label>
                <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. payments, api, saas" />
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Partner Type</Label>
                  <Select value={form.partner_type} onValueChange={(v) => setForm({ ...form, partner_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tier</Label>
                  <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                  <Label>Featured</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing?.id ? "Update Partner" : "Create Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Partner</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this partner? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
