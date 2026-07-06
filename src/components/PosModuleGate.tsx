import { Navigate, Outlet } from "react-router-dom";
import { usePosConfig } from "@/hooks/usePosConfig";
import { Loader2 } from "lucide-react";

/**
 * Wraps POS routes — if POS hasn't been set up yet, redirects to /pos/setup.
 * If already on /pos/setup and setup is done, redirects to /pos/dashboard.
 */
export function PosModuleGate({ children }: { children?: React.ReactNode }) {
  const { isSetup, loading } = usePosConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSetup) {
    return <Navigate to="/pos/setup" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function PosSetupGate({ children }: { children: React.ReactNode }) {
  const { isSetup, loading } = usePosConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // If already set up, redirect to dashboard
  if (isSetup) {
    return <Navigate to="/pos/dashboard" replace />;
  }

  return <>{children}</>;
}
