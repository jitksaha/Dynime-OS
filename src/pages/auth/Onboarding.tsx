import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Briefcase, CheckCircle2, ArrowRight, ArrowLeft, Save, Crown, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import type { CountryInfo } from "@/hooks/useCountry";
import { SearchableCountryCurrency } from "@/components/onboarding/SearchableCountryCurrency";
import { usePersistedState, clearPersistedKeys } from "@/hooks/usePersistedState";

const STORAGE_PREFIX = "onboarding:v1:";
const PERSISTED_KEYS = [
  `${STORAGE_PREFIX}step`,
  `${STORAGE_PREFIX}companyName`,
  `${STORAGE_PREFIX}industry`,
  `${STORAGE_PREFIX}size`,
  `${STORAGE_PREFIX}departments`,
  `${STORAGE_PREFIX}modules`,
  `${STORAGE_PREFIX}country`,
  `${STORAGE_PREFIX}plan`,
];

const steps = [
  { title: "Company Info", description: "Tell us about your organization" },
  { title: "Departments", description: "Set up your team structure" },
  { title: "Preferences", description: "Customize your workspace" },
  { title: "Choose a Plan", description: "Pick a plan to start your free trial" },
];

const industries = ["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", "Services", "Other"];
const companySizes = ["1-10", "11-50", "51-200", "201-500", "500+"];
const defaultDepts = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Support", "Design", "Operations"];
const moduleOptions = ["HRM", "CRM", "Marketing", "Helpdesk", "Projects", "Accounting"];

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  modules: string[];
  max_users: number;
  sort_order: number;
}

export default function Onboarding() {
  const [step, setStep] = usePersistedState<number>(`${STORAGE_PREFIX}step`, 0);
  const [companyName, setCompanyName] = usePersistedState<string>(`${STORAGE_PREFIX}companyName`, "");
  const [industry, setIndustry] = usePersistedState<string>(`${STORAGE_PREFIX}industry`, "");
  const [size, setSize] = usePersistedState<string>(`${STORAGE_PREFIX}size`, "");
  const [departments, setDepartments] = usePersistedState<string[]>(
    `${STORAGE_PREFIX}departments`,
    ["Engineering", "Sales", "Marketing", "HR"]
  );
  const [modules, setModules] = usePersistedState<string[]>(
    `${STORAGE_PREFIX}modules`,
    ["HRMS", "CRM"]
  );
  const [selectedPlanSlug, setSelectedPlanSlug] = usePersistedState<string>(
    `${STORAGE_PREFIX}plan`,
    ""
  );
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [selectedCountry, setSelectedCountry] = usePersistedState<CountryInfo | null>(
    `${STORAGE_PREFIX}country`,
    null
  );
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [trialDays, setTrialDays] = useState<number>(14);

  const navigate = useNavigate();

  // Redirect if already onboarded
  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }
      const params = new URLSearchParams(window.location.search);
      if (params.get("new") === "1") { setChecking(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, tenant_id")
        .eq("user_id", user.id)
        .single();
      if (data?.onboarding_completed && data?.tenant_id) {
        navigate("/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
    };
    checkOnboarding();
  }, [navigate]);

  // Load countries
  useEffect(() => {
    const loadCountries = async () => {
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "enabled_countries").single();
      const list: CountryInfo[] = data?.value ? (data.value as any as CountryInfo[]) : [];
      setCountries(list);

      if (selectedCountry && list.find((c) => c.code === selectedCountry.code)) return;

      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
        const geo = await res.json();
        const match = list.find((c) => c.code === geo.country_code);
        if (match) { setSelectedCountry(match); return; }
      } catch {}
      setSelectedCountry(list.find((c) => c.code === "US") || list[0] || null);
    };
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load plans + trial days
  useEffect(() => {
    const load = async () => {
      const [plansRes, trialRes] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("platform_settings").select("value").eq("key", "trial_days").maybeSingle(),
      ]);
      if (plansRes.data) setPlans(plansRes.data as PlanRow[]);
      const tdRaw = trialRes.data?.value;
      const td = typeof tdRaw === "number" ? tdRaw : parseInt(String(tdRaw ?? "14"), 10);
      setTrialDays(Number.isFinite(td) && td > 0 ? td : 14);
      // Default selection — prefer "starter" if nothing selected
      if (!selectedPlanSlug && plansRes.data?.length) {
        const def = (plansRes.data as PlanRow[]).find(p => p.slug === "starter") || (plansRes.data as PlanRow[])[0];
        setSelectedPlanSlug(def.slug);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSavedAt(new Date());
  }, [companyName, industry, size, departments, modules, selectedCountry, selectedPlanSlug, step]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const toggleDept = (dept: string) => {
    setDepartments((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]);
  };

  const toggleModule = (mod: string) => {
    setModules((prev) => prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]);
  };

  const isNewCompany = new URLSearchParams(window.location.search).get("new") === "1";

  const handleComplete = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }
    if (!selectedPlanSlug) {
      toast.error("Please select a plan to continue");
      return;
    }
    setLoading(true);
    try {
      const slug = companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
      const rpcName = isNewCompany ? "create_additional_company" : "complete_onboarding";

      const { error } = await supabase.rpc(rpcName, {
        _company_name: companyName.trim(),
        _slug: slug,
        _industry: industry || null,
        _size: size || null,
        _country: selectedCountry?.code || "US",
        _currency: selectedCountry?.currency || "USD",
        _currency_symbol: selectedCountry?.symbol || "$",
        _plan_slug: selectedPlanSlug,
      });

      if (error) throw error;

      toast.success(isNewCompany
        ? "New company created!"
        : `Setup complete! Your ${trialDays}-day free trial has started.`);
      clearPersistedKeys(PERSISTED_KEYS);
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (n: number) => {
    const symbol = selectedCountry?.symbol || "$";
    const rate = selectedCountry?.exchange_rate || 1;
    const v = Math.round(n * rate);
    return v === 0 ? "Free" : `${symbol}${v.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-base font-bold text-foreground">Dynime Setup</span>
          {savedAt && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
              <Save className="h-3 w-3 text-success" />
              Auto-saved
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto w-full px-4 pt-8">
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold shrink-0 ${
                i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? "bg-success" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pb-8">
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
                <h2 className="text-lg font-semibold text-foreground">Company Information</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  className="w-full h-10 px-4 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Industry</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {industries.map((ind) => (
                    <button
                      key={ind}
                      onClick={() => setIndustry(ind)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                        industry === ind ? "border-primary bg-primary text-primary-foreground font-medium shadow-md shadow-primary/25 scale-[1.02]" : "border-input text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground hover:shadow-sm"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Company Size</label>
                <div className="flex flex-wrap gap-2">
                  {companySizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
                        size === s ? "border-primary bg-primary text-primary-foreground font-medium shadow-md shadow-primary/25 scale-[1.02]" : "border-input text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground hover:shadow-sm"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <SearchableCountryCurrency
                countries={countries}
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <h2 className="text-lg font-semibold text-foreground">Departments</h2>
              </div>
              <p className="text-sm text-muted-foreground">Select the departments in your organization. You can add more later.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {defaultDepts.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => toggleDept(dept)}
                    className={`px-3 py-2.5 rounded-lg border text-sm transition-all duration-200 ${
                      departments.includes(dept) ? "border-primary bg-primary text-primary-foreground font-medium shadow-md shadow-primary/25 scale-[1.02]" : "border-input text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground hover:shadow-sm"
                    }`}
                  >
                    {departments.includes(dept) && <CheckCircle2 className="h-3 w-3 inline mr-1.5" />}
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10"><Briefcase className="h-5 w-5 text-primary" /></div>
                <h2 className="text-lg font-semibold text-foreground">Choose Modules</h2>
              </div>
              <p className="text-sm text-muted-foreground">Select which modules you want to activate. All modules are available on your plan.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {moduleOptions.map((mod) => (
                  <button
                    key={mod}
                    onClick={() => toggleModule(mod)}
                    className={`px-3 py-3 rounded-lg border text-sm transition-all duration-200 ${
                      modules.includes(mod) ? "border-primary bg-primary text-primary-foreground font-medium shadow-md shadow-primary/25 scale-[1.02]" : "border-input text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground hover:shadow-sm"
                    }`}
                  >
                    {modules.includes(mod) && <CheckCircle2 className="h-3 w-3 inline mr-1.5" />}
                    {mod}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10"><Crown className="h-5 w-5 text-primary" /></div>
                <h2 className="text-lg font-semibold text-foreground">Choose Your Plan</h2>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
                <div className="p-1.5 rounded-md bg-primary/10 mt-0.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {trialDays}-Day Free Trial Included
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Start with the plan that fits you — no payment needed today. After {trialDays} days you'll need an active subscription to keep using the platform. You can change your plan anytime from <strong>My Subscription</strong>.
                  </p>
                </div>
              </div>

              {plans.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground mt-3">Loading plans…</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {plans.map((p) => {
                    const selected = selectedPlanSlug === p.slug;
                    const isPopular = p.slug === "professional";
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlanSlug(p.slug)}
                        className={`relative text-left rounded-xl border p-4 transition-all duration-200 flex flex-col ${
                          selected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md shadow-primary/10"
                            : "border-border bg-background hover:border-primary/40 hover:bg-primary/[0.02]"
                        }`}
                      >
                        {isPopular && (
                          <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wide">
                            Popular
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-foreground">{p.name}</p>
                          {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-xl font-bold text-foreground">
                          {formatPrice(p.price_monthly)}
                          {p.price_monthly > 0 && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                        </p>
                        {p.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                          <p className="text-[11px] text-foreground flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-primary" />
                            Up to {p.max_users === -1 || p.max_users >= 9999 ? "∞" : p.max_users} users
                          </p>
                          {(p.features || []).slice(0, 3).map((f, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" />
                              <span className="line-clamp-1">{f}</span>
                            </p>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading || !companyName.trim() || !selectedPlanSlug}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Setting up..." : `Start ${trialDays}-Day Free Trial`}
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
