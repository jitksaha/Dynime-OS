import { useState, useEffect } from "react";
import { Download, Search, Eye, Edit2, Trash2, Save, CheckCircle2, Globe, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

// Pre-built tax data per country
const COUNTRY_TAX_DATA: Record<string, { name: string; flag: string; system: string; currency: string; rates: { name: string; rate: number; tax_type: string; applies_to: string; code: string }[] }> = {
  US: {
    name: "United States", flag: "🇺🇸", system: "sales_tax", currency: "USD",
    rates: [
      { name: "Federal Sales Tax (Average)", rate: 0, tax_type: "sales_tax", applies_to: "goods", code: "US-FED-ST" },
      { name: "California Sales Tax", rate: 7.25, tax_type: "sales_tax", applies_to: "goods", code: "US-CA-ST" },
      { name: "New York Sales Tax", rate: 8.0, tax_type: "sales_tax", applies_to: "goods", code: "US-NY-ST" },
      { name: "Texas Sales Tax", rate: 6.25, tax_type: "sales_tax", applies_to: "goods", code: "US-TX-ST" },
      { name: "Florida Sales Tax", rate: 6.0, tax_type: "sales_tax", applies_to: "goods", code: "US-FL-ST" },
      { name: "Service Tax (Varies)", rate: 0, tax_type: "service_tax", applies_to: "services", code: "US-SVC-TX" },
    ],
  },
  GB: {
    name: "United Kingdom", flag: "🇬🇧", system: "vat", currency: "GBP",
    rates: [
      { name: "Standard VAT", rate: 20, tax_type: "vat", applies_to: "all", code: "GB-VAT-STD" },
      { name: "Reduced VAT", rate: 5, tax_type: "vat", applies_to: "goods", code: "GB-VAT-RED" },
      { name: "Zero-rated VAT", rate: 0, tax_type: "vat", applies_to: "goods", code: "GB-VAT-ZR" },
    ],
  },
  DE: {
    name: "Germany", flag: "🇩🇪", system: "vat", currency: "EUR",
    rates: [
      { name: "Umsatzsteuer (Standard)", rate: 19, tax_type: "vat", applies_to: "all", code: "DE-UST-STD" },
      { name: "Ermäßigter Steuersatz", rate: 7, tax_type: "vat", applies_to: "goods", code: "DE-UST-RED" },
    ],
  },
  FR: {
    name: "France", flag: "🇫🇷", system: "vat", currency: "EUR",
    rates: [
      { name: "TVA Standard", rate: 20, tax_type: "vat", applies_to: "all", code: "FR-TVA-STD" },
      { name: "TVA Intermédiaire", rate: 10, tax_type: "vat", applies_to: "services", code: "FR-TVA-INT" },
      { name: "TVA Réduit", rate: 5.5, tax_type: "vat", applies_to: "goods", code: "FR-TVA-RED" },
      { name: "TVA Super Réduit", rate: 2.1, tax_type: "vat", applies_to: "goods", code: "FR-TVA-SRED" },
    ],
  },
  IN: {
    name: "India", flag: "🇮🇳", system: "gst", currency: "INR",
    rates: [
      { name: "GST 0% (Exempt)", rate: 0, tax_type: "gst", applies_to: "goods", code: "IN-GST-EX" },
      { name: "GST 5%", rate: 5, tax_type: "gst", applies_to: "goods", code: "IN-GST-5" },
      { name: "GST 12%", rate: 12, tax_type: "gst", applies_to: "goods", code: "IN-GST-12" },
      { name: "GST 18%", rate: 18, tax_type: "gst", applies_to: "all", code: "IN-GST-18" },
      { name: "GST 28%", rate: 28, tax_type: "gst", applies_to: "goods", code: "IN-GST-28" },
      { name: "IGST 18%", rate: 18, tax_type: "gst", applies_to: "imports", code: "IN-IGST-18" },
    ],
  },
  BD: {
    name: "Bangladesh", flag: "🇧🇩", system: "vat", currency: "BDT",
    rates: [
      { name: "Standard VAT", rate: 15, tax_type: "vat", applies_to: "all", code: "BD-VAT-STD" },
      { name: "Reduced VAT", rate: 7.5, tax_type: "vat", applies_to: "goods", code: "BD-VAT-RED" },
      { name: "Turnover Tax", rate: 4, tax_type: "sales_tax", applies_to: "all", code: "BD-TT" },
      { name: "Supplementary Duty", rate: 20, tax_type: "excise", applies_to: "goods", code: "BD-SD" },
      { name: "Customs Duty (Average)", rate: 25, tax_type: "customs", applies_to: "imports", code: "BD-CD" },
      { name: "Withholding Tax (Services)", rate: 10, tax_type: "withholding", applies_to: "services", code: "BD-WHT-SVC" },
    ],
  },
  AE: {
    name: "UAE", flag: "🇦🇪", system: "vat", currency: "AED",
    rates: [
      { name: "Standard VAT", rate: 5, tax_type: "vat", applies_to: "all", code: "AE-VAT-STD" },
      { name: "Zero-rated VAT", rate: 0, tax_type: "vat", applies_to: "exports", code: "AE-VAT-ZR" },
      { name: "Excise Tax (Tobacco)", rate: 100, tax_type: "excise", applies_to: "goods", code: "AE-EXC-TOB" },
      { name: "Excise Tax (Sugary Drinks)", rate: 50, tax_type: "excise", applies_to: "goods", code: "AE-EXC-SUG" },
    ],
  },
  SA: {
    name: "Saudi Arabia", flag: "🇸🇦", system: "vat", currency: "SAR",
    rates: [
      { name: "Standard VAT", rate: 15, tax_type: "vat", applies_to: "all", code: "SA-VAT-STD" },
      { name: "Zero-rated VAT", rate: 0, tax_type: "vat", applies_to: "exports", code: "SA-VAT-ZR" },
    ],
  },
  AU: {
    name: "Australia", flag: "🇦🇺", system: "gst", currency: "AUD",
    rates: [
      { name: "GST Standard", rate: 10, tax_type: "gst", applies_to: "all", code: "AU-GST-STD" },
      { name: "GST-Free", rate: 0, tax_type: "gst", applies_to: "goods", code: "AU-GST-FR" },
    ],
  },
  CA: {
    name: "Canada", flag: "🇨🇦", system: "gst", currency: "CAD",
    rates: [
      { name: "Federal GST", rate: 5, tax_type: "gst", applies_to: "all", code: "CA-GST-FED" },
      { name: "Ontario HST", rate: 13, tax_type: "gst", applies_to: "all", code: "CA-HST-ON" },
      { name: "Quebec QST", rate: 9.975, tax_type: "sales_tax", applies_to: "all", code: "CA-QST-QC" },
      { name: "British Columbia PST", rate: 7, tax_type: "sales_tax", applies_to: "goods", code: "CA-PST-BC" },
    ],
  },
  JP: {
    name: "Japan", flag: "🇯🇵", system: "vat", currency: "JPY",
    rates: [
      { name: "Consumption Tax (Standard)", rate: 10, tax_type: "vat", applies_to: "all", code: "JP-CT-STD" },
      { name: "Consumption Tax (Reduced)", rate: 8, tax_type: "vat", applies_to: "goods", code: "JP-CT-RED" },
    ],
  },
  SG: {
    name: "Singapore", flag: "🇸🇬", system: "gst", currency: "SGD",
    rates: [
      { name: "GST Standard", rate: 9, tax_type: "gst", applies_to: "all", code: "SG-GST-STD" },
      { name: "GST Zero-rated", rate: 0, tax_type: "gst", applies_to: "exports", code: "SG-GST-ZR" },
    ],
  },
  NG: {
    name: "Nigeria", flag: "🇳🇬", system: "vat", currency: "NGN",
    rates: [
      { name: "VAT Standard", rate: 7.5, tax_type: "vat", applies_to: "all", code: "NG-VAT-STD" },
      { name: "WHT (Services)", rate: 10, tax_type: "withholding", applies_to: "services", code: "NG-WHT-SVC" },
      { name: "CIT", rate: 30, tax_type: "other", applies_to: "all", code: "NG-CIT" },
    ],
  },
  ZA: {
    name: "South Africa", flag: "🇿🇦", system: "vat", currency: "ZAR",
    rates: [
      { name: "Standard VAT", rate: 15, tax_type: "vat", applies_to: "all", code: "ZA-VAT-STD" },
      { name: "Zero-rated VAT", rate: 0, tax_type: "vat", applies_to: "goods", code: "ZA-VAT-ZR" },
    ],
  },
  BR: {
    name: "Brazil", flag: "🇧🇷", system: "hybrid", currency: "BRL",
    rates: [
      { name: "ICMS (Average)", rate: 18, tax_type: "sales_tax", applies_to: "goods", code: "BR-ICMS" },
      { name: "IPI (Average)", rate: 10, tax_type: "excise", applies_to: "goods", code: "BR-IPI" },
      { name: "ISS (Services)", rate: 5, tax_type: "service_tax", applies_to: "services", code: "BR-ISS" },
      { name: "PIS", rate: 1.65, tax_type: "other", applies_to: "all", code: "BR-PIS" },
      { name: "COFINS", rate: 7.6, tax_type: "other", applies_to: "all", code: "BR-COF" },
    ],
  },
  MY: {
    name: "Malaysia", flag: "🇲🇾", system: "sales_tax", currency: "MYR",
    rates: [
      { name: "Sales Tax", rate: 10, tax_type: "sales_tax", applies_to: "goods", code: "MY-SST-S" },
      { name: "Service Tax", rate: 8, tax_type: "service_tax", applies_to: "services", code: "MY-SST-SVC" },
    ],
  },
  KR: {
    name: "South Korea", flag: "🇰🇷", system: "vat", currency: "KRW",
    rates: [
      { name: "VAT Standard", rate: 10, tax_type: "vat", applies_to: "all", code: "KR-VAT-STD" },
      { name: "Zero-rated VAT", rate: 0, tax_type: "vat", applies_to: "exports", code: "KR-VAT-ZR" },
    ],
  },
  IT: {
    name: "Italy", flag: "🇮🇹", system: "vat", currency: "EUR",
    rates: [
      { name: "IVA Standard", rate: 22, tax_type: "vat", applies_to: "all", code: "IT-IVA-STD" },
      { name: "IVA Reduced", rate: 10, tax_type: "vat", applies_to: "goods", code: "IT-IVA-RED" },
      { name: "IVA Super Reduced", rate: 4, tax_type: "vat", applies_to: "goods", code: "IT-IVA-SRED" },
    ],
  },
  ES: {
    name: "Spain", flag: "🇪🇸", system: "vat", currency: "EUR",
    rates: [
      { name: "IVA General", rate: 21, tax_type: "vat", applies_to: "all", code: "ES-IVA-GEN" },
      { name: "IVA Reducido", rate: 10, tax_type: "vat", applies_to: "goods", code: "ES-IVA-RED" },
      { name: "IVA Superreducido", rate: 4, tax_type: "vat", applies_to: "goods", code: "ES-IVA-SRED" },
    ],
  },
  PK: {
    name: "Pakistan", flag: "🇵🇰", system: "gst", currency: "PKR",
    rates: [
      { name: "General Sales Tax", rate: 18, tax_type: "gst", applies_to: "all", code: "PK-GST-STD" },
      { name: "Reduced GST", rate: 10, tax_type: "gst", applies_to: "goods", code: "PK-GST-RED" },
      { name: "WHT (Services)", rate: 8, tax_type: "withholding", applies_to: "services", code: "PK-WHT-SVC" },
    ],
  },
};

type ImportableRate = { name: string; rate: number; tax_type: string; applies_to: string; code: string; selected: boolean; editing: boolean; };

export default function TaxCodeImporter() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [previewRates, setPreviewRates] = useState<ImportableRate[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string; country: string }[]>([]);
  const [targetProfile, setTargetProfile] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("tax_profiles").select("id, name, country").eq("tenant_id", tenantId).order("name")
      .then(({ data }) => { setProfiles((data as any[]) || []); setLoadingProfiles(false); });
  }, [tenantId]);

  const countryEntries = Object.entries(COUNTRY_TAX_DATA);
  const filteredCountries = countryEntries.filter(([code, data]) =>
    data.name.toLowerCase().includes(search.toLowerCase()) || code.toLowerCase().includes(search.toLowerCase())
  );

  const selectCountry = (code: string) => {
    setSelectedCountry(code);
    setImported(false);
    const data = COUNTRY_TAX_DATA[code];
    setPreviewRates(data.rates.map((r) => ({ ...r, selected: true, editing: false })));
    // Auto-select matching profile
    const match = profiles.find((p) => p.country === code);
    setTargetProfile(match?.id || "");
  };

  const toggleRate = (idx: number) => {
    setPreviewRates((prev) => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
  };

  const toggleEdit = (idx: number) => {
    setPreviewRates((prev) => prev.map((r, i) => i === idx ? { ...r, editing: !r.editing } : r));
  };

  const updateRate = (idx: number, field: string, value: any) => {
    setPreviewRates((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRate = (idx: number) => {
    setPreviewRates((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImport = async () => {
    if (!targetProfile) { toast.error("Please select or create a tax profile first"); return; }
    const selected = previewRates.filter((r) => r.selected);
    if (selected.length === 0) { toast.error("No rates selected"); return; }

    setImporting(true);
    const payload = selected.map((r) => ({
      name: r.name,
      rate: r.rate,
      tax_type: r.tax_type,
      applies_to: r.applies_to,
      rate_type: "percentage" as const,
      is_active: true,
      is_compound: false,
      tax_profile_id: targetProfile,
      tenant_id: tenantId,
    }));

    const { error } = await supabase.from("tax_rates").insert(payload);
    setImporting(false);
    if (error) toast.error("Import failed: " + error.message);
    else { toast.success(`${selected.length} tax rates imported successfully`); setImported(true); }
  };

  const createProfileAndImport = async () => {
    if (!selectedCountry || !tenantId) return;
    const data = COUNTRY_TAX_DATA[selectedCountry];
    setImporting(true);
    const { data: profile, error } = await supabase.from("tax_profiles").insert({
      country: selectedCountry,
      name: `${data.name} Tax Profile`,
      region: "National",
      tax_system: data.system,
      currency: data.currency,
      default_tax_rate: data.rates.find((r) => r.applies_to === "all")?.rate || data.rates[0]?.rate || 0,
      filing_frequency: "quarterly",
      fiscal_year_start: "01-01",
      is_active: true,
      is_default: false,
      tenant_id: tenantId,
      created_by: user?.id,
    } as any).select("id").single();

    if (error || !profile) { toast.error("Failed to create profile"); setImporting(false); return; }
    setTargetProfile(profile.id);
    setProfiles((prev) => [...prev, { id: profile.id, name: `${data.name} Tax Profile`, country: selectedCountry }]);

    // Now import rates
    const selected = previewRates.filter((r) => r.selected);
    const payload = selected.map((r) => ({
      name: r.name, rate: r.rate, tax_type: r.tax_type, applies_to: r.applies_to,
      rate_type: "percentage", is_active: true, is_compound: false,
      tax_profile_id: profile.id, tenant_id: tenantId,
    }));
    const { error: rErr } = await supabase.from("tax_rates").insert(payload);
    setImporting(false);
    if (rErr) toast.error("Import failed"); 
    else { toast.success(`Profile created & ${selected.length} rates imported`); setImported(true); }
  };

  if (loadingProfiles) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const selectedData = selectedCountry ? COUNTRY_TAX_DATA[selectedCountry] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax Code Importer</h1>
        <p className="text-sm text-muted-foreground mt-1">Import pre-built country tax codes, rates & settings — then customize</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Selector */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search countries..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto">
            {filteredCountries.map(([code, data]) => (
              <button
                key={code}
                onClick={() => selectCountry(code)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left border-b border-border last:border-0 transition-colors ${
                  selectedCountry === code ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"
                }`}
              >
                <span className="text-xl">{data.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{data.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{data.system.replace("_", " ")} • {data.currency} • {data.rates.length} rates</p>
                </div>
                {selectedCountry === code && <ArrowRight className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
            {filteredCountries.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No countries found</p>}
          </div>
        </div>

        {/* Preview & Import */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedCountry ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a country to preview its tax codes and rates</p>
            </div>
          ) : (
            <>
              {/* Country Header */}
              <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedData?.flag}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedData?.name}</h2>
                    <p className="text-xs text-muted-foreground uppercase">{selectedData?.system.replace("_", " ")} System • {selectedData?.currency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{previewRates.filter((r) => r.selected).length}/{previewRates.length} selected</span>
                </div>
              </div>

              {/* Target Profile */}
              <div className="bg-card border border-border rounded-xl p-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Import into Tax Profile</label>
                <div className="flex items-center gap-2">
                  <select value={targetProfile} onChange={(e) => setTargetProfile(e.target.value)} className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Select existing profile...</option>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.country})</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground">or</span>
                  <Button variant="outline" size="sm" onClick={createProfileAndImport} disabled={importing || imported}>
                    {importing ? <Spinner size="sm" /> : <><Download className="h-3.5 w-3.5 mr-1" /> Create Profile & Import</>}
                  </Button>
                </div>
              </div>

              {/* Rates Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={previewRates.every((r) => r.selected)} onChange={(e) => setPreviewRates((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))} /></th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Tax Code</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Rate</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Applies To</th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRates.map((r, idx) => (
                      <tr key={idx} className={`border-b border-border last:border-0 transition-colors ${r.selected ? "bg-primary/5" : "opacity-50"}`}>
                        <td className="px-3 py-2.5"><input type="checkbox" checked={r.selected} onChange={() => toggleRate(idx)} /></td>
                        <td className="px-3 py-2.5 font-mono text-xs text-primary">{r.code}</td>
                        <td className="px-3 py-2.5">
                          {r.editing ? (
                            <input value={r.name} onChange={(e) => updateRate(idx, "name", e.target.value)} className="w-full h-7 rounded border border-input bg-background px-2 text-xs" />
                          ) : (
                            <span className="text-foreground">{r.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.editing ? (
                            <input type="number" step="0.01" value={r.rate} onChange={(e) => updateRate(idx, "rate", parseFloat(e.target.value) || 0)} className="w-20 h-7 rounded border border-input bg-background px-2 text-xs" />
                          ) : (
                            <span className="font-mono text-foreground font-medium">{r.rate}%</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.editing ? (
                            <select value={r.tax_type} onChange={(e) => updateRate(idx, "tax_type", e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-xs">
                              {["vat","sales_tax","gst","service_tax","excise","customs","withholding","other"].map((t) => <option key={t} value={t}>{t.replace("_"," ").toUpperCase()}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs uppercase text-muted-foreground">{r.tax_type.replace("_", " ")}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.editing ? (
                            <select value={r.applies_to} onChange={(e) => updateRate(idx, "applies_to", e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-xs">
                              {["all","goods","services","imports","exports"].map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs capitalize text-muted-foreground">{r.applies_to}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => toggleEdit(idx)} className={`p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 ${r.editing ? "text-primary bg-primary/10" : ""}`}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => removeRate(idx)} className="p-1 rounded text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Button */}
              <div className="flex items-center justify-between">
                {imported ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Successfully imported! You can edit imported rates in Tax Rates.
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{previewRates.filter((r) => r.selected).length} rates will be imported</p>
                )}
                {targetProfile && !imported && (
                  <Button onClick={handleImport} disabled={importing || previewRates.filter((r) => r.selected).length === 0}>
                    {importing ? <Spinner size="sm" /> : <><Download className="h-4 w-4 mr-2" /> Import Selected Rates</>}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
