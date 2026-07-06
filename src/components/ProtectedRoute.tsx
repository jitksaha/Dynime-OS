import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoader } from "@/components/PageLoader";
import { useState, useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [profileTimeout, setProfileTimeout] = useState(false);

  // Safety: don't wait forever for profile
  useEffect(() => {
    if (!loading && user && !profile) {
      const timer = setTimeout(() => setProfileTimeout(true), 4000);
      return () => clearTimeout(timer);
    }
    if (profile) setProfileTimeout(false);
  }, [loading, user, profile]);

  if (loading) {
    return <AuthLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for profile but not forever
  if (!profile && !profileTimeout) {
    return <AuthLoader />;
  }

  const accountType = user.user_metadata?.account_type;
  const isJoinPage = location.pathname === "/join-company";
  const isOnboarding = location.pathname === "/onboarding";

  // Employee without tenant → redirect to join-company
  if (profile && !profile.tenant_id && accountType === "employee" && !isJoinPage) {
    return <Navigate to="/join-company" replace />;
  }

  // Company without onboarding → redirect to onboarding
  if (profile && !profile.onboarding_completed && accountType !== "employee" && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
