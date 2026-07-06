import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  extractTokenHashFromActionLink,
  resolvePostAuthPath,
  stabilizeAuthSession,
} from "@/lib/oauth-redirect";

export default function SocialOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
      toast.error(errorParam);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // Backward-compat route: forward modern OAuth callback params.
    if (code && state) {
      const forwardedParams = new URLSearchParams(searchParams);
      navigate(`/auth/oauth-callback?${forwardedParams.toString()}`, { replace: true });
      return;
    }

    const actionLink = searchParams.get("action_link");
    if (actionLink) {
      void handleActionLink(actionLink);
      return;
    }

    setError("Invalid callback parameters");
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  }, [navigate, searchParams]);

  const handleActionLink = async (actionLink: string) => {
    try {
      const { tokenHash, type } = extractTokenHashFromActionLink(actionLink);

      if (!tokenHash) {
        throw new Error("Missing authentication token");
      }

      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });

      if (verifyError || !authData?.session) {
        throw new Error(verifyError?.message || "Session verification failed");
      }

      await stabilizeAuthSession(authData.session);
      const path = await resolvePostAuthPath(authData.session.user.id);

      toast.success("Welcome back!");
      navigate(path, { replace: true });
    } catch (err: any) {
      console.error("Callback error:", err);
      setError(err.message || "Authentication failed");
      toast.error(err.message || "Authentication failed");
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Completing sign-in...</p>
          </>
        )}
      </div>
    </div>
  );
}
