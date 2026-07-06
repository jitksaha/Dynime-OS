// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Package, Truck, Check, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function CustomerOrderTracking() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.tenant_id) return;
    (async () => {
      setLoading(true);
      // Use invoices as order proxy since pos_orders may not exist
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(100);
      // Map invoices to order-like structure
      setOrders((data || []).map((inv: any) => ({
        id: inv.id,
        order_number: inv.invoice_number,
        customer_name: inv.client_name,
        total: inv.total,
        status: inv.status === "paid" ? "delivered" : inv.status === "sent" ? "shipped" : "pending",
        created_at: inv.created_at,
      })));
      setLoading(false);
    })();
  }, [profile?.tenant_id]);

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
    pending: { icon: Clock, color: "text-amber-500" },
    processing: { icon: Package, color: "text-blue-500" },
    shipped: { icon: Truck, color: "text-primary" },
    delivered: { icon: Check, color: "text-emerald-500" },
    completed: { icon: Check, color: "text-emerald-500" },
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your order status and shipments</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-9 h-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <div key={order.id} className="border border-border rounded-xl bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("h-4 w-4", sc.color)} />
                    <span className="text-sm font-semibold text-foreground">{order.order_number || `#${order.id.slice(0, 8)}`}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                    order.status === "delivered" || order.status === "completed" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
                    order.status === "shipped" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                    "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                  )}>{order.status}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{order.customer_name || "—"}</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  <span className="font-medium text-foreground">${Number(order.total || 0).toFixed(2)}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 flex gap-1">
                  {["pending", "processing", "shipped", "delivered"].map((step, i) => {
                    const steps = ["pending", "processing", "shipped", "delivered"];
                    const currentIdx = steps.indexOf(order.status);
                    return (
                      <div
                        key={step}
                        className={cn(
                          "h-1 flex-1 rounded-full",
                          i <= currentIdx ? "bg-primary" : "bg-muted"
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
