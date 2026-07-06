// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  Globe, CreditCard, Loader2, RefreshCw, ToggleLeft, ToggleRight,
  Search, CheckCircle2, AlertCircle, ArrowUpDown, Sparkles, Shield,
  GripVertical, ChevronUp, ChevronDown, Settings2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Gateway {
  gateway_key: string;
  display_name: string;
  is_enabled: boolean;
  description: string | null;
}

interface CountryEntry {
  code: string;
  name: string;
  flag: string;
}

interface CountryMethodRow {
  id?: string;
  country_code: string;
  gateway_key: string;
  is_enabled: boolean;
  priority: number;
}

const FALLBACK_CODE = "__FALLBACK__";

export default function CountryPaymentFlowBuilder() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [mappings, setMappings] = useState<CountryMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [gwRes, countryRes, mapRes] = await Promise.all([
      supabase.from("payment_gateway_configs").select("gateway_key, display_name, is_enabled, description"),
      supabase.from("platform_settings").select("value").eq("key", "enabled_countries").single(),
      supabase.from("country_payment_methods").select("*"),
    ]);

    const gw = (gwRes.data as Gateway[]) || [];
    setGateways(gw);

    const raw: any[] = countryRes.data?.value ? (countryRes.data.value as any as any[]) : [];
    const countryList: CountryEntry[] = raw.map((c: any) => ({
      code: c.code, name: c.name, flag: c.flag,
    }));
    setCountries(countryList);
    setMappings((mapRes.data as CountryMethodRow[]) || []);

    if (countryList.length > 0 && !selectedCountry) {
      setSelectedCountry(countryList[0].code);
    }
    setLoading(false);
  }, [selectedCountry]);

  useEffect(() => { fetchAll(); }, []);

  const activeGateways = gateways.filter(g => g.is_enabled);

  const getMapping = (countryCode: string, gatewayKey: string) =>
    mappings.find(m => m.country_code === countryCode && m.gateway_key === gatewayKey);

  const isEnabled = (countryCode: string, gatewayKey: string) => {
    const m = getMapping(countryCode, gatewayKey);
    return m?.is_enabled ?? false;
  };

  const getPriority = (countryCode: string, gatewayKey: string) => {
    const m = getMapping(countryCode, gatewayKey);
    return m?.priority ?? 99;
  };

  /** Get sorted gateways for a country based on priority */
  const getSortedGateways = (countryCode: string) => {
    return [...activeGateways].sort((a, b) => {
      const pa = getPriority(countryCode, a.gateway_key);
      const pb = getPriority(countryCode, b.gateway_key);
      return pa - pb;
    });
  };

  const refreshMappings = async () => {
    const { data } = await supabase.from("country_payment_methods").select("*");
    setMappings((data as CountryMethodRow[]) || []);
  };

  const toggleMethod = async (countryCode: string, gateway: Gateway) => {
    const key = `${countryCode}-${gateway.gateway_key}`;
    setSaving(key);
    const existing = getMapping(countryCode, gateway.gateway_key);

    if (existing?.id) {
      const { error } = await supabase
        .from("country_payment_methods")
        .update({ is_enabled: !existing.is_enabled } as any)
        .eq("id", existing.id);
      if (error) { toast.error("Failed to update"); setSaving(null); return; }
    } else {
      const enabledCount = activeGateways.filter(gw => isEnabled(countryCode, gw.gateway_key)).length;
      const { error } = await supabase.from("country_payment_methods").insert({
        country_code: countryCode,
        gateway_key: gateway.gateway_key,
        is_enabled: true,
        priority: enabledCount,
      } as any);
      if (error) { toast.error("Failed to enable"); setSaving(null); return; }
    }

    toast.success(`${gateway.display_name} updated for ${countryCode === FALLBACK_CODE ? "Fallback" : countryCode}`);
    await refreshMappings();
    setSaving(null);
  };

  const movePriority = async (countryCode: string, gatewayKey: string, direction: "up" | "down") => {
    const sorted = getSortedGateways(countryCode).filter(gw => isEnabled(countryCode, gw.gateway_key));
    const idx = sorted.findIndex(gw => gw.gateway_key === gatewayKey);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const key = `priority-${countryCode}`;
    setSaving(key);

    const currentMapping = getMapping(countryCode, sorted[idx].gateway_key);
    const swapMapping = getMapping(countryCode, sorted[swapIdx].gateway_key);

    if (currentMapping?.id && swapMapping?.id) {
      const currentPriority = currentMapping.priority;
      const swapPriority = swapMapping.priority;
      await Promise.all([
        supabase.from("country_payment_methods").update({ priority: swapPriority } as any).eq("id", currentMapping.id),
        supabase.from("country_payment_methods").update({ priority: currentPriority } as any).eq("id", swapMapping.id),
      ]);
    }

    await refreshMappings();
    setSaving(null);
  };

  const enableAllForCountry = async (countryCode: string) => {
    setSaving(`all-${countryCode}`);
    for (let i = 0; i < activeGateways.length; i++) {
      const gw = activeGateways[i];
      const existing = getMapping(countryCode, gw.gateway_key);
      if (existing?.id) {
        await supabase.from("country_payment_methods").update({ is_enabled: true, priority: i } as any).eq("id", existing.id);
      } else {
        await supabase.from("country_payment_methods").insert({
          country_code: countryCode, gateway_key: gw.gateway_key, is_enabled: true, priority: i,
        } as any);
      }
    }
    toast.success(`All methods enabled for ${countryCode === FALLBACK_CODE ? "Fallback" : countryCode}`);
    await refreshMappings();
    setSaving(null);
  };

  const disableAllForCountry = async (countryCode: string) => {
    setSaving(`all-${countryCode}`);
    for (const gw of activeGateways) {
      const existing = getMapping(countryCode, gw.gateway_key);
      if (existing?.id) {
        await supabase.from("country_payment_methods").update({ is_enabled: false } as any).eq("id", existing.id);
      }
    }
    toast.success(`All methods disabled for ${countryCode === FALLBACK_CODE ? "Fallback" : countryCode}`);
    await refreshMappings();
    setSaving(null);
  };

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCountForCountry = (code: string) =>
    activeGateways.filter(gw => isEnabled(code, gw.gateway_key)).length;

  const isFallbackSelected = selectedCountry === FALLBACK_CODE;
  const selectedCountryObj = isFallbackSelected
    ? { code: FALLBACK_CODE, name: "Fallback / Default", flag: "🌐" }
    : countries.find(c => c.code === selectedCountry);

  const hasFallbackConfig = mappings.some(m => m.country_code === FALLBACK_CODE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderConfigPanel = (countryCode: string, countryObj: { code: string; name: string; flag: string }) => {
    const sorted = getSortedGateways(countryCode);
    const enabledSorted = sorted.filter(gw => isEnabled(countryCode, gw.gateway_key));
    const disabledSorted = sorted.filter(gw => !isEnabled(countryCode, gw.gateway_key));

    return (
      <>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{countryObj.flag}</span>
            <div>
              <h2 className="text-sm font-bold text-foreground">{countryObj.name}</h2>
              <p className="text-xs text-muted-foreground">
                {enabledCountForCountry(countryCode)} of {activeGateways.length} methods enabled
                {isFallbackSelected && " • Used when country has no specific config"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => enableAllForCountry(countryCode)}
              disabled={saving !== null}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              Enable All
            </button>
            <button
              onClick={() => disableAllForCountry(countryCode)}
              disabled={saving !== null}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
            >
              Disable All
            </button>
          </div>
        </div>

        {activeGateways.length === 0 ? (
          <div className="py-14 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No payment gateways are enabled on the platform</p>
            <p className="text-xs text-muted-foreground mt-1">Enable gateways in Payment Gateway settings first</p>
          </div>
        ) : (
          <div>
            {/* Enabled gateways with priority controls */}
            {enabledSorted.length > 0 && (
              <div className="border-b border-border">
                <div className="px-5 py-2 bg-primary/5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3" /> Active — Drag to reorder priority
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {enabledSorted.map((gw, idx) => {
                    const isSaving = saving === `${countryCode}-${gw.gateway_key}` || saving?.startsWith(`all-${countryCode}`) || saving === `priority-${countryCode}`;
                    return (
                      <div key={gw.gateway_key} className="flex items-center gap-3 px-5 py-4 bg-primary/5 transition-all">
                        {/* Priority arrows */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => movePriority(countryCode, gw.gateway_key, "up")}
                            disabled={idx === 0 || isSaving}
                            className="p-0.5 rounded hover:bg-primary/10 disabled:opacity-20 transition-colors"
                          >
                            <ChevronUp className="h-3.5 w-3.5 text-primary" />
                          </button>
                          <button
                            onClick={() => movePriority(countryCode, gw.gateway_key, "down")}
                            disabled={idx === enabledSorted.length - 1 || isSaving}
                            className="p-0.5 rounded hover:bg-primary/10 disabled:opacity-20 transition-colors"
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-primary" />
                          </button>
                        </div>

                        <div className="p-2 rounded-lg text-muted-foreground/40">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        <div className="p-2.5 rounded-xl bg-primary/15">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{gw.display_name}</p>
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            {idx === 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                #1 PRIORITY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{gw.description || gw.gateway_key}</p>
                        </div>
                        <Switch
                          checked={true}
                          onCheckedChange={() => toggleMethod(countryCode, gw)}
                          disabled={isSaving}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Disabled gateways */}
            {disabledSorted.length > 0 && (
              <div>
                {enabledSorted.length > 0 && (
                  <div className="px-5 py-2 bg-muted/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Available to Enable
                    </p>
                  </div>
                )}
                <div className="divide-y divide-border">
                  {disabledSorted.map(gw => {
                    const isSaving = saving === `${countryCode}-${gw.gateway_key}` || saving?.startsWith(`all-${countryCode}`);
                    return (
                      <div key={gw.gateway_key} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-all">
                        <div className="w-[52px]" /> {/* spacer for alignment */}
                        <div className="p-2.5 rounded-xl bg-muted/10">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{gw.display_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{gw.description || gw.gateway_key}</p>
                        </div>
                        <Switch
                          checked={false}
                          onCheckedChange={() => toggleMethod(countryCode, gw)}
                          disabled={isSaving}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Country Payment Flow Builder</h1>
            <p className="text-xs text-muted-foreground">Configure payment methods, priority & fallback per country</p>
          </div>
        </div>
        <button onClick={fetchAll} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all hover:scale-105">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-5">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Dynamic Sync</p>
              <p className="text-xs text-muted-foreground">New payment methods auto-appear when enabled</p>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{countries.length}</p>
              <p className="text-[10px] text-muted-foreground">Countries</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{activeGateways.length}</p>
              <p className="text-[10px] text-muted-foreground">Gateways</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{hasFallbackConfig ? "✓" : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Fallback</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Country List + Config Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Country List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Fallback config entry */}
          <button
            onClick={() => setSelectedCountry(FALLBACK_CODE)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-border ${
              isFallbackSelected ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-muted/30 border-l-2 border-l-transparent"
            }`}
          >
            <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Settings2 className={`h-4 w-4 ${isFallbackSelected ? "text-accent-foreground" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isFallbackSelected ? "text-accent-foreground" : "text-foreground"}`}>
                Fallback / Default
              </p>
              <p className="text-[10px] text-muted-foreground">Used for unconfigured countries</p>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hasFallbackConfig ? "bg-accent/10 text-accent-foreground" : "bg-muted/30 text-muted-foreground"
            }`}>
              {enabledCountForCountry(FALLBACK_CODE)}/{activeGateways.length}
            </div>
          </button>

          <div className="max-h-[440px] overflow-y-auto divide-y divide-border">
            {filteredCountries.map(country => {
              const count = enabledCountForCountry(country.code);
              const isActive = selectedCountry === country.code;
              return (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/30 border-l-2 border-transparent"
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {country.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{country.code}</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    count > 0 ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"
                  }`}>
                    {count}/{activeGateways.length}
                  </div>
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No countries found</div>
            )}
          </div>
        </div>

        {/* Config Panel */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {selectedCountryObj ? (
            renderConfigPanel(selectedCountryObj.code, selectedCountryObj)
          ) : (
            <div className="py-14 text-center">
              <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select a country to configure payment methods</p>
            </div>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold text-foreground">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Globe, text: "Configure payment methods per country with priority ordering" },
            { icon: Settings2, text: "Set a Fallback config for countries without specific rules" },
            { icon: ArrowUpDown, text: "Top-priority gateway shows as 'Recommended' at checkout" },
            { icon: Shield, text: "If no config or fallback exists, all platform methods are shown" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-card/60 border border-border/50">
              <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
