import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Search, RefreshCw, ArrowDownUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import type { CountryInfo } from "@/hooks/useCountry";

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "BDT", "INR", "AED", "SAR", "MYR", "SGD", "CAD", "AUD", "JPY", "CNY"];

export default function CountryManagement() {
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [newCountry, setNewCountry] = useState<CountryInfo>({ code: "", name: "", flag: "", currency: "", symbol: "", exchange_rate: 1 });
  const [showAdd, setShowAdd] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState("BDT");
  const [fetchingRates, setFetchingRates] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [countriesRes, baseRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "enabled_countries").single(),
        supabase.from("platform_settings").select("value").eq("key", "base_currency").single(),
      ]);
      if (countriesRes.data?.value) {
        const raw = countriesRes.data.value as any as any[];
        setCountries(raw.map((c: any) => ({ ...c, exchange_rate: c.exchange_rate ?? 1 })));
      }
      if (baseRes.data?.value) {
        setBaseCurrency(String(baseRes.data.value));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const [countriesUpdate, baseUpdate] = await Promise.all([
      supabase.from("platform_settings").update({ value: countries as any, updated_at: new Date().toISOString() }).eq("key", "enabled_countries"),
      supabase.from("platform_settings").upsert({ key: "base_currency", value: baseCurrency as any, updated_at: new Date().toISOString() }, { onConflict: "key" }),
    ]);
    setSaving(false);
    if (countriesUpdate.error || baseUpdate.error) toast.error("Failed to save");
    else toast.success("Countries, base currency & exchange rates updated");
  };

  const handleRemove = (code: string) => {
    setCountries((prev) => prev.filter((c) => c.code !== code));
  };

  const handleAdd = () => {
    if (!newCountry.code || !newCountry.name || !newCountry.currency || !newCountry.symbol) {
      toast.error("All fields are required");
      return;
    }
    if (countries.find((c) => c.code === newCountry.code.toUpperCase())) {
      toast.error("Country code already exists");
      return;
    }
    setCountries((prev) => [...prev, { ...newCountry, code: newCountry.code.toUpperCase() }]);
    setNewCountry({ code: "", name: "", flag: "", currency: "", symbol: "", exchange_rate: 1 });
    setShowAdd(false);
  };

  const updateRate = (code: string, rate: number) => {
    setCountries((prev) =>
      prev.map((c) => (c.code === code ? { ...c, exchange_rate: rate } : c))
    );
  };

  const fetchExchangeRates = async () => {
    setFetchingRates(true);
    try {
      // Use a free exchange rate API
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("Failed to fetch rates");
      const data = await res.json();
      const rates = data.rates as Record<string, number>;

      let updated = 0;
      setCountries((prev) =>
        prev.map((c) => {
          const rate = rates[c.currency];
          if (rate !== undefined) {
            updated++;
            return { ...c, exchange_rate: parseFloat(rate.toFixed(6)) };
          }
          return c;
        })
      );
      toast.success(`Exchange rates updated for ${updated} currencies from ${baseCurrency}`);
    } catch (err: any) {
      toast.error("Failed to fetch exchange rates: " + (err.message || "Unknown error"));
    } finally {
      setFetchingRates(false);
    }
  };

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.currency.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Country & Currency Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage countries, currencies, and exchange rates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">
            <Plus className="h-4 w-4" /> Add Country
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Base Currency Selection */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10"><ArrowDownUp className="h-4 w-4 text-primary" /></div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Base Currency</h3>
            <p className="text-xs text-muted-foreground">All plan prices are stored in this currency. Exchange rates convert from base → target.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="h-10 px-4 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {POPULAR_CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={fetchExchangeRates}
            disabled={fetchingRates}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {fetchingRates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {fetchingRates ? "Fetching..." : "Auto-fetch exchange rates"}
          </button>
          <span className="text-xs text-muted-foreground">
            Rates are relative to <strong>{baseCurrency}</strong>. Example: If base is USD and EUR rate is 0.92, then $1 = €0.92
          </span>
        </div>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Add New Country</h3>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Code</label>
              <input value={newCountry.code} onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value })} placeholder="US" maxLength={2} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <input value={newCountry.name} onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })} placeholder="United States" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Flag</label>
              <input value={newCountry.flag} onChange={(e) => setNewCountry({ ...newCountry, flag: e.target.value })} placeholder="🇺🇸" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
              <input value={newCountry.currency} onChange={(e) => setNewCountry({ ...newCountry, currency: e.target.value })} placeholder="USD" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
              <input value={newCountry.symbol} onChange={(e) => setNewCountry({ ...newCountry, symbol: e.target.value })} placeholder="$" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rate (from {baseCurrency})</label>
              <input type="number" step="any" value={newCountry.exchange_rate} onChange={(e) => setNewCountry({ ...newCountry, exchange_rate: parseFloat(e.target.value) || 0 })} placeholder="1.0" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search countries..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flag</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Country</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Symbol</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rate (1 {baseCurrency} =)</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">100 {baseCurrency} =</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((country) => (
              <tr key={country.code} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-lg">{country.flag}</td>
                <td className="px-4 py-3 font-mono text-foreground">{country.code}</td>
                <td className="px-4 py-3 text-foreground">{country.name}</td>
                <td className="px-4 py-3 text-foreground">{country.currency}</td>
                <td className="px-4 py-3 text-foreground">{country.symbol}</td>
                <td className="px-4 py-3">
                  {editingRate === country.code ? (
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={country.exchange_rate}
                      onChange={(e) => updateRate(country.code, parseFloat(e.target.value) || 0)}
                      onBlur={() => setEditingRate(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingRate(null)}
                      className="w-28 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingRate(country.code)}
                      className="text-foreground hover:text-primary font-mono cursor-pointer hover:underline"
                    >
                      {country.exchange_rate}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-medium">
                  {country.symbol}{(100 * country.exchange_rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleRemove(country.code)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No countries found</div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{countries.length} countries configured · Base currency: {baseCurrency} · Click on any exchange rate to edit it</p>
    </div>
  );
}
