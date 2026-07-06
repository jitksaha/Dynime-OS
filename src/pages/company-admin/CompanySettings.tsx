import { useState, useEffect } from "react";
import { Building2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CountryInfo } from "@/hooks/useCountry";

export default function CompanySettings() {
  const { profile } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", size: "", logo_url: "", country: "US", currency: "USD", currency_symbol: "$" });
  const [countries, setCountries] = useState<CountryInfo[]>([]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const fetchData = async () => {
      const [tenantRes, countriesRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", profile.tenant_id!).single(),
        supabase.from("platform_settings").select("value").eq("key", "enabled_countries").single(),
      ]);
      if (tenantRes.data) {
        setTenant(tenantRes.data);
        setForm({
          name: tenantRes.data.name,
          industry: tenantRes.data.industry || "",
          size: tenantRes.data.size || "",
          logo_url: tenantRes.data.logo_url || "",
          country: tenantRes.data.country || "US",
          currency: tenantRes.data.currency || "USD",
          currency_symbol: tenantRes.data.currency_symbol || "$",
        });
      }
      if (countriesRes.data?.value) setCountries(countriesRes.data.value as any as CountryInfo[]);
      setLoading(false);
    };
    fetchData();
  }, [profile?.tenant_id]);

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase.from("tenants").update({
      name: form.name,
      industry: form.industry || null,
      size: form.size || null,
      logo_url: form.logo_url || null,
      country: form.country,
      currency: form.currency,
      currency_symbol: form.currency_symbol,
    }).eq("id", tenant.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Company settings saved");
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Company Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your company profile and configuration</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></div>
          <h2 className="text-sm font-semibold text-foreground">Company Profile</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Company Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Industry</label>
            <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Company Size</label>
            <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select...</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="500+">500+</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Logo URL</label>
            <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Country & Currency</label>
            <select
              value={form.country}
              onChange={(e) => {
                const c = countries.find((cc) => cc.code === e.target.value);
                if (c) setForm({ ...form, country: c.code, currency: c.currency, currency_symbol: c.symbol });
              }}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.symbol} {c.currency})</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
