// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { LineChart, Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface Forecast { id: string; name: string; forecast_type: string; scenario: string; period_start: string; period_end: string; data_points: any[]; assumptions: any; status: string; }

const SCENARIO_COLORS: Record<string, string> = { best: "bg-success/10 text-success", expected: "bg-blue-100 text-blue-700", worst: "bg-destructive/10 text-destructive" };

export default function FinancialForecasting() {
  const { tenantId, userId } = useTenant();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", forecast_type: "cash_flow", scenario: "expected", period_start: "", period_end: "" });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("financial_forecasts" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setForecasts((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createForecast = async () => {
    if (!form.name || !form.period_start || !form.period_end || !tenantId) return;
    const { error } = await supabase.from("financial_forecasts" as any).insert({ ...form, tenant_id: tenantId, created_by: userId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Forecast created");
    setShowForm(false);
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><LineChart className="h-6 w-6 text-primary" /> Financial Forecasting</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered cash flow projections and scenario modeling</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> New Forecast</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-foreground">{forecasts.length}</p><p className="text-xs text-muted-foreground">Forecasts</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-success">{forecasts.filter(f => f.scenario === "best").length}</p><p className="text-xs text-muted-foreground">Best Case</p></div>
        <div className="p-4 rounded-xl border border-border bg-card text-center"><p className="text-2xl font-bold text-destructive">{forecasts.filter(f => f.scenario === "worst").length}</p><p className="text-xs text-muted-foreground">Worst Case</p></div>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold">New Financial Forecast</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Forecast name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <select value={form.forecast_type} onChange={e => setForm(p => ({ ...p, forecast_type: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="cash_flow">Cash Flow</option><option value="revenue">Revenue</option><option value="expense">Expense</option><option value="profit">Profit</option>
            </select>
            <select value={form.scenario} onChange={e => setForm(p => ({ ...p, scenario: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="best">Best Case</option><option value="expected">Expected</option><option value="worst">Worst Case</option>
            </select>
            <input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
            <input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createForecast} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {forecasts.length === 0 ? (
          <div className="text-center py-12"><LineChart className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No forecasts yet. Create your first scenario.</p></div>
        ) : forecasts.map(f => (
          <div key={f.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="p-2 rounded-lg bg-primary/10">
              {f.scenario === "best" ? <TrendingUp className="h-4 w-4 text-success" /> : f.scenario === "worst" ? <TrendingDown className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.forecast_type.replace("_", " ")} · {f.period_start} → {f.period_end}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${SCENARIO_COLORS[f.scenario] || "bg-secondary text-foreground"}`}>{f.scenario}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === "active" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{f.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
