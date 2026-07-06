import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, Briefcase, ArrowRight, Loader2, Shield, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

export default function CreatePortal() {
  const [selfServiceEnabled, setSelfServiceEnabled] = useState<boolean | null>(null);
  const [selectedType, setSelectedType] = useState<"employee" | "customer" | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "portal_self_service")
        .single();
      if (data) {
        const val = data.value as { enabled?: boolean };
        setSelfServiceEnabled(val?.enabled ?? false);
      }
      setLoading(false);
    };
    check();
  }, []);

  const handleContinue = () => {
    if (!selectedType) return;
    // Navigate to signup with portal type query param
    navigate(`/signup?portal_type=${selectedType}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selfServiceEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Managed Access Only</h1>
          <p className="text-sm text-muted-foreground">
            Self-service portal creation is currently disabled. Please contact your organization's administrator to get access.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Create Your Space</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Choose your portal type to get started with your personalized workspace
          </p>
        </div>

        <div className="space-y-3">
          {/* Employee Portal */}
          <button
            onClick={() => setSelectedType("employee")}
            className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
              selectedType === "employee"
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${
              selectedType === "employee" ? "bg-primary/10" : "bg-secondary"
            }`}>
              <Briefcase className={`h-6 w-6 ${
                selectedType === "employee" ? "text-primary" : "text-muted-foreground"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-foreground">Employee Portal</p>
              <p className="text-xs text-muted-foreground mt-1">
                Access your attendance, leave requests, tasks, and payroll information. Perfect for internal team members.
              </p>
            </div>
          </button>

          {/* Customer Portal */}
          <button
            onClick={() => setSelectedType("customer")}
            className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
              selectedType === "customer"
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${
              selectedType === "customer" ? "bg-primary/10" : "bg-secondary"
            }`}>
              <Users className={`h-6 w-6 ${
                selectedType === "customer" ? "text-primary" : "text-muted-foreground"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-foreground">Customer Portal</p>
              <p className="text-xs text-muted-foreground mt-1">
                View invoices, track support tickets, and manage your account. Ideal for clients and external partners.
              </p>
            </div>
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleContinue}
            disabled={!selectedType}
            className="w-full flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Sign Up <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
