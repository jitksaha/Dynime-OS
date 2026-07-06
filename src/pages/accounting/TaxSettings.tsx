import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Globe, Percent, ChevronDown, ChevronUp, Star } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

interface TaxRate {
  id: string;
  tax_profile_id: string;
  name: string;
  rate: number;
  tax_type: string;
  is_compound: boolean;
}

interface TaxProfile {
  id: string;
  name: string;
  region: string;
  country: string;
  is_default: boolean;
  tax_rates?: TaxRate[];
}

export default function TaxSettings() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
  const [showRateForm, setShowRateForm] = useState<string | null>(null);

  // Profile form state
  const [profileName, setProfileName] = useState("");
  const [profileRegion, setProfileRegion] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileDefault, setProfileDefault] = useState(false);

  // Rate form state
  const [rateName, setRateName] = useState("");
  const [rateValue, setRateValue] = useState("");
  const [rateType, setRateType] = useState("percentage");
  const [rateCompound, setRateCompound] = useState(false);

  const fetchProfiles = async () => {
    if (!tenantId) return;
    const { data: profilesData } = await supabase
      .from("tax_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (profilesData) {
      const { data: ratesData } = await supabase
        .from("tax_rates")
        .select("*")
        .eq("tenant_id", tenantId);

      const enriched = profilesData.map((p: any) => ({
        ...p,
        tax_rates: (ratesData || []).filter((r: any) => r.tax_profile_id === p.id),
      }));
      setProfiles(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, [tenantId]);

  const resetProfileForm = () => {
    setProfileName("");
    setProfileRegion("");
    setProfileCountry("");
    setProfileDefault(false);
    setEditingProfile(null);
    setShowProfileForm(false);
  };

  const resetRateForm = () => {
    setRateName("");
    setRateValue("");
    setRateType("percentage");
    setRateCompound(false);
    setShowRateForm(null);
  };

  const handleSaveProfile = async () => {
    if (!tenantId || !profileName || !profileRegion) return;

    if (profileDefault) {
      // Unset other defaults
      await supabase
        .from("tax_profiles")
        .update({ is_default: false } as any)
        .eq("tenant_id", tenantId);
    }

    if (editingProfile) {
      const { error } = await supabase
        .from("tax_profiles")
        .update({ name: profileName, region: profileRegion, country: profileCountry, is_default: profileDefault } as any)
        .eq("id", editingProfile.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Tax profile updated");
    } else {
      const { error } = await supabase.from("tax_profiles").insert(buildInsert({
        name: profileName,
        region: profileRegion,
        country: profileCountry,
        is_default: profileDefault,
      }));
      if (error) { toast.error(error.message); return; }
      toast.success("Tax profile created");
    }
    resetProfileForm();
    fetchProfiles();
  };

  const handleDeleteProfile = async (id: string) => {
    const { error } = await supabase.from("tax_profiles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tax profile deleted");
    fetchProfiles();
  };

  const handleSaveRate = async (profileId: string) => {
    if (!tenantId || !rateName || !rateValue) return;
    const { error } = await supabase.from("tax_rates").insert({
      tax_profile_id: profileId,
      tenant_id: tenantId,
      name: rateName,
      rate: parseFloat(rateValue) || 0,
      tax_type: rateType,
      is_compound: rateCompound,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tax rate added");
    resetRateForm();
    fetchProfiles();
  };

  const handleDeleteRate = async (id: string) => {
    const { error } = await supabase.from("tax_rates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tax rate removed");
    fetchProfiles();
  };

  const totalRates = (rates: TaxRate[]) =>
    rates.reduce((sum, r) => sum + r.rate, 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tax & VAT Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure tax profiles by region with multiple tax rates</p>
        </div>
        <button
          onClick={() => { resetProfileForm(); setShowProfileForm(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add Tax Profile
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Profiles", value: profiles.length.toString(), color: "text-foreground" },
          { label: "Tax Rates", value: profiles.reduce((a, p) => a + (p.tax_rates?.length || 0), 0).toString(), color: "text-primary" },
          { label: "Regions", value: [...new Set(profiles.map(p => p.region))].length.toString(), color: "text-info" },
          { label: "Default Profile", value: profiles.find(p => p.is_default)?.name || "None", color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color} truncate`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Profile Form */}
      {showProfileForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editingProfile ? "Edit" : "New"} Tax Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Profile Name</label>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="e.g. US Sales Tax" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Region</label>
              <input value={profileRegion} onChange={e => setProfileRegion(e.target.value)} placeholder="e.g. California, EU, UK" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Country</label>
              <input value={profileCountry} onChange={e => setProfileCountry(e.target.value)} placeholder="e.g. United States" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={profileDefault} onChange={e => setProfileDefault(e.target.checked)} className="h-4 w-4 rounded border-input" />
                <span className="text-sm text-foreground">Set as default profile</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={resetProfileForm} className="px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
            <button onClick={handleSaveProfile} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              {editingProfile ? "Update" : "Create"} Profile
            </button>
          </div>
        </div>
      )}

      {/* Profiles List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No tax profiles yet. Create one to start configuring taxes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => {
            const isExpanded = expandedProfile === profile.id;
            return (
              <div key={profile.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Profile Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedProfile(isExpanded ? null : profile.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{profile.name}</p>
                        {profile.is_default && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success">
                            <Star className="h-3 w-3" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{profile.region}{profile.country ? `, ${profile.country}` : ""} — {profile.tax_rates?.length || 0} rate(s), total {totalRates(profile.tax_rates || []).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditingProfile(profile); setProfileName(profile.name); setProfileRegion(profile.region); setProfileCountry(profile.country); setProfileDefault(profile.is_default); setShowProfileForm(true); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded: Tax Rates */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-3">
                    {profile.tax_rates && profile.tax_rates.length > 0 ? (
                      <div className="space-y-2">
                        {profile.tax_rates.map((rate) => (
                          <div key={rate.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <Percent className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-sm font-medium text-foreground">{rate.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {rate.tax_type === "percentage" ? `${rate.rate}%` : `$${rate.rate} flat`}
                                  {rate.is_compound && " (compound)"}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteRate(rate.id)} className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No tax rates added yet</p>
                    )}

                    {/* Add Rate Form */}
                    {showRateForm === profile.id ? (
                      <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input value={rateName} onChange={e => setRateName(e.target.value)} placeholder="Tax name (e.g. VAT)" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                          <input value={rateValue} onChange={e => setRateValue(e.target.value)} type="number" step="0.01" placeholder="Rate (%)" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                          <select value={rateType} onChange={e => setRateType(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                            <option value="percentage">Percentage</option>
                            <option value="flat">Flat Amount</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input type="checkbox" checked={rateCompound} onChange={e => setRateCompound(e.target.checked)} className="h-3.5 w-3.5 rounded border-input" />
                            Compound (calculated on top of other taxes)
                          </label>
                          <div className="flex gap-2">
                            <button onClick={resetRateForm} className="px-3 py-1.5 rounded-lg border border-input text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
                            <button onClick={() => handleSaveRate(profile.id)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">Add Rate</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { resetRateForm(); setShowRateForm(profile.id); }} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Add Tax Rate
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
