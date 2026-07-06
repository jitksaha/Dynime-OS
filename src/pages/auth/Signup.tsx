import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Briefcase, Users, Moon, Sun, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynimeLogo from "@/assets/dynime-logo.png";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useSocialProviders } from "@/hooks/useSocialProviders";
import { useTheme } from "@/hooks/use-theme";
import { useAppInfo } from "@/hooks/useAppInfo";
import { toast } from "sonner";
import { evaluatePasswordStrength, isValidEmail, sanitizeInput } from "@/lib/security-utils";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
type AccountType = "company" | "employee" | null;

const PROVIDER_ICONS: Record<string, { icon: React.ReactNode; bg: string }> = {
  google: {
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
    bg: "bg-white dark:bg-zinc-800 border border-border hover:bg-muted/60",
  },
  apple: {
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>,
    bg: "bg-black text-white hover:bg-zinc-900",
  },
};

const benefits = [
"14-day free trial, no credit card needed",
"All modules included — HRMS, CRM, Accounting & more",
"Invite unlimited team members",
"Cancel anytime, no commitments"];


export default function Signup() {
  const { appInfo } = useAppInfo();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { providers: socialProviders, initiateOAuth } = useSocialProviders();

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeInput(fullName);
    const cleanEmail = email.trim().toLowerCase();
    if (!accountType || !cleanName || !cleanEmail || !password.trim()) return;

    // Validate email
    if (!isValidEmail(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate name length
    if (cleanName.length < 2 || cleanName.length > 100) {
      toast.error("Name must be between 2 and 100 characters");
      return;
    }

    // Enforce strong password
    const strength = evaluatePasswordStrength(password);
    if (strength.score < 2) {
      toast.error("Please choose a stronger password. " + strength.suggestions[0]);
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      // Use custom auth email edge function to send branded verification email
      const { data, error: fnError } = await supabase.functions.invoke("send-auth-email", {
        body: {
          email: cleanEmail,
          password,
          full_name: cleanName,
          account_type: accountType,
          action: "signup",
          redirect_to: window.location.origin
        }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Account created! Please check your email to verify.");
        if (accountType === "company") {
          navigate("/onboarding");
        } else {
          navigate("/join-company");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Signup failed. Please try again.");
    }
    setLoading(false);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-gradient-to-br from-[hsl(270,65%,50%)] via-[hsl(255,70%,52%)] to-[hsl(243,75%,58%)]">
        {/* Abstract pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-[15%] right-[10%] w-64 h-64 rounded-full bg-white/[0.05] blur-sm" />
          <div className="absolute bottom-[10%] left-[10%] w-80 h-80 rounded-full bg-white/[0.04] blur-sm" />
          {/* Floating cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="absolute top-[18%] right-[8%] w-52 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-4">
            
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-full bg-emerald-400/80 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs text-white/80 font-medium">Team Created</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[85%] rounded-full bg-emerald-400/60" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="absolute bottom-[22%] left-[8%] w-56 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-4">
            
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-sky-400/80 flex items-center justify-center text-[10px] font-bold text-white">
                12
              </div>
              <span className="text-xs text-white/80 font-medium">Active modules</span>
            </div>
            <div className="flex gap-1.5">
              {["HRMS", "CRM", "Fin"].map((m) =>
              <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-medium">{m}</span>
              )}
            </div>
          </motion.div>
          {/* Grid dots */}
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3">
            
            <span className="text-xl font-extrabold font-brand text-white">{appInfo.app_name}</span>
          </Link>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}>
              
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                Start building your
                <br />
                business today
              </h2>
              <p className="mt-4 text-base text-white/70 max-w-md leading-relaxed">
                Join thousands of companies using {appInfo.app_name} to streamline operations and scale faster.
              </p>
            </motion.div>

            <div className="space-y-3">
              {benefits.map((benefit, i) =>
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-3">
                
                  <div className="h-5 w-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-white/90" />
                  </div>
                  <span className="text-sm text-white/80">{benefit}</span>
                </motion.div>
              )}
            </div>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} {appInfo.app_name}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-10 py-5">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <img src={appInfo.logo_url || dynimeLogo} alt={appInfo.app_name} className="h-8 w-auto object-contain rounded-lg" />
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

        {/* Form center */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[420px]">
            
            <div className="mb-7">
              <h1 className="text-[26px] font-bold text-foreground tracking-tight">Create your account</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
              </p>
            </div>

            {/* Social Sign-up buttons - shown before account type */}
            {socialProviders.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-3">
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
                            toast.error(err?.message || "OAuth sign-up failed");
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
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground/60 font-medium">OR SIGN UP WITH EMAIL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
            )}

            {/* Account Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">I want to</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("company")}
                  className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  accountType === "company" ?
                  "border-primary bg-primary/[0.06] shadow-sm shadow-primary/10" :
                  "border-border hover:border-primary/30 hover:bg-muted/30"}`
                  }>
                  
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  accountType === "company" ? "bg-primary/15" : "bg-muted/60"}`
                  }>
                    <Briefcase className={`h-5 w-5 transition-colors ${accountType === "company" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold transition-colors ${accountType === "company" ? "text-primary" : "text-foreground"}`}>Create company</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Set up a new workspace</p>
                  </div>
                  {accountType === "company" &&
                  <motion.div
                    layoutId="accountCheck"
                    className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    </motion.div>
                  }
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType("employee")}
                  className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  accountType === "employee" ?
                  "border-primary bg-primary/[0.06] shadow-sm shadow-primary/10" :
                  "border-border hover:border-primary/30 hover:bg-muted/30"}`
                  }>
                  
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  accountType === "employee" ? "bg-primary/15" : "bg-muted/60"}`
                  }>
                    <Users className={`h-5 w-5 transition-colors ${accountType === "employee" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold transition-colors ${accountType === "employee" ? "text-primary" : "text-foreground"}`}>Join company</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Use an invite code</p>
                  </div>
                  {accountType === "employee" &&
                  <motion.div
                    layoutId="accountCheck"
                    className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    </motion.div>
                  }
                </button>
              </div>
            </div>

            <AnimatePresence>
              {accountType &&
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignup}
                className="space-y-4 overflow-hidden">
                
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                      <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full h-11 pl-11 pr-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      required />
                    
                    </div>
                  </div>

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
                    <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                      <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full h-11 pl-11 pr-11 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      required
                      minLength={8} />
                    
                      <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                      
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                    <PasswordStrengthMeter password={password} />
                  </div>

                  <button
                  type="submit"
                  disabled={loading}
                  className="group w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20">
                  
                    {loading ?
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

                  <>
                        Create account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                  }
                  </button>

                  <p className="text-center text-[11px] text-muted-foreground pt-1">
                    By creating an account, you agree to our{" "}
                    <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </motion.form>
              }
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>);

}