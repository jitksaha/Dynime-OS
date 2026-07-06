import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { AuthLoader } from "@/components/PageLoader";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "super_admin",
      });
      setIsSuperAdmin(!!data);
      setChecking(false);
    };
    check();
  }, [user, loading]);

  if (loading || checking) {
    return <AuthLoader />;
  }

  if (!user) {
    return <Navigate to="/superadmin" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
