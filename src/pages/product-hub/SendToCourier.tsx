import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";

interface Order {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_address: string; customer_city: string | null; total: number; cod_amount: number;
  order_status: string; courier_name: string | null;
}

interface CourierConfig {
  id: string; courier_key: string; display_name: string; is_enabled: boolean;
  is_sandbox: boolean; credentials: Record<string, string>;
}

export default function ProductHubSendToCourier() {
  const { tenantId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<CourierConfig[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      const [ordRes, courRes] = await Promise.all([
        supabase.from("pdm_orders").select("*").eq("tenant_id", tenantId).in("order_status", ["pending", "confirmed", "processing"]).is("courier_name", null).order("created_at", { ascending: false }),
        supabase.from("pdm_courier_configs").select("*").eq("tenant_id", tenantId).eq("is_enabled", true),
      ]);
      if (ordRes.data) setOrders(ordRes.data as Order[]);
      if (courRes.data) setCouriers(courRes.data as CourierConfig[]);
    };
    fetch();
  }, [tenantId]);

  const toggleOrder = (id: string) => {
    setSelectedOrders((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map((o) => o.id));
  };

  const handleSendToCourier = async () => {
    if (!selectedCourier || selectedOrders.length === 0) {
      toast.error("Select courier and at least one order"); return;
    }
    const courier = couriers.find((c) => c.courier_key === selectedCourier);
    if (!courier) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("pos-send-courier", {
        body: { orderIds: selectedOrders, courierKey: selectedCourier, tenantId },
      });
      if (error) throw error;
      const results = data?.results || [];
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.filter((r: any) => !r.success).length;
      if (successCount > 0) toast.success(`${successCount} order(s) sent to ${courier.display_name}`);
      if (failCount > 0) toast.error(`${failCount} order(s) failed`);
      // Refresh
      setSelectedOrders([]);
      const { data: refreshed } = await supabase.from("pdm_orders").select("*").eq("tenant_id", tenantId!).in("order_status", ["pending", "confirmed", "processing"]).is("courier_name", null);
      if (refreshed) setOrders(refreshed as Order[]);
    } catch (err: any) {
      toast.error(err.message || "Failed to send to courier");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Send to Courier</h1>
        <p className="text-muted-foreground">Dispatch orders to your configured couriers</p>
      </div>

      {couriers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No couriers configured</p>
          <p className="text-sm mt-1">Go to POS Settings to set up your courier integrations</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Select value={selectedCourier} onValueChange={setSelectedCourier}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select courier" /></SelectTrigger>
              <SelectContent>
                {couriers.map((c) => (
                  <SelectItem key={c.courier_key} value={c.courier_key}>
                    {c.display_name} {c.is_sandbox && <span className="text-amber-600">(Sandbox)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSendToCourier} disabled={sending || selectedOrders.length === 0 || !selectedCourier}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send {selectedOrders.length > 0 && `(${selectedOrders.length})`}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={selectedOrders.length === orders.length && orders.length > 0} onCheckedChange={toggleAll} /></TableHead>
                    <TableHead>Order #</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead><TableHead className="text-right">COD</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell><Checkbox checked={selectedOrders.includes(o.id)} onCheckedChange={() => toggleOrder(o.id)} /></TableCell>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>{o.customer_phone}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{o.customer_address}</TableCell>
                      <TableCell className="text-right">{formatPrice(o.cod_amount)}</TableCell>
                      <TableCell><Badge variant="outline">{o.order_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending orders to dispatch</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
