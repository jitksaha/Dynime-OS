// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft, Plus, CheckCircle2, XCircle, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Branch = { id: string; name: string; is_default: boolean };
type Product = { id: string; name: string; sku?: string | null };
type LineItem = { product_id: string; quantity: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "secondary",
  approved: "default",
  in_transit: "default",
  received: "default",
  cancelled: "destructive",
};

export default function StockTransfers() {
  const { tenantId, userId, activeBranchId, isAllBranches } = useTenant();
  const { branches: allBranches } = useActiveBranch();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [fromBranch, setFromBranch] = useState<string>("");
  const [toBranch, setToBranch] = useState<string>("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ product_id: "", quantity: "" }]);

  const branches: Branch[] = (allBranches || []) as Branch[];

  const fetchTransfers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("stock_transfers")
      .select(
        "id, status, reference, notes, created_at, from_branch_id, to_branch_id, " +
          "from_branch:branches!stock_transfers_from_branch_id_fkey(name), " +
          "to_branch:branches!stock_transfers_to_branch_id_fkey(name), " +
          "stock_transfer_items(id, product_id, quantity)"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    // Scope to active branch — show transfers where this branch is sender or receiver.
    if (activeBranchId && !isAllBranches) {
      q = q.or(`from_branch_id.eq.${activeBranchId},to_branch_id.eq.${activeBranchId}`);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setTransfers(data || []);
    setLoading(false);
  }, [tenantId, activeBranchId, isAllBranches]);

  const fetchProducts = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("inventory_items")
      .select("id, name, sku")
      .eq("tenant_id", tenantId)
      .order("name");
    setProducts((data as Product[]) || []);
  }, [tenantId]);

  useEffect(() => {
    fetchTransfers();
    fetchProducts();
  }, [fetchTransfers, fetchProducts]);

  const openCreate = () => {
    setFromBranch(activeBranchId || "");
    setToBranch("");
    setReference("");
    setNotes("");
    setItems([{ product_id: "", quantity: "" }]);
    setDialogOpen(true);
  };

  const addLine = () => setItems((p) => [...p, { product_id: "", quantity: "" }]);
  const removeLine = (i: number) =>
    setItems((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));
  const updateLine = (i: number, key: keyof LineItem, value: string) =>
    setItems((p) => p.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

  const handleCreate = async () => {
    if (!tenantId || !userId) return;
    if (!fromBranch || !toBranch) return toast.error("Select both branches");
    if (fromBranch === toBranch) return toast.error("From and To branches must differ");
    const cleanItems = items
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) }));
    if (cleanItems.length === 0) return toast.error("Add at least one item");

    setSubmitting(true);
    const { data: tr, error } = await supabase
      .from("stock_transfers")
      .insert({
        tenant_id: tenantId,
        from_branch_id: fromBranch,
        to_branch_id: toBranch,
        reference: reference || null,
        notes: notes || null,
        status: "pending",
        requested_by: userId,
      })
      .select("id")
      .single();
    if (error || !tr) {
      setSubmitting(false);
      return toast.error(error?.message || "Failed to create transfer");
    }
    const { error: itemsErr } = await supabase
      .from("stock_transfer_items")
      .insert(cleanItems.map((l) => ({ ...l, transfer_id: tr.id })));
    if (itemsErr) {
      setSubmitting(false);
      return toast.error(itemsErr.message);
    }
    toast.success("Transfer created");
    setSubmitting(false);
    setDialogOpen(false);
    fetchTransfers();
  };

  const handleExecute = async (id: string) => {
    const { data, error } = await supabase.rpc("execute_stock_transfer", { _transfer_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Transfer executed — stock moved");
      fetchTransfers();
    }
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("stock_transfers")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Transfer cancelled");
      fetchTransfers();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" /> Stock Transfers
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAllBranches
              ? "Showing transfers across all branches"
              : "Showing transfers involving your active branch"}
          </p>
        </div>
        <Button onClick={openCreate} disabled={branches.length < 2}>
          <Plus className="h-4 w-4 mr-2" /> New Transfer
        </Button>
      </div>

      {branches.length < 2 && (
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-sm text-warning">
          Create at least 2 branches to enable transfers.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left p-3 font-medium">Reference</th>
                <th className="text-left p-3 font-medium">From → To</th>
                <th className="text-right p-3 font-medium">Items</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{t.reference || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {t.from_branch?.name || "?"}{" "}
                    <ArrowRightLeft className="inline h-3 w-3 mx-1" />{" "}
                    {t.to_branch?.name || "?"}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {t.stock_transfer_items?.length || 0}
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_COLORS[t.status] as any}>{t.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {["pending", "approved", "in_transit"].includes(t.status) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExecute(t.id)}
                            title="Mark received & move stock"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1 text-success" /> Receive
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(t.id)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No transfers yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  From Branch
                </label>
                <Select value={fromBranch} onValueChange={setFromBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  To Branch
                </label>
                <Select value={toBranch} onValueChange={setToBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.id !== fromBranch)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              placeholder="Reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <Textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Items</label>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3 w-3 mr-1" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <Select
                      value={line.product_id}
                      onValueChange={(v) => updateLine(i, "product_id", v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      className="w-24"
                      value={line.quantity}
                      onChange={(e) => updateLine(i, "quantity", e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(i)}
                      disabled={items.length === 1}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
