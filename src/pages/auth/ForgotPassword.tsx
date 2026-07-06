import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Moon, Sun } from "lucide-react";
import dynimeLogo from "@/assets/dynime-logo.png";
import { supabase } from "@/integrations/supabase/db";
import { useTheme } from "@/hooks/use-theme";
import { useAppInfo } from "@/hooks/useAppInfo";
import { toast } from "sonner";

export default function ForgotPassword() {
  const { appInfo } = useAppInfo();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-auth-email", {
        body: {
          email: email.trim(),
          action: "recovery",
          redirect_to: `${window.location.origin}/dashboard`,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        toast.error(data.error);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset email. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={appInfo.logo_url || dynimeLogo} alt={appInfo.app_name} className="h-7 w-auto object-contain rounded" />
          <span className="text-lg font-extrabold font-brand text-foreground">{appInfo.app_name}</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Toggle theme"
        >
          {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[340px]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sent ? "Check your email for the reset link" : "Enter your email to receive a reset link"}
            </p>
          </div>

          <div className="border border-border rounded-lg bg-card p-6">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
