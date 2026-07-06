// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, DollarSign, Package, ToggleLeft } from "lucide-react";

interface SmsPricing {
  id: string;
  pricing_type: string;
  name: string;
  description: string | null;
  price: number;
  sms_count: number;
  currency: string;
  is_active: boolean;
}

export default function SmsPricingManagement() {
  const [items, setItems] = useState<SmsPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sms_pricing")
      .select("*")
      .order("pricing_type")
      .order("sms_count");
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const addItem = async (type: "per_sms" | "bundle") => {
    const name = type === "per_sms" ? "Per SMS Rate" : `${100} SMS Bundle`;
    const { error } = await supabase.from("sms_pricing").insert({
      pricing_type: type,
      name,
      price: type === "per_sms" ? 0.05 : 4.0,
      sms_count: type === "per_sms" ? 1 : 100,
      currency: "USD",
    } as any);
    if (error) toast.error("Failed to add");
    else { toast.success("Pricing added"); fetch(); }
  };

  const updateItem = async (item: SmsPricing) => {
    setSaving(item.id);
    const { error } = await supabase
      .from("sms_pricing")
      .update({
        name: item.name,
        description: item.description,
        price: item.price,
        sms_count: item.sms_count,
        currency: item.currency,
        is_active: item.is_active,
      } as any)
      .eq("id", item.id);
    if (error) toast.error("Failed to save");
    else toast.success("Saved");
    setSaving(null);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("sms_pricing").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetch(); }
  };

  const updateField = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
      </div>
    );
  }

  const perSmsItems = items.filter(i => i.pricing_type === "per_sms");
  const bundleItems = items.filter(i => i.pricing_type === "bundle");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">SMS Pricing Management</h1>
          <p className="text-xs text-muted-foreground">Set per-SMS rates and bundles for tenants using shared gateways</p>
        </div>
      </div>

      {/* Per SMS Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Per-SMS Rate
          </h2>
          {perSmsItems.length === 0 && (
            <button onClick={() => addItem("per_sms")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add Rate
            </button>
          )}
        </div>
        {perSmsItems.map(item => (
          <PricingCard key={item.id} item={item} saving={saving} onUpdate={updateField} onSave={updateItem} onDelete={deleteItem} />
        ))}
      </div>

      {/* Bundles Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> SMS Bundles
          </h2>
          <button onClick={() => addItem("bundle")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add Bundle
          </button>
        </div>
        {bundleItems.length === 0 && (
          <p className="text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">No bundles configured yet.</p>
        )}
        {bundleItems.map(item => (
          <PricingCard key={item.id} item={item} saving={saving} onUpdate={updateField} onSave={updateItem} onDelete={deleteItem} />
        ))}
      </div>
    </div>
  );
}

function PricingCard({ item, saving, onUpdate, onSave, onDelete }: {
  item: SmsPricing;
  saving: string | null;
  onUpdate: (id: string, field: string, value: any) => void;
  onSave: (item: SmsPricing) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.is_active}
            onChange={(e) => onUpdate(item.id, "is_active", e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-xs font-medium text-foreground">
            {item.is_active ? "Active" : "Disabled"}
          </span>
        </label>
        <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Name</label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate(item.id, "name", e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Price</label>
          <input
            type="number"
            step="0.01"
            value={item.price}
            onChange={(e) => onUpdate(item.id, "price", parseFloat(e.target.value) || 0)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">SMS Count</label>
          <input
            type="number"
            value={item.sms_count}
            onChange={(e) => onUpdate(item.id, "sms_count", parseInt(e.target.value) || 1)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={item.pricing_type === "per_sms"}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Currency</label>
          <input
            type="text"
            value={item.currency}
            onChange={(e) => onUpdate(item.id, "currency", e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Description</label>
        <input
          type="text"
          value={item.description || ""}
          onChange={(e) => onUpdate(item.id, "description", e.target.value)}
          placeholder="Optional description"
          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        onClick={() => onSave(item)}
        disabled={saving === item.id}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {saving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save
      </button>
    </div>
  );
}
