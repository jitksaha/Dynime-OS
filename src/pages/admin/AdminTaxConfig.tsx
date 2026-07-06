// @ts-nocheck
import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Search, Globe, Percent, Settings, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface PlatformTaxConfig {
  default_tax_system: string;
  supported_tax_types: string[];
  global_filing_frequencies: string[];
  enforce_compliance: boolean;
  auto_overdue_days: number;
}

const DEFAULT_CONFIG: PlatformTaxConfig = {
  default_tax_system: "vat",
  supported_tax_types: ["vat", "sales_tax", "gst", "service_tax", "excise", "customs", "withholding"],
  global_filing_frequencies: ["monthly", "quarterly", "annually"],
  enforce_compliance: false,
  auto_overdue_days: 30,
};

export default function AdminTaxConfig() {
  const [config, setConfig] = useState<PlatformTaxConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalProfiles: 0, totalRates: 0, totalRecords: 0, tenantCount: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [configRes, profilesRes, ratesRes, complianceRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "tax_compliance_config").single(),
        supabase.from("tax_profiles").select("tenant_id"),
        supabase.from("tax_rates").select("id", { count: "exact" }),
        supabase.from("tax_compliance_records").select("id", { count: "exact" }),
      ]);
      if (configRes.data?.value) {
        setConfig({ ...DEFAULT_CONFIG, ...(configRes.data.value as any) });
      }
      const tenants = new Set((profilesRes.data || []).map((p: any) => p.tenant_id));
      setStats({
        totalProfiles: profilesRes.data?.length || 0,
        totalRates: ratesRes.count || 0,
        totalRecords: complianceRes.count || 0,
        tenantCount: tenants.size,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("platform_settings").upsert(
      { key: "tax_compliance_config", value: config as any, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) toast.error("Failed to save");
    else toast.success("Tax configuration saved");
  };

  const toggleTaxType = (type: string) => {
    setConfig((c) => ({
      ...c,
      supported_tax_types: c.supported_tax_types.includes(type)
        ? c.supported_tax_types.filter((t) => t !== type)
        : [...c.supported_tax_types, type],
    }));
  };

  const toggleFrequency = (freq: string) => {
    setConfig((c) => ({
      ...c,
      global_filing_frequencies: c.global_filing_frequencies.includes(freq)
        ? c.global_filing_frequencies.filter((f) => f !== freq)
        : [...c.global_filing_frequencies, freq],
    }));
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const ALL_TAX_TYPES = ["vat", "sales_tax", "gst", "service_tax", "excise", "customs", "withholding", "other"];
  const ALL_FREQUENCIES = ["monthly", "quarterly", "semi_annually", "annually"];
  const TAX_SYSTEMS = ["vat", "gst", "sales_tax", "hybrid"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide tax compliance settings</p>
        </div>
        <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4 mr-2" /> Save Configuration</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Tenants", value: stats.tenantCount, icon: Globe },
          { label: "Tax Profiles", value: stats.totalProfiles, icon: Settings },
          { label: "Tax Rates", value: stats.totalRates, icon: Percent },
          { label: "Compliance Records", value: stats.totalRecords, icon: RefreshCw },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Default Tax System */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Default Tax System</h3>
        <p className="text-xs text-muted-foreground">Applied to new tenant tax profiles by default</p>
        <div className="flex gap-2 flex-wrap">
          {TAX_SYSTEMS.map((s) => (
            <button
              key={s}
              onClick={() => setConfig((c) => ({ ...c, default_tax_system: s }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                config.default_tax_system === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/30"
              }`}
            >
              {s.toUpperCase().replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Supported Tax Types */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Supported Tax Types</h3>
        <p className="text-xs text-muted-foreground">Tax categories available across the platform</p>
        <div className="flex gap-2 flex-wrap">
          {ALL_TAX_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleTaxType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                config.supported_tax_types.includes(t) ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground"
              }`}
            >
              {t.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filing Frequencies */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Filing Frequencies</h3>
        <p className="text-xs text-muted-foreground">Allowed tax filing periods</p>
        <div className="flex gap-2 flex-wrap">
          {ALL_FREQUENCIES.map((f) => (
            <button
              key={f}
              onClick={() => toggleFrequency(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                config.global_filing_frequencies.includes(f) ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground"
              }`}
            >
              {f.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Compliance Settings */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Compliance Settings</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.enforce_compliance}
              onChange={(e) => setConfig((c) => ({ ...c, enforce_compliance: e.target.checked }))}
              className="rounded"
            />
            Enforce compliance tracking for all tenants
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Auto-overdue after</label>
            <input
              type="number"
              value={config.auto_overdue_days}
              onChange={(e) => setConfig((c) => ({ ...c, auto_overdue_days: parseInt(e.target.value) || 30 }))}
              className="w-16 h-8 rounded-lg border border-input bg-background px-2 text-sm text-center"
            />
            <span className="text-sm text-muted-foreground">days past deadline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
