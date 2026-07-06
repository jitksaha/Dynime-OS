import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/db";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { full_name: string | null; tenant_id: string | null; onboarding_completed: boolean; department: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const profileFetchRef = useRef<string | null>(null);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = async (userId: string, force = false) => {
    if (!force && profileFetchRef.current === userId) return;
    profileFetchRef.current = userId;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, tenant_id, onboarding_completed, department")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("Profile fetch error:", error.message);
        profileFetchRef.current = null;
        return;
      }
      setProfile(data);
    } catch (err) {
      console.error("Profile fetch exception:", err);
      profileFetchRef.current = null;
    }
  };

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    profileFetchRef.current = null;
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;

        // Cancel any pending sign-out when we get a new session event
        if (signOutTimerRef.current) {
          clearTimeout(signOutTimerRef.current);
          signOutTimerRef.current = null;
        }

        if (event === 'SIGNED_OUT') {
          signOutTimerRef.current = setTimeout(async () => {
            if (!isMounted) return;
            try {
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              if (!currentSession && isMounted) {
                clearAuthState();
              }
            } catch {
              if (isMounted) clearAuthState();
            }
          }, 300);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            setTimeout(() => {
              if (isMounted) fetchProfile(newSession.user.id);
            }, 0);
          }
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } finally {
        if (isMounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Safety: never leave loading=true for more than 8s
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      if (signOutTimerRef.current) {
        clearTimeout(signOutTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    profileFetchRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
