import { useState, useEffect } from "react";
import { DollarSign, Save, Loader2, Percent, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { usePayBrand } from "@/hooks/usePayBrand";

interface FeeConfig {
  id: string;
  fee_type: string;
  fee_mode: string;
  fee_value: number;
  min_fee: number;
  max_fee: number;
  is_active: boolean;
  description: string | null;
}

const FEE_LABELS: Record<string, { label: string; icon: string }> = {
  transfer: { label: "Wallet-to-Wallet Transfer", icon: "↔" },
  payment_link: { label: "Payment Link Transaction", icon: "🔗" },
  payout: { label: "Payout / Withdrawal", icon: "💸" },
  payment: { label: "Direct Payment", icon: "💳" },
};

export default function WalletFeeConfig() {
  const [fees, setFees] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { payBrand } = usePayBrand();

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    const { data } = await supabase
      .from("wallet_fee_config")
      .select("*")
      .order("fee_type");
    setFees((data as any) || []);
    setLoading(false);
  };

  const updateFee = async (fee: FeeConfig) => {
    setSaving(fee.id);
    const { error } = await supabase
      .from("wallet_fee_config")
      .update({
        fee_mode: fee.fee_mode,
        fee_value: fee.fee_value,
        min_fee: fee.min_fee,
        max_fee: fee.max_fee,
        is_active: fee.is_active,
      })
      .eq("id", fee.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${FEE_LABELS[fee.fee_type]?.label || fee.fee_type} fee updated`);
    }
    setSaving(null);
  };

  const handleChange = (id: string, field: keyof FeeConfig, value: any) => {
    setFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{payBrand} Fees & Charges</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure transaction fees for {payBrand} across all companies
        </p>
      </div>

      <div className="space-y-4">
        {fees.map((fee) => {
          const meta = FEE_LABELS[fee.fee_type] || { label: fee.fee_type, icon: "📋" };
          return (
            <div key={fee.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                    <p className="text-xs text-muted-foreground">{fee.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleChange(fee.id, "is_active", !fee.is_active);
                  }}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                    fee.is_active ? "bg-success" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${
                      fee.is_active ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fee Type</label>
                  <div className="flex gap-1 bg-secondary/30 rounded-lg p-0.5">
                    <button
                      onClick={() => handleChange(fee.id, "fee_mode", "percentage")}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        fee.fee_mode === "percentage"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Percent className="h-3 w-3" /> %
                    </button>
                    <button
                      onClick={() => handleChange(fee.id, "fee_mode", "fixed")}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        fee.fee_mode === "fixed"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Hash className="h-3 w-3" /> Fixed
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Value {fee.fee_mode === "percentage" ? "(%)" : "(৳)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee.fee_value}
                    onChange={(e) => handleChange(fee.id, "fee_value", parseFloat(e.target.value) || 0)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Min Fee (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee.min_fee}
                    onChange={(e) => handleChange(fee.id, "min_fee", parseFloat(e.target.value) || 0)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Max Fee (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee.max_fee}
                    onChange={(e) => handleChange(fee.id, "max_fee", parseFloat(e.target.value) || 0)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <button
                onClick={() => updateFee(fee)}
                disabled={saving === fee.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving === fee.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
