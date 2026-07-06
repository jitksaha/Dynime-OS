import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Moon, Sun, ArrowRight, Shield, Zap, BarChart3, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useAppInfo } from "@/hooks/useAppInfo";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useSocialProviders } from "@/hooks/useSocialProviders";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";
import { checkRateLimit, recordLoginAttempt, isValidEmail } from "@/lib/security-utils";

const PROVIDER_ICONS: Record<string, { icon: React.ReactNode; bg: string }> = {
  google: {
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>,
    bg: "bg-white dark:bg-zinc-800 border border-border hover:bg-muted/60",
  },
  apple: {
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>,
    bg: "bg-black text-white hover:bg-zinc-900",
  },
};


const features = [
{ icon: Zap, text: "Automate your entire workflow" },
{ icon: Shield, text: "Enterprise-grade security" },
{ icon: BarChart3, text: "Real-time analytics & insights" }];


export default function Login() {
  const { appInfo } = useAppInfo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { providers: socialProviders, loading: socialLoading, initiateOAuth } = useSocialProviders();
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user || !profile) return;
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;

    const redirect = async () => {
      try {
        const { data: roleData } = await supabase.
        from("user_roles").
        select("role").
        eq("user_id", user.id).
        maybeSingle();

        const role = roleData?.role;
        if (role === "employee") {
          navigate("/portal/employee", { replace: true });
        } else if (role === "customer") {
          navigate("/portal/customer", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        isRedirectingRef.current = false;
      }
    };

    redirect();
  }, [user, profile, authLoading]);

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
    const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    setLoading(false);

    if (error) {
      recordLoginAttempt(trimmedEmail, false);
      const remaining = checkRateLimit(trimmedEmail);
      if (remaining.remainingAttempts > 0 && remaining.remainingAttempts <= 2) {
        toast.error(`Invalid credentials. ${remaining.remainingAttempts} attempt(s) remaining before lockout.`);
      } else if (remaining.remainingAttempts === 0) {
        setLockoutSeconds(remaining.lockoutSecondsLeft);
        toast.error(`Account temporarily locked. Try again in ${Math.ceil(remaining.lockoutSecondsLeft / 60)} minute(s).`);
      } else {
        toast.error("Invalid email or password");
      }
    } else {
      recordLoginAttempt(trimmedEmail, true);
      toast.success("Welcome back!");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-gradient-to-br from-[hsl(243,75%,58%)] via-[hsl(260,70%,55%)] to-[hsl(280,65%,50%)]">
        <div className="absolute inset-0">
          <div className="absolute top-[10%] left-[10%] w-72 h-72 rounded-full bg-white/[0.06] blur-sm" />
          <div className="absolute bottom-[15%] right-[5%] w-96 h-96 rounded-full bg-white/[0.04] blur-sm" />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/[0.08]" />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-white/[0.06]" />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-white/[0.04]" />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3">
            
            <span className="font-extrabold font-brand text-white text-4xl">{appInfo.app_name}</span>
          </Link>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}>
              
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                Welcome back to
                <br />
                your workspace
              </h2>
              <p className="mt-4 text-base text-white/70 max-w-md leading-relaxed">
                Pick up right where you left off. Your team, tools, and data are waiting.
              </p>
            </motion.div>

            <div className="space-y-4">
              {features.map((feat, i) =>
              <motion.div
                key={feat.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3">
                
                  <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <feat.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm text-white/80 font-medium">{feat.text}</span>
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-rose-400"].map((bg, i) =>
              <div key={i} className={`h-8 w-8 rounded-full ${bg} border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white`}>
                  {["A", "B", "C", "D"][i]}
                </div>
              )}
            </div>
            <p className="text-sm text-white/60">
              <span className="text-white font-semibold">2,400+</span> teams trust {appInfo.app_name}
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 sm:px-10 py-5">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            
            <span className="text-lg font-extrabold font-brand text-foreground">{appInfo.app_name}</span>
          </Link>
          <div className="lg:ml-auto" />
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            title="Toggle theme">
            
            {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[400px]">
            
            <div className="mb-8">
              <h1 className="text-[26px] font-bold text-foreground tracking-tight text-center">Sign in to your account</h1>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-semibold">Sign up free</Link>
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 border-none">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    required />
                  
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-11 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    required />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                    
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {lockoutSeconds > 0 &&
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">
                    Account temporarily locked. Try again in <span className="font-bold">{Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')}</span>
                  </p>
                </div>
              }

              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className="group w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20">
                
                {loading ?
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

                <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                }
              </button>
            </form>

            {socialProviders.length > 0 && (
              <>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground/60 font-medium">OR CONTINUE WITH</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {socialProviders.map((provider) => {
                const visual = PROVIDER_ICONS[provider.provider_key];
                if (!visual) return null;
                return (
                  <button
                    key={provider.provider_key}
                    type="button"
                    onClick={async () => {
                      try {
                        await initiateOAuth(provider.provider_key);
                      } catch (err: any) {
                        toast.error(err?.message || "OAuth sign-in failed");
                      }
                    }}
                    className={`flex items-center justify-center gap-3 w-full h-11 rounded-xl text-sm font-medium transition-all ${visual.bg}`}
                  >
                    {visual.icon}
                    <span>Continue with {provider.provider_name}</span>
                  </button>
                );
              })}
              </div>
              </>
            )}

            <div className="mt-8 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground/60 font-medium">TRUSTED BY THOUSANDS</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
              { label: "99.9%", sub: "Uptime" },
              { label: "256-bit", sub: "Encryption" },
              { label: "SOC 2", sub: "Compliant" }].
              map((stat) =>
              <div key={stat.label} className="text-center p-3 rounded-xl bg-muted/40 border border-border/50">
                  <p className="text-sm font-bold text-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>);

}