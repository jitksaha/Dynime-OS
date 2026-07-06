import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Truck, ShoppingCart, Loader2, CheckSquare, X, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Order {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_address: string; customer_city: string | null; total: number; cod_amount: number;
  order_status: string; payment_status: string; courier_name: string | null;
  courier_tracking_id: string | null; notes: string | null; created_at: string;
}

interface CourierConfig {
  courier_key: string; display_name: string; is_enabled: boolean;
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

export default function ProductHubOrders() {
  const { tenantId, userId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [couriers, setCouriers] = useState<CourierConfig[]>([]);
  const [sendingCourier, setSendingCourier] = useState<string | null>(null);
  const [courierDialogOpen, setCourierDialogOpen] = useState(false);
  const [courierDialogOrderIds, setCourierDialogOrderIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "", customer_address: "",
    customer_city: "", customer_zone: "", customer_area: "", subtotal: 0, delivery_charge: 0, discount: 0, cod_amount: 0, notes: "",
  });

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState("confirmed");
  const [creating, setCreating] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchOrders = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("pdm_orders").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setOrders(data as Order[]);
  };

  const fetchCouriers = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("pdm_courier_configs").select("courier_key, display_name, is_enabled").eq("tenant_id", tenantId).eq("is_enabled", true);
    if (data) setCouriers(data as CourierConfig[]);
  };

  useEffect(() => { fetchOrders(); fetchCouriers(); }, [tenantId]);

  const handleCreate = async () => {
    if (!form.customer_name || !form.customer_phone || !form.customer_address) {
      toast.error("Name, phone, and address are required"); return;
    }
    setCreating(true);
    const total = form.subtotal + form.delivery_charge - form.discount;
    const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("pdm_orders").insert({
      ...form, total, order_number: orderNum, tenant_id: tenantId!, created_by: userId!,
    });
    if (error) { toast.error(error.message); setCreating(false); return; }
    toast.success("Order created");
    setDialogOpen(false);
    setForm({ customer_name: "", customer_phone: "", customer_email: "", customer_address: "", customer_city: "", customer_zone: "", customer_area: "", subtotal: 0, delivery_charge: 0, discount: 0, cod_amount: 0, notes: "" });
    fetchOrders();
    setCreating(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update for instant UI feedback
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, order_status: status } : o));
    const { error } = await supabase.from("pdm_orders").update({ order_status: status }).eq("id", id);
    if (error) {
      toast.error("Failed to update status: " + error.message);
      fetchOrders(); // revert on error
      return;
    }
    toast.success("Status updated");
  };

  const openCourierDialog = (orderIds: string[]) => {
    if (couriers.length === 0) {
      toast.error("No courier configured. Enable one in Settings first.");
      return;
    }
    setCourierDialogOrderIds(orderIds);
    setCourierDialogOpen(true);
  };

  const handleSendToCourier = async (courierKey: string) => {
    setSendingCourier(courierKey);
    try {
      const { data, error } = await supabase.functions.invoke("pos-send-courier", {
        body: { orderIds: courierDialogOrderIds, courierKey, tenantId },
      });
      // supabase.functions.invoke returns error for non-2xx OR network issues
      if (error) {
        // Try to parse the error body for a message
        const msg = typeof error === "object" && error.message ? error.message : String(error);
        toast.error(msg || "Failed to send to courier");
        return;
      }
      // Check if data itself contains an error (edge function returned 400 with JSON)
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const results = data?.results || [];
      const succeeded = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success);
      if (succeeded > 0) toast.success(`${succeeded} order(s) sent to courier`);
      if (failed.length > 0) {
        failed.forEach((f: any) => toast.error(`Order failed: ${f.message || "Unknown error"}`));
      }
      setCourierDialogOpen(false);
      setDetailOrder(null);
      clearSelection();
      fetchOrders();
    } catch (err: any) {
      console.error("Send to courier error:", err);
      toast.error(err.message || "Failed to send to courier");
    } finally {
      setSendingCourier(null);
    }
  };

  // Bulk selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk actions
  const handleBulkStatusChange = async () => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("pdm_orders").update({ order_status: bulkNewStatus }).in("id", ids);
    if (error) { toast.error(error.message); setBulkUpdating(false); return; }
    toast.success(`${ids.length} order(s) updated to ${bulkNewStatus}`);
    setBulkStatusDialogOpen(false);
    clearSelection();
    fetchOrders();
    setBulkUpdating(false);
  };

  const handleBulkSendCourier = () => {
    const ids = Array.from(selectedIds);
    // Filter out orders that already have a courier
    const eligibleIds = ids.filter((id) => {
      const order = orders.find((o) => o.id === id);
      return order && !order.courier_name;
    });
    if (eligibleIds.length === 0) {
      toast.error("All selected orders already have a courier assigned");
      return;
    }
    openCourierDialog(eligibleIds);
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_phone.includes(search);
    const matchStatus = statusFilter === "all" || o.order_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage sales and shipments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Order</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Order</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div><Label>Phone *</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
              <div><Label>Address *</Label><Textarea value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.customer_city} onChange={(e) => setForm({ ...form, customer_city: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Zone (Pathao)</Label><Input value={form.customer_zone} onChange={(e) => setForm({ ...form, customer_zone: e.target.value })} placeholder="e.g. 1" /></div>
                <div><Label>Area (RedX)</Label><Input value={form.customer_area} onChange={(e) => setForm({ ...form, customer_area: e.target.value })} placeholder="e.g. Dhaka" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Subtotal</Label><Input type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: +e.target.value })} /></div>
                <div><Label>Delivery Charge</Label><Input type="number" value={form.delivery_charge} onChange={(e) => setForm({ ...form, delivery_charge: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Discount</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} /></div>
                <div><Label>COD Amount</Label><Input type="number" value={form.cod_amount} onChange={(e) => setForm({ ...form, cod_amount: +e.target.value })} /></div>
              </div>
              <div className="text-right font-bold text-lg">Total: {formatPrice(form.subtotal + form.delivery_charge - form.discount)}</div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 flex-wrap"
          >
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => setBulkStatusDialogOpen(true)}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />Change Status
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkSendCourier}>
              <Truck className="h-3.5 w-3.5 mr-1.5" />Send to Courier
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
                <TableHead>Order #</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
                <TableHead>Courier</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} className={selectedIds.has(o.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(o.id)}
                      onCheckedChange={() => toggleSelect(o.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell className="font-medium">{o.customer_name}</TableCell>
                  <TableCell>{o.customer_phone}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(Number(o.total))}</TableCell>
                  <TableCell>
                    <Select value={o.order_status} onValueChange={(v) => handleStatusChange(o.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {o.courier_name ? <Badge variant="outline">{o.courier_name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    {!o.courier_name && (
                      <Button size="icon" variant="ghost" title="Send to Courier" onClick={() => openCourierDialog([o.id])}>
                        <Truck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setDetailOrder(o)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />No orders found
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order {detailOrder?.order_number}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Customer:</span> {detailOrder.customer_name}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {detailOrder.customer_phone}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {detailOrder.customer_address}</div>
                  <div><span className="text-muted-foreground">City:</span> {detailOrder.customer_city || "—"}</div>
                   <div><span className="text-muted-foreground">Total:</span> {formatPrice(Number(detailOrder.total))}</div>
                   <div><span className="text-muted-foreground">COD:</span> {formatPrice(Number(detailOrder.cod_amount))}</div>
                  <div><span className="text-muted-foreground">Payment:</span> {detailOrder.payment_status}</div>
                  {detailOrder.courier_name && <div><span className="text-muted-foreground">Courier:</span> {detailOrder.courier_name}</div>}
                  {detailOrder.courier_tracking_id && <div><span className="text-muted-foreground">Tracking:</span> {detailOrder.courier_tracking_id}</div>}
                </div>
                {detailOrder.notes && <div><span className="text-muted-foreground">Notes:</span> {detailOrder.notes}</div>}
              </div>
              {!detailOrder.courier_name && (
                <Button className="w-full" onClick={() => openCourierDialog([detailOrder.id])}>
                  <Truck className="h-4 w-4 mr-2" />Send to Courier
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Courier Selection Dialog */}
      <Dialog open={courierDialogOpen} onOpenChange={setCourierDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Select Courier ({courierDialogOrderIds.length} order{courierDialogOrderIds.length > 1 ? "s" : ""})</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {couriers.map((c) => (
              <Button
                key={c.courier_key}
                variant="outline"
                className="justify-start h-12"
                disabled={!!sendingCourier}
                onClick={() => handleSendToCourier(c.courier_key)}
              >
                {sendingCourier === c.courier_key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
                {c.display_name}
              </Button>
            ))}
            {couriers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No enabled couriers found. Enable one in Settings.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Status ({selectedIds.size} orders)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>New Status</Label>
              <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleBulkStatusChange} disabled={bulkUpdating}>
              {bulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply to {selectedIds.size} Order(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
