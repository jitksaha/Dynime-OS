import { useState, useEffect } from "react";
import { Calculator, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface CalcHistory {
  id: string;
  calculation_type: string;
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  tax_category: string;
  description: string | null;
  created_at: string;
}

const CALC_TYPES = [
  { value: "simple", label: "Simple (Base + Tax)", desc: "Add tax on top of base amount" },
  { value: "reverse", label: "Reverse (Extract Tax)", desc: "Extract tax from tax-inclusive amount" },
  { value: "inclusive", label: "Tax Inclusive", desc: "Calculate base from inclusive price" },
  { value: "compound", label: "Compound", desc: "Tax on tax (compound calculation)" },
];

const TAX_CATEGORIES = ["vat", "sales_tax", "service_tax", "excise", "customs", "withholding"];

export default function TaxCalculator() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { formatPrice } = useTenantCurrency();
  const [history, setHistory] = useState<CalcHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [calcType, setCalcType] = useState("simple");
  const [baseAmount, setBaseAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxRate2, setTaxRate2] = useState(0); // for compound
  const [taxCategory, setTaxCategory] = useState("vat");
  const [description, setDescription] = useState("");

  // Calculated results
  const [result, setResult] = useState({ taxAmount: 0, totalAmount: 0 });

  const fetchHistory = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("tax_calculations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [tenantId]);

  // Live calculation
  useEffect(() => {
    let taxAmount = 0, totalAmount = 0;
    switch (calcType) {
      case "simple":
        taxAmount = baseAmount * (taxRate / 100);
        totalAmount = baseAmount + taxAmount;
        break;
      case "reverse":
        taxAmount = baseAmount - (baseAmount / (1 + taxRate / 100));
        totalAmount = baseAmount;
        break;
      case "inclusive":
        totalAmount = baseAmount;
        taxAmount = baseAmount - (baseAmount / (1 + taxRate / 100));
        break;
      case "compound":
        const tax1 = baseAmount * (taxRate / 100);
        const subtotal = baseAmount + tax1;
        const tax2 = subtotal * (taxRate2 / 100);
        taxAmount = tax1 + tax2;
        totalAmount = subtotal + tax2;
        break;
    }
    setResult({ taxAmount: Math.round(taxAmount * 100) / 100, totalAmount: Math.round(totalAmount * 100) / 100 });
  }, [calcType, baseAmount, taxRate, taxRate2]);

  const saveCalculation = async () => {
    if (!baseAmount) { toast.error("Enter a base amount"); return; }
    setSaving(true);
    const { error } = await supabase.from("tax_calculations").insert({
      tenant_id: tenantId,
      calculation_type: calcType,
      base_amount: baseAmount,
      tax_rate: taxRate,
      tax_amount: result.taxAmount,
      total_amount: result.totalAmount,
      tax_category: taxCategory,
      description: description || null,
      created_by: user?.id,
    } as any);
    if (error) toast.error("Failed to save");
    else { toast.success("Calculation saved"); fetchHistory(); }
    setSaving(false);
  };

  const deleteCalc = async (id: string) => {
    await supabase.from("tax_calculations").delete().eq("id", id);
    fetchHistory();
  };

  const resetCalc = () => {
    setBaseAmount(0); setTaxRate(0); setTaxRate2(0);
    setCalcType("simple"); setTaxCategory("vat"); setDescription("");
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax Calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">Manual tax calculations with history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10"><Calculator className="h-5 w-5 text-primary" /></div>
            <h2 className="text-base font-semibold text-foreground">Calculate Tax</h2>
          </div>

          {/* Calculation Type Cards */}
          <div className="grid grid-cols-2 gap-2">
            {CALC_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setCalcType(t.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  calcType === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                <p className="text-xs font-semibold text-foreground">{t.label}</p>
                <p className="text-[10px] text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {calcType === "reverse" || calcType === "inclusive" ? "Total Amount (incl. tax)" : "Base Amount"}
              </label>
              <input type="number" step="0.01" value={baseAmount || ""} onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax Rate (%)</label>
              <input type="number" step="0.01" value={taxRate || ""} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} placeholder="0" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm font-mono" />
            </div>
            {calcType === "compound" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">2nd Tax Rate (%)</label>
                <input type="number" step="0.01" value={taxRate2 || ""} onChange={(e) => setTaxRate2(parseFloat(e.target.value) || 0)} placeholder="0" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm font-mono" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax Category</label>
              <select value={taxCategory} onChange={(e) => setTaxCategory(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {TAX_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ").toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Invoice #123 tax" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>

          {/* Result */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{calcType === "reverse" || calcType === "inclusive" ? "Base (excl. tax)" : "Base Amount"}</span>
              <span className="font-mono font-medium text-foreground">
                {calcType === "reverse" || calcType === "inclusive"
                  ? formatPrice(baseAmount - result.taxAmount)
                  : formatPrice(baseAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax Amount</span>
              <span className="font-mono font-semibold text-primary">{formatPrice(result.taxAmount)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm">
              <span className="font-medium text-foreground">Total</span>
              <span className="font-mono font-bold text-foreground text-base">{formatPrice(result.totalAmount)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveCalculation} loading={saving} className="flex-1">
              <Calculator className="h-4 w-4 mr-2" /> Save Calculation
            </Button>
            <Button variant="outline" onClick={resetCalc}><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* History */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Calculation History</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No calculations yet</p>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground uppercase">{h.calculation_type}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{h.tax_category.replace("_", " ").toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(h.base_amount)} × {h.tax_rate}% = <span className="font-medium text-primary">{formatPrice(h.tax_amount)}</span> → {formatPrice(h.total_amount)}
                  </p>
                  {h.description && <p className="text-[10px] text-muted-foreground">{h.description}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => deleteCalc(h.id)} className="p-1 rounded text-destructive/50 hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
