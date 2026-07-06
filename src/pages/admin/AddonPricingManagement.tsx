// @ts-nocheck
import { useState, useEffect } from "react";
import { Package, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import CountryPricingEditor from "@/components/admin/CountryPricingEditor";

interface ModuleAddon {
  id: string;
  module_name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  price_onetime: number;
  is_active: boolean;
}

export default function AddonPricingManagement() {
  const [addons, setAddons] = useState<ModuleAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ModuleAddon>>({});
  const [addonPricingMode, setAddonPricingMode] = useState<"uniform" | "country_wise">("uniform");

  const fetchAddons = async () => {
    const [addonsRes, modeRes] = await Promise.all([
      supabase.from("module_addons").select("*").order("display_name"),
      supabase.from("platform_settings").select("value").eq("key", "addon_pricing_mode").single(),
    ]);
    if (addonsRes.data) setAddons(addonsRes.data as ModuleAddon[]);
    if (modeRes.data) {
      const val = typeof modeRes.data.value === "string" ? modeRes.data.value : JSON.stringify(modeRes.data.value);
      setAddonPricingMode(val.replace(/"/g, "") as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAddons(); }, []);

  const startEdit = (addon: ModuleAddon) => {
    setEditingId(addon.id);
    setEditData({
      price_monthly: addon.price_monthly,
      price_quarterly: addon.price_quarterly,
      price_yearly: addon.price_yearly,
      price_onetime: addon.price_onetime,
      is_active: addon.is_active,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("module_addons").update(editData).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Addon pricing updated");
    setEditingId(null);
    fetchAddons();
  };

  const handleAddonPricingModeChange = async (mode: "uniform" | "country_wise") => {
    setAddonPricingMode(mode);
    await supabase.from("platform_settings").update({ value: JSON.stringify(mode) }).eq("key", "addon_pricing_mode");
    toast.success(mode === "uniform" ? "All countries use the same base price" : "Country-wise addon pricing enabled");
  };

  const { formatPrice: fmt } = usePlatformCurrency();

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set pricing for individual module add-ons. Companies can purchase these separately on top of their base subscription.
      </p>

      <div className="space-y-3">
        {addons.map((addon) => (
          <div key={addon.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${addon.is_active ? "bg-primary/10" : "bg-secondary"}`}>
                  <Package className={`h-4 w-4 ${addon.is_active ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{addon.display_name}</p>
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${addon.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {addon.is_active ? "Active" : "Inactive"}
                </span>
                {editingId === addon.id ? (
                  <div className="flex gap-1">
                    <button onClick={saveEdit} className="p-1.5 rounded-md text-success hover:bg-success/10"><Save className="h-4 w-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(addon)} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary"><Edit2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>

            {editingId === addon.id ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(["price_monthly", "price_quarterly", "price_yearly", "price_onetime"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {field === "price_onetime" ? "One-time" : field.replace("price_", "").charAt(0).toUpperCase() + field.replace("price_", "").slice(1)}
                      </label>
                      <input
                        type="number"
                        value={editData[field] || 0}
                        onChange={(e) => setEditData({ ...editData, [field]: Number(e.target.value) })}
                        className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ))}
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editData.is_active ?? true}
                        onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                        className="rounded border-input"
                      />
                      Active
                    </label>
                  </div>
                </div>
                {/* Country-Wise Pricing for Addon */}
                <CountryPricingEditor
                  entityType="addon"
                  entityId={addon.id}
                  entityName={addon.display_name}
                  priceFields={[
                    { key: "price_monthly", label: "Monthly" },
                    { key: "price_quarterly", label: "Quarterly" },
                    { key: "price_yearly", label: "Yearly" },
                    { key: "price_onetime", label: "One-time" },
                  ]}
                  basePrices={{
                    price_monthly: editData.price_monthly ?? addon.price_monthly,
                    price_quarterly: editData.price_quarterly ?? addon.price_quarterly,
                    price_yearly: editData.price_yearly ?? addon.price_yearly,
                    price_onetime: editData.price_onetime ?? addon.price_onetime,
                  }}
                  pricingMode={addonPricingMode}
                  onPricingModeChange={handleAddonPricingModeChange}
                />
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly</p>
                  <p className="text-sm font-semibold text-foreground">{fmt(addon.price_monthly)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quarterly</p>
                  <p className="text-sm font-semibold text-foreground">{fmt(addon.price_quarterly)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Yearly</p>
                  <p className="text-sm font-semibold text-foreground">{fmt(addon.price_yearly)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">One-time</p>
                  <p className="text-sm font-semibold text-foreground">{fmt(addon.price_onetime)}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
