import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function JoinCompany() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    // If already has a tenant, go to portal
    if (profile?.tenant_id && profile?.onboarding_completed) {
      navigate("/portal/employee", { replace: true });
      return;
    }
    setChecking(false);
  }, [user, profile, authLoading, navigate]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_company_with_code", {
        _code: code.trim().toUpperCase(),
      });

      if (error) throw error;

      toast.success("Successfully joined the company!");
      navigate("/portal/employee", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to join company");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Your Company</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the invite code provided by your company administrator to join their workspace.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123XY"
              className="w-full h-12 px-4 rounded-xl border border-input bg-card text-center text-lg font-mono tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring uppercase"
              required
              maxLength={12}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Join Company
              </>
            )}
          </button>
        </form>

        <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">Don't have a code?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask your company administrator to generate an invite code from their Company Admin panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
