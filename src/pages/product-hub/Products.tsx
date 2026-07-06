import { useEffect, useState, useRef } from "react";
import { generateBarcode } from "@/components/pos/BarcodeGenerator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, Package, CheckSquare, X, Loader2, ImagePlus, XCircle, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
  id: string; name: string; sku: string | null; barcode: string | null; category: string; price: number;
  cost_price: number; stock_quantity: number; unit: string; weight_grams: number;
  is_active: boolean; image_url: string | null; created_at: string;
}

export default function ProductHubProducts() {
  const { tenantId, userId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", barcode: "", category: "General", price: 0, cost_price: 0, stock_quantity: 0, unit: "pcs", weight_grams: 0 });

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkField, setBulkField] = useState<string>("price");
  const [bulkValue, setBulkValue] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("active");

  const fetchProducts = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("pdm_products").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setProducts(data as Product[]);
  };

  useEffect(() => { fetchProducts(); }, [tenantId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return existingImageUrl;
    setUploadingImage(true);
    try {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `${tenantId}/${productId}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error("Image upload failed: " + err.message);
      return existingImageUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        const imageUrl = await uploadImage(editing.id);
        const { error } = await supabase.from("pdm_products").update({ ...form, image_url: imageUrl }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { data: inserted, error } = await supabase.from("pdm_products").insert({ ...form, tenant_id: tenantId!, created_by: userId! }).select().single();
        if (error) throw error;
        if (imageFile && inserted) {
          const imageUrl = await uploadImage(inserted.id);
          if (imageUrl) {
            await supabase.from("pdm_products").update({ image_url: imageUrl }).eq("id", inserted.id);
          }
        }
        toast.success("Product added");
      }
      setDialogOpen(false); setEditing(null);
      setForm({ name: "", sku: "", barcode: "", category: "General", price: 0, cost_price: 0, stock_quantity: 0, unit: "pcs", weight_grams: 0 });
      clearImage();
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku || "", barcode: p.barcode || "", category: p.category, price: p.price, cost_price: p.cost_price, stock_quantity: p.stock_quantity, unit: p.unit, weight_grams: p.weight_grams });
    setExistingImageUrl(p.image_url);
    setImagePreview(p.image_url);
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleToggleActive = async (p: Product) => {
    await supabase.from("pdm_products").update({ is_active: !p.is_active }).eq("id", p.id);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("pdm_products").delete().eq("id", id);
    toast.success("Product deleted"); fetchProducts();
  };

  // Bulk selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Bulk actions
  const handleBulkEdit = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    const ids = Array.from(selectedIds);
    let updatePayload: Record<string, any> = {};

    if (bulkField === "price" && bulkValue) {
      updatePayload.price = parseFloat(bulkValue);
    } else if (bulkField === "cost_price" && bulkValue) {
      updatePayload.cost_price = parseFloat(bulkValue);
    } else if (bulkField === "stock_quantity" && bulkValue) {
      updatePayload.stock_quantity = parseInt(bulkValue);
    } else if (bulkField === "category" && bulkValue) {
      updatePayload.category = bulkValue;
    } else if (bulkField === "status") {
      updatePayload.is_active = bulkStatus === "active";
    } else {
      toast.error("Please enter a value"); setBulkSaving(false); return;
    }

    const { error } = await supabase.from("pdm_products").update(updatePayload).in("id", ids);
    if (error) { toast.error(error.message); setBulkSaving(false); return; }
    toast.success(`${ids.length} product(s) updated`);
    setBulkDialogOpen(false);
    setBulkValue("");
    clearSelection();
    fetchProducts();
    setBulkSaving(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} product(s)?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("pdm_products").delete().in("id", ids);
    if (error) { toast.error(error.message); setDeleting(false); return; }
    toast.success(`${ids.length} product(s) deleted`);
    clearSelection();
    fetchProducts();
    setDeleting(false);
  };

  const handleBulkToggleStatus = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("pdm_products").update({ is_active: active }).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} product(s) ${active ? "activated" : "deactivated"}`);
    clearSelection();
    fetchProducts();
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())));

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); clearImage(); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Product</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              {/* Image Upload */}
              <div>
                <Label>Product Image</Label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                {imagePreview ? (
                  <div className="relative mt-2 w-full h-40 rounded-lg border border-border overflow-hidden bg-muted/30">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Click to upload image (max 5MB)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Barcode</Label>
                  <div className="flex gap-1.5">
                    <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or enter barcode" className="flex-1" />
                    <Button type="button" variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={() => setForm({ ...form, barcode: generateBarcode() })} title="Auto-generate barcode">
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div><Label>Weight (grams)</Label><Input type="number" value={form.weight_grams} onChange={(e) => setForm({ ...form, weight_grams: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
                <div><Label>Cost Price</Label><Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} /></div>
                <div><Label>Stock</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: +e.target.value })} /></div>
              </div>
              <Button onClick={handleSave} disabled={saving || uploadingImage}>
                {(saving || uploadingImage) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {uploadingImage ? "Uploading image..." : editing ? "Update" : "Add"} Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
          >
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => setBulkDialogOpen(true)}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />Bulk Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkToggleStatus(true)}>Activate</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkToggleStatus(false)}>Deactivate</Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Barcode</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className={selectedIds.has(p.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted/50 border border-border overflow-hidden flex items-center justify-center shrink-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.sku || "-"}</TableCell>
                  <TableCell>
                    {p.barcode ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                        <ScanLine className="h-3 w-3 text-muted-foreground" />
                        {p.barcode}
                      </span>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.stock_quantity < 10 ? "destructive" : "secondary"}>{p.stock_quantity}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={p.is_active} onCheckedChange={() => handleToggleActive(p)} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />No products found
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Bulk Edit {selectedIds.size} Product(s)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Field to update</Label>
              <Select value={bulkField} onValueChange={(v) => { setBulkField(v); setBulkValue(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="cost_price">Cost Price</SelectItem>
                  <SelectItem value="stock_quantity">Stock Quantity</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="status">Status (Active/Inactive)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkField === "status" ? (
              <div>
                <Label>Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : bulkField === "category" ? (
              <div>
                <Label>Category</Label>
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="mt-2" placeholder="Or type a new category" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} />
              </div>
            ) : (
              <div>
                <Label>New value</Label>
                <Input type="number" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} placeholder={`Enter new ${bulkField.replace("_", " ")}`} />
              </div>
            )}

            <Button className="w-full" onClick={handleBulkEdit} disabled={bulkSaving}>
              {bulkSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply to {selectedIds.size} Product(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}