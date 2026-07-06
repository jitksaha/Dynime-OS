import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Mail, Lock, Terminal, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useAppInfo } from "@/hooks/useAppInfo";
import { toast } from "sonner";
import { checkRateLimit, recordLoginAttempt, isValidEmail } from "@/lib/security-utils";

export default function SuperAdminLogin() {
  const { appInfo } = useAppInfo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      // Check if user is super admin, then redirect
      const checkAdmin = async () => {
        const { data } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "super_admin",
        });
        if (data) {
          navigate("/superadmin/dashboard", { replace: true });
        } else {
          toast.error("Access denied. Super Admin privileges required.");
          await supabase.auth.signOut();
        }
      };
      checkAdmin();
    }
  }, [user, authLoading, navigate]);

  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => setLockoutSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password.trim()) return;

    if (!isValidEmail(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const rateCheck = checkRateLimit(trimmedEmail);
    if (!rateCheck.allowed) {
      setLockoutSeconds(rateCheck.lockoutSecondsLeft);
      toast.error(`Too many failed attempts. Try again in ${Math.ceil(rateCheck.lockoutSecondsLeft / 60)} minute(s).`);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);
    if (error) {
      recordLoginAttempt(trimmedEmail, false);
      const remaining = checkRateLimit(trimmedEmail);
      if (remaining.remainingAttempts <= 2 && remaining.remainingAttempts > 0) {
        toast.error(`Invalid credentials. ${remaining.remainingAttempts} attempt(s) remaining.`);
      } else if (remaining.remainingAttempts === 0) {
        setLockoutSeconds(remaining.lockoutSecondsLeft);
        toast.error("Account temporarily locked.");
      } else {
        toast.error("Invalid credentials");
      }
    } else {
      recordLoginAttempt(trimmedEmail, true);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }} />
        
        {/* Accent glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-600/8 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <span className="text-lg font-bold text-white block leading-tight">{appInfo.app_name}</span>
              <span className="text-[10px] font-mono tracking-[0.2em] text-red-400 uppercase">Super Admin</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-red-400/60 font-mono text-xs">
              <Terminal className="h-3.5 w-3.5" />
              <span>SYSTEM CONTROL PANEL</span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Administrative<br />
              <span className="text-red-400">Command Center</span>
            </h2>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              Centralized platform management for tenant operations, 
              security configurations, billing oversight, and system monitoring.
            </p>
            
            {/* Status indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-500 font-mono">SYSTEMS ONLINE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs text-gray-500 font-mono">SECURED</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 font-mono">
            © {new Date().getFullYear()} {appInfo.app_name} · Authorized Personnel Only
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-extrabold font-brand text-foreground">{appInfo.app_name}</h1>
            <p className="text-[10px] font-mono tracking-[0.2em] text-destructive uppercase mt-1">Super Admin</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Admin Sign In</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials to access the control panel
            </p>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/10 mb-6">
            <Shield className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This is a restricted area. All login attempts are monitored and logged for security purposes.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dynime.com"
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {lockoutSeconds > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">
                  Locked. Try again in <span className="font-bold">{Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')}</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="w-full h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Access Control Panel"
              )}
            </button>
          </form>

          <div className="text-center mt-8 space-y-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to main site
            </a>
            <p className="text-xs text-muted-foreground/60 font-mono">
              RESTRICTED ACCESS · AUTHORIZED PERSONNEL ONLY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
