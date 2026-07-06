import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormDialog from "@/components/FormDialog";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-primary/10 text-primary",
  Approved: "bg-success/10 text-success",
  Received: "bg-accent text-accent-foreground",
  Cancelled: "bg-destructive/10 text-destructive",
};

export default function PurchaseOrders() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [poDialog, setPoDialog] = useState(false);
  const [vendorDialog, setVendorDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const tid = profile?.tenant_id;
  const uid = user?.id;

  const fetchData = async () => {
    if (!tid) return;
    const [{ data: o }, { data: v }] = await Promise.all([
      supabase.from("purchase_orders").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }),
      supabase.from("vendors").select("*").eq("tenant_id", tid).order("name"),
    ]);
    if (o) setOrders(o);
    if (v) setVendors(v);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tid]);

  const handleSavePO = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, po_number: v.po_number, status: v.status || "Draft", vendor_id: v.vendor_id || null, total: Number(v.total) || 0, notes: v.notes || null, expected_date: v.expected_date || null, created_by: uid };
    if (editItem) {
      const { error } = await supabase.from("purchase_orders").update(payload).eq("id", editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success("PO updated");
    } else {
      const { error } = await supabase.from("purchase_orders").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("PO created");
    }
    setEditItem(null); setPoDialog(false); fetchData();
  };

  const handleSaveVendor = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, name: v.name, email: v.email || null, phone: v.phone || null, category: v.category || "General", payment_terms: v.payment_terms || "Net 30", created_by: uid };
    const { error } = await supabase.from("vendors").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Vendor added"); setVendorDialog(false); fetchData();
  };

  const handleDeletePO = async (id: string) => {
    await supabase.from("purchase_orders").delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };

  const filteredOrders = orders.filter(o => o.po_number.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /> Procurement</h1>
          <p className="text-sm text-muted-foreground">{orders.length} purchase orders · {vendors.length} vendors</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="orders">Purchase Orders</TabsTrigger><TabsTrigger value="vendors">Vendors</TabsTrigger></TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search POs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button onClick={() => { setEditItem(null); setPoDialog(true); }}><Plus className="h-4 w-4 mr-2" /> New PO</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid gap-3">
              {filteredOrders.map(po => (
                <div key={po.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div>
                    <p className="font-semibold text-foreground">{po.po_number}</p>
                    <p className="text-xs text-muted-foreground">{po.expected_date ? `Expected: ${po.expected_date}` : "No date set"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">${Number(po.total).toLocaleString()}</span>
                    <Badge className={STATUS_COLORS[po.status] || ""}>{po.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => { setEditItem(po); setPoDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePO(po.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && <p className="text-center py-8 text-muted-foreground">No purchase orders yet</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setVendorDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Vendor</Button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map(v => (
              <div key={v.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span className="font-semibold text-foreground">{v.name}</span></div>
                <p className="text-xs text-muted-foreground">{v.email}</p>
                <div className="flex gap-2"><Badge variant="secondary">{v.category}</Badge><Badge variant="outline">{v.payment_terms}</Badge></div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog open={poDialog} onClose={() => { setPoDialog(false); setEditItem(null); }} title={editItem ? "Edit PO" : "New Purchase Order"}
        defaultValues={editItem ? { po_number: editItem.po_number, status: editItem.status, total: String(editItem.total || 0), notes: editItem.notes || "", expected_date: editItem.expected_date || "" } : undefined}
        fields={[
          { name: "po_number", label: "PO Number", required: true },
          { name: "total", label: "Total Amount", type: "number" },
          { name: "status", label: "Status", type: "select", options: ["Draft", "Sent", "Approved", "Received", "Cancelled"] },
          { name: "expected_date", label: "Expected Date", type: "date" },
          { name: "notes", label: "Notes" },
        ]}
        onSubmit={handleSavePO}
      />
      <FormDialog open={vendorDialog} onClose={() => setVendorDialog(false)} title="Add Vendor"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone" },
          { name: "category", label: "Category", type: "select", options: ["General", "IT", "Office Supplies", "Services", "Manufacturing"] },
          { name: "payment_terms", label: "Payment Terms", type: "select", options: ["Net 15", "Net 30", "Net 60", "Due on Receipt"] },
        ]}
        onSubmit={handleSaveVendor}
      />
    </div>
  );
}
