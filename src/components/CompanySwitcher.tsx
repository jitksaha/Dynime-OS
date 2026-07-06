import { useState, useEffect } from "react";
import { ChevronDown, Settings, LogOut, User, Plus, Check, Lock } from "lucide-react";
import { useCompanySwitcher } from "@/hooks/useCompanySwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useKybStatus } from "@/hooks/useKybStatus";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface CompanySwitcherProps {
  collapsed?: boolean;
}

export function CompanySwitcher({ collapsed = false }: CompanySwitcherProps) {
  const [open, setOpen] = useState(false);
  const { companies, currentTenantId, switching, switchCompany, hasMultipleCompanies } = useCompanySwitcher();
  const { profile, signOut } = useAuth();
  const { isVerified } = useKybStatus();
  const navigate = useNavigate();
  const [companyLimit, setCompanyLimit] = useState<number>(-1);

  // Fetch max_companies from subscription plan
  useEffect(() => {
    if (!currentTenantId) return;
    const fetchLimit = async () => {
      const { data: tenant } = await supabase.from("tenants").select("plan").eq("id", currentTenantId).single();
      if (tenant?.plan) {
        const { data: planData } = await supabase.from("subscription_plans").select("max_companies").eq("slug", tenant.plan).single();
        if (planData) setCompanyLimit(planData.max_companies ?? -1);
      }
    };
    fetchLimit();
  }, [currentTenantId]);

  const currentCompany = companies.find((c) => c.tenant_id === currentTenantId);
  const otherCompanies = companies.filter((c) => c.tenant_id !== currentTenantId);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleCreateNew = () => {
    if (companyLimit !== -1 && companies.length >= companyLimit) {
      toast.error(`Your plan allows a maximum of ${companyLimit} companies. Please upgrade your subscription.`);
      return;
    }
    setOpen(false);
    navigate("/onboarding?new=1");
  };

  const isAtLimit = companyLimit !== -1 && companies.length >= companyLimit;

  if (collapsed) {
    return (
      <div className="flex items-center justify-center h-14 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold font-brand text-sm">
          {currentCompany?.name?.charAt(0)?.toUpperCase() || "B"}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full h-14 px-4 border-b border-sidebar-border hover:bg-sidebar-accent/50 transition-colors"
      >
        <div className="flex items-center min-w-0 gap-2.5">
          {currentCompany?.logo_url ? (
            <img src={currentCompany.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold font-brand text-sm shrink-0">
              {currentCompany?.name?.charAt(0)?.toUpperCase() || "B"}
            </div>
          )}
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold font-brand text-sidebar-foreground truncate max-w-[130px]">
                {currentCompany?.name || "Company"}
              </span>
              {isVerified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            </div>
            {currentCompany?.role && (
              <span className="text-[10px] text-sidebar-foreground/50 capitalize">{currentCompany.role.replace("_", " ")}</span>
            )}
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-sidebar-foreground/40 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-2 right-2 z-[70] mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* All companies list — current first, then others */}
            <div className="py-1 max-h-64 overflow-y-auto">
              {/* Current company */}
              <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left bg-accent/50 cursor-default">
                {currentCompany?.logo_url ? (
                  <img src={currentCompany.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold font-brand text-xs shrink-0">
                    {currentCompany?.name?.charAt(0)?.toUpperCase() || "B"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold font-brand text-foreground truncate">{currentCompany?.name}</p>
                    {isVerified && <BadgeCheck className="h-3 w-3 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground capitalize">{currentCompany?.role?.replace("_", " ")}</p>
                </div>
                <Check className="h-4 w-4 text-primary shrink-0" />
              </button>

              {/* Other companies */}
              {otherCompanies.map((company) => (
                <button
                  key={company.tenant_id}
                  disabled={switching}
                  onClick={() => {
                    switchCompany(company.tenant_id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-foreground/70 font-semibold font-brand text-xs shrink-0">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{company.role.replace("_", " ")}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Create new company */}
            <div className="border-t border-border">
              <button
                onClick={handleCreateNew}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors ${
                  isAtLimit ? "text-muted-foreground cursor-not-allowed" : "text-foreground hover:bg-accent"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg border-2 border-dashed flex items-center justify-center shrink-0 ${
                  isAtLimit ? "border-muted-foreground/20" : "border-muted-foreground/30"
                }`}>
                  {isAtLimit ? <Lock className="h-4 w-4 text-muted-foreground/50" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                  <span className="font-medium">{isAtLimit ? "Company limit reached" : "Create new company"}</span>
                  {isAtLimit && <p className="text-[10px] text-muted-foreground">Upgrade to add more</p>}
                </div>
              </button>
            </div>

            {/* User actions */}
            <div className="border-t border-border py-1">
              <button
                onClick={() => { navigate("/settings"); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </button>
              <button
                onClick={() => { navigate("/settings"); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                {profile?.full_name || "My Account"}
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
