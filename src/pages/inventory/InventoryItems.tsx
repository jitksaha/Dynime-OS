// @ts-nocheck
import { useState, useEffect } from "react";
import { Package, Plus, Search, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import FormDialog from "@/components/FormDialog";

const CATEGORIES = ["General", "Raw Material", "Finished Goods", "Spare Parts", "Consumables"];

export default function InventoryItems() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const fetchItems = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("name");
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [profile?.tenant_id]);

  const handleSave = async (values: Record<string, string>) => {
    if (!profile?.tenant_id || !user?.id) return;
    const payload = {
      tenant_id: profile.tenant_id,
      name: values.name,
      sku: values.sku,
      category: values.category || "General",
      unit: values.unit || "pcs",
      current_stock: Number(values.current_stock) || 0,
      reorder_level: Number(values.reorder_level) || 10,
      unit_cost: Number(values.unit_cost) || 0,
      selling_price: Number(values.selling_price) || 0,
      warehouse: values.warehouse || "Main",
      barcode: values.barcode || null,
      created_by: user.id,
    };

    if (editItem) {
      const { error } = await supabase.from("inventory_items").update(payload).eq("id", editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Item updated");
    } else {
      const { error } = await supabase.from("inventory_items").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Item added");
    }
    setEditItem(null);
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchItems(); }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.current_stock <= i.reorder_level);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Inventory</h1>
          <p className="text-sm text-muted-foreground">{items.length} items · {lowStock.length} low stock</p>
        </div>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning font-medium">{lowStock.length} items below reorder level</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-muted-foreground">
              <th className="text-left p-3 font-medium">Item</th>
              <th className="text-left p-3 font-medium">SKU</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-right p-3 font-medium">Stock</th>
              <th className="text-right p-3 font-medium">Unit Cost</th>
              <th className="text-left p-3 font-medium">Warehouse</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{item.name}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{item.sku}</td>
                  <td className="p-3"><Badge variant="secondary">{item.category}</Badge></td>
                  <td className="p-3 text-right">
                    <span className={item.current_stock <= item.reorder_level ? "text-destructive font-semibold" : "text-foreground"}>
                      {item.current_stock} {item.unit}
                    </span>
                  </td>
                  <td className="p-3 text-right text-muted-foreground">${Number(item.unit_cost).toFixed(2)}</td>
                  <td className="p-3 text-muted-foreground">{item.warehouse}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(item); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No items found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null); }}
        title={editItem ? "Edit Item" : "Add Item"}
        defaultValues={editItem ? { name: editItem.name, sku: editItem.sku, category: editItem.category, unit: editItem.unit, current_stock: String(editItem.current_stock), reorder_level: String(editItem.reorder_level), unit_cost: String(editItem.unit_cost), selling_price: String(editItem.selling_price), warehouse: editItem.warehouse, barcode: editItem.barcode || "" } : undefined}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "sku", label: "SKU", required: true },
          { name: "category", label: "Category", type: "select", options: CATEGORIES },
          { name: "unit", label: "Unit" },
          { name: "current_stock", label: "Current Stock", type: "number" },
          { name: "reorder_level", label: "Reorder Level", type: "number" },
          { name: "unit_cost", label: "Unit Cost", type: "number" },
          { name: "selling_price", label: "Selling Price", type: "number" },
          { name: "warehouse", label: "Warehouse" },
          { name: "barcode", label: "Barcode" },
        ]}
        onSubmit={handleSave}
      />
    </div>
  );
}
