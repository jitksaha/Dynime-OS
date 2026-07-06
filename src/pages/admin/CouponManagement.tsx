import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Plus, Ticket, Percent, DollarSign, Trash2, ToggleLeft, ToggleRight, Copy } from "lucide-react";
import { format } from "date-fns";

interface Coupon {
  id: string;
  code: string;
  coupon_type: string;
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  max_uses: number;
  used_count: number;
  per_user_limit: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  scope: string;
  created_at: string;
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    coupon_type: "percentage",
    value: 0,
    min_order_amount: 0,
    max_discount_amount: "",
    max_uses: 0,
    per_user_limit: 1,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
  });

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("scope", "platform")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load coupons");
    else setCoupons((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
    if (form.value <= 0) { toast.error("Value must be greater than 0"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: any = {
      code: form.code.toUpperCase().trim(),
      coupon_type: form.coupon_type,
      value: form.value,
      min_order_amount: form.min_order_amount,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      max_uses: form.max_uses,
      per_user_limit: form.per_user_limit,
      valid_from: form.valid_from,
      valid_until: form.valid_until || null,
      scope: "platform",
      tenant_id: null,
      created_by: user.id,
    };

    const { error } = await supabase.from("coupons").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Coupon created");
      setShowForm(false);
      setForm({ code: "", coupon_type: "percentage", value: 0, min_order_amount: 0, max_discount_amount: "", max_uses: 0, per_user_limit: 1, valid_from: new Date().toISOString().split("T")[0], valid_until: "" });
      fetchCoupons();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Coupon deleted");
    fetchCoupons();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Platform Coupons</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage discount coupons for subscription plans</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Create Platform Coupon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SAVE20" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
              <select value={form.coupon_type} onChange={(e) => setForm({ ...form, coupon_type: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Value</label>
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Min Order Amount</label>
              <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max Discount Cap</label>
              <input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} placeholder="No limit" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max Total Uses (0=unlimited)</label>
              <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Per User Limit</label>
              <input type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Valid From</label>
              <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Valid Until (optional)</label>
              <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Create Coupon</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No platform coupons yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg ${c.coupon_type === "percentage" ? "bg-primary/10" : "bg-success/10"}`}>
                  {c.coupon_type === "percentage" ? <Percent className="h-4 w-4 text-primary" /> : <DollarSign className="h-4 w-4 text-success" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-foreground">{c.code}</span>
                    <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.coupon_type === "percentage" ? `${c.value}% off` : `৳${c.value} off`}
                    {c.max_discount_amount ? ` (max ৳${c.max_discount_amount})` : ""}
                    {" · "}Used {c.used_count}/{c.max_uses || "∞"}
                    {c.valid_until ? ` · Expires ${format(new Date(c.valid_until), "MMM d, yyyy")}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(c.id, c.is_active)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                  {c.is_active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
