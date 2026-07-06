import { useState, useEffect, Suspense, lazy } from "react";
const TwoFactorAuthLazy = lazy(() => import("./settings/TwoFactorAuth"));
const SavedPaymentMethodsLazy = lazy(() => import("./SavedPaymentMethods"));
import { useLocation } from "react-router-dom";
import { Building2, Shield, Bell, CreditCard, Globe, Palette, ChevronRight, ArrowLeft, Save, Eye, EyeOff, UserCircle, Moon, Sun, Lock, History, Monitor, Smartphone, Mail, MessageSquare, CheckCircle2, XCircle, Loader2, Pencil, AlertCircle, Trash2, AlertTriangle, Clock, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/db";
import { ColorThemePicker } from "@/components/ColorThemePicker";

interface SettingsSection {
  icon: React.ElementType;
  label: string;
  description: string;
  key: string;
  superAdminOnly?: boolean;
}

const settingsSections: SettingsSection[] = [
  { icon: UserCircle, label: "My Profile", description: "Update your name, avatar, and contact info", key: "profile" },
  { icon: Building2, label: "Company", description: "Organization name, logo, and details", key: "company" },
  { icon: Palette, label: "Appearance", description: "Theme, branding, and display settings", key: "appearance" },
  { icon: Shield, label: "Security", description: "Password, 2FA, login history, and security", key: "security" },
  { icon: Link2, label: "Connected Accounts", description: "Link or unlink Google, Apple sign-in methods", key: "connected-accounts" },
  { icon: CreditCard, label: "Payment Methods", description: "Saved cards, wallets, and default payment", key: "payment-methods" },
  { icon: Bell, label: "Notifications", description: "Email, in-app, and notification preferences", key: "notifications" },
  { icon: Globe, label: "Integrations", description: "Connect Gmail, Slack, WhatsApp, and more", key: "integrations" },
];

/* ======================== PROFILE ======================== */
function ProfileSettings() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Email change state
  const [emailStep, setEmailStep] = useState<"view" | "input" | "otp">("view");
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Phone OTP state
  const [phoneStep, setPhoneStep] = useState<"view" | "otp">("view");
  const [otpCode, setOtpCode] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [verifyingPhone, setVerifyingPhone] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone, job_title, department, phone_verified").eq("user_id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setJobTitle(data.job_title || "");
        setDepartment(data.department || "");
        setPhoneVerified(!!data.phone_verified);
      }
    };
    load();
  }, [user]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, job_title: jobTitle }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Failed to update profile"); return; }
    toast.success("Profile updated successfully");
    // If phone changed, reset verification
    if (verifyingPhone && phone !== verifyingPhone) {
      setPhoneVerified(false);
      await supabase.from("profiles").update({ phone_verified: false, phone_verified_at: null }).eq("user_id", user.id);
    }
  };

  const handleEmailChangeRequest = async () => {
    if (!newEmail || !newEmail.includes("@")) { toast.error("Please enter a valid email address"); return; }
    if (newEmail === user?.email) { toast.error("New email is the same as current email"); return; }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailLoading(false);
    if (error) { toast.error(error.message); } else {
      setEmailStep("otp");
      toast.success("Verification email sent! Check both your current and new email inbox.");
    }
  };

  const cancelEmailChange = () => { setEmailStep("view"); setNewEmail(""); };

  // Phone verification
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) { toast.error("Please enter a valid phone number first"); return; }
    // Save phone first
    if (user) await supabase.from("profiles").update({ phone }).eq("user_id", user.id);
    setPhoneLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-verify", {
        body: { action: "send_otp", phone },
      });
      if (error) throw error;
      if (data?.success) {
        setPhoneStep("otp");
        setOtpSent(true);
        setOtpCountdown(60);
        setVerifyingPhone(phone);
        toast.success("Verification code sent to " + phone);
      } else {
        toast.error(data?.error || "Failed to send OTP");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send verification code");
    }
    setPhoneLoading(false);
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otpCode || otpCode.length < 6) { toast.error("Please enter the 6-digit code"); return; }
    setPhoneLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-verify", {
        body: { action: "verify_otp", phone: verifyingPhone || phone, otp_code: otpCode },
      });
      if (error) throw error;
      if (data?.success) {
        setPhoneVerified(true);
        setPhoneStep("view");
        setOtpCode("");
        toast.success("Phone number verified! ✅");
      } else {
        toast.error(data?.error || "Invalid verification code");
      }
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
    }
    setPhoneLoading(false);
  };

  const cancelPhoneVerification = () => {
    setPhoneStep("view");
    setOtpCode("");
    setOtpSent(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCircle className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{fullName || "User"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>
      <InputField label="Full Name" value={fullName} onChange={setFullName} />

      {/* Email change section */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
        {emailStep === "view" && (
          <div className="flex items-center gap-2">
            <input type="email" value={user?.email || ""} disabled className="w-full h-10 rounded-lg border border-input px-3 text-sm bg-muted/30 text-muted-foreground cursor-not-allowed" />
            <button onClick={() => setEmailStep("input")} className="shrink-0 h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Change
            </button>
          </div>
        )}
        {emailStep === "input" && (
          <div className="space-y-2">
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email address" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
            <div className="flex items-center gap-2">
              <button onClick={handleEmailChangeRequest} disabled={emailLoading || !newEmail} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send Verification
              </button>
              <button onClick={cancelEmailChange} className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors">Cancel</button>
            </div>
          </div>
        )}
        {emailStep === "otp" && (
          <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5"><Mail className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">Verification email sent</p>
                <p className="text-xs text-muted-foreground mt-1">We've sent confirmation links to both <strong>{user?.email}</strong> and <strong>{newEmail}</strong>. Please click the link in both emails to complete the change.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleEmailChangeRequest} disabled={emailLoading} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                {emailLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Resend verification
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button onClick={cancelEmailChange} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Phone with OTP verification */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
        {phoneStep === "view" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneVerified && e.target.value !== verifyingPhone) setPhoneVerified(false);
                }}
                placeholder="+880 1XXX-XXXXXX"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {phoneVerified ? (
                <span className="shrink-0 flex items-center gap-1 px-3 h-10 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <button
                  onClick={handleSendPhoneOtp}
                  disabled={phoneLoading || !phone || phone.length < 10}
                  className="shrink-0 h-10 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                >
                  {phoneLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
                  Verify
                </button>
              )}
            </div>
            {!phoneVerified && phone && phone.length >= 10 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Phone not verified. Click Verify to receive an OTP.
              </p>
            )}
          </div>
        )}
        {phoneStep === "otp" && (
          <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5"><Smartphone className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">Enter verification code</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We sent a 6-digit code to <strong>{verifyingPhone || phone}</strong>. It's valid for 5 minutes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                onClick={handleVerifyPhoneOtp}
                disabled={phoneLoading || otpCode.length < 6}
                className="shrink-0 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
              >
                {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Verify
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendPhoneOtp}
                disabled={phoneLoading || otpCountdown > 0}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {phoneLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend code"}
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button onClick={cancelPhoneVerification} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <InputField label="Job Title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Product Manager" />
      <InputField label="Department" value={department} disabled hint="Department is managed by your company admin" />
      <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}

/* ======================== APPEARANCE ======================== */
function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("b360-font-size") || "medium");
  const [sidebarCompact, setSidebarCompact] = useState(() => localStorage.getItem("b360-sidebar-compact") === "true");

  // Theme schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [darkStart, setDarkStart] = useState("18:00");
  const [darkEnd, setDarkEnd] = useState("06:00");
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase.from("user_preferences").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setScheduleEnabled((data as any).theme_schedule_enabled || false);
        setDarkStart((data as any).theme_dark_start || "18:00");
        setDarkEnd((data as any).theme_dark_end || "06:00");
      }
    });
  }, [user?.id]);

  const saveSchedule = async (enabled: boolean, start: string, end: string) => {
    setScheduleEnabled(enabled);
    setDarkStart(start);
    setDarkEnd(end);
    if (!user) return;
    await supabase.from("user_preferences").upsert({
      user_id: user.id,
      theme_schedule_enabled: enabled,
      theme_dark_start: start,
      theme_dark_end: end,
    } as any, { onConflict: "user_id" });
    toast.success("Schedule updated");
  };

  const saveFontSize = (size: string) => {
    setFontSize(size);
    localStorage.setItem("b360-font-size", size);
    document.documentElement.style.fontSize = size === "small" ? "14px" : size === "large" ? "18px" : "16px";
    toast.success("Font size updated");
  };

  const toggleSidebar = () => {
    const next = !sidebarCompact;
    setSidebarCompact(next);
    localStorage.setItem("b360-sidebar-compact", String(next));
    toast.success(next ? "Compact sidebar enabled" : "Compact sidebar disabled");
  };

  return (
    <div className="space-y-6">
      {/* Color Theme */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Color Theme</h3>
        <p className="text-xs text-muted-foreground">Choose a color theme for your workspace</p>
        <ColorThemePicker onSelect={() => toast.success("Theme applied!")} />
      </div>

      {/* Light/Dark Mode */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => theme !== "light" && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}>
            <Sun className="h-5 w-5 text-warning" />
            <div className="text-left"><p className="text-sm font-medium text-foreground">Light</p><p className="text-xs text-muted-foreground">Bright and clean</p></div>
          </button>
          <button onClick={() => theme !== "dark" && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}>
            <Moon className="h-5 w-5 text-primary" />
            <div className="text-left"><p className="text-sm font-medium text-foreground">Dark</p><p className="text-xs text-muted-foreground">Easy on the eyes</p></div>
          </button>
        </div>
      </div>

      {/* Dark/Light Mode Schedule */}
      <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Auto Dark Mode Schedule
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically switch between light and dark mode based on time of day</p>
          </div>
          <ToggleSwitch enabled={scheduleEnabled} onToggle={() => saveSchedule(!scheduleEnabled, darkStart, darkEnd)} />
        </div>
        {scheduleEnabled && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dark mode starts</label>
              <input
                type="time"
                value={darkStart}
                onChange={(e) => saveSchedule(scheduleEnabled, e.target.value, darkEnd)}
                className="w-full mt-1 h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dark mode ends</label>
              <input
                type="time"
                value={darkEnd}
                onChange={(e) => saveSchedule(scheduleEnabled, darkStart, e.target.value)}
                className="w-full mt-1 h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {/* Font Size */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Font Size</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["small", "medium", "large"] as const).map((size) => (
            <button key={size} onClick={() => saveFontSize(size)} className={`py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium capitalize ${fontSize === size ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/20"}`}>
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div>
          <p className="text-sm font-medium text-foreground">Compact Sidebar</p>
          <p className="text-xs text-muted-foreground">Use icons-only sidebar for more space</p>
        </div>
        <ToggleSwitch enabled={sidebarCompact} onToggle={toggleSidebar} />
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div>
          <p className="text-sm font-medium text-foreground">Keyboard Shortcuts</p>
          <p className="text-xs text-muted-foreground">Press Ctrl+/ to view all shortcuts</p>
        </div>
        <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs font-medium text-muted-foreground">Ctrl + /</kbd>
      </div>
    </div>
  );
}

/* ======================== SECURITY ======================== */
function SecuritySettings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [historyRes, sessionsRes] = await Promise.all([
        supabase.from("login_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("active_sessions").select("*").eq("user_id", user.id).eq("is_active", true).order("last_active", { ascending: false }),
      ]);
      if (historyRes.data) setLoginHistory(historyRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      setLoadingHistory(false);
      setLoadingSessions(false);
    };
    load();
  }, [user]);

  const handlePasswordChange = async () => {
    if (!currentPassword) { toast.error("Please enter your current password"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword === currentPassword) { toast.error("New password must be different from current password"); return; }
    setChanging(true);
    // Verify current password first
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    });
    if (verifyError) {
      toast.error("Current password is incorrect");
      setChanging(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChanging(false);
    if (error) { toast.error(error.message); } else {
      toast.success("Password updated successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    }
  };

  const terminateSession = async (sessionId: string) => {
    await supabase.from("active_sessions").update({ is_active: false }).eq("id", sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session terminated");
  };

  const terminateAllOther = async () => {
    if (!user) return;
    // Keep the most recent session, terminate the rest
    const otherIds = sessions.slice(1).map((s) => s.id);
    if (otherIds.length === 0) { toast.info("No other sessions to terminate"); return; }
    await supabase.from("active_sessions").update({ is_active: false }).in("id", otherIds);
    setSessions((prev) => prev.slice(0, 1));
    toast.success(`Terminated ${otherIds.length} session(s)`);
  };

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Change Password</h3>
        <InputField label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Enter current password" />
        <InputField label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="Enter new password (min 8 chars)" />
        <InputField label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" />
        {newPassword && (
          <div className="text-xs space-y-1">
            <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {newPassword.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} At least 8 characters
            </div>
            <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "text-emerald-600" : "text-muted-foreground"}`}>
              {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} Upper & lowercase letters
            </div>
            <div className={`flex items-center gap-1.5 ${/\d/.test(newPassword) ? "text-emerald-600" : "text-muted-foreground"}`}>
              {/\d/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} Contains a number
            </div>
            <div className={`flex items-center gap-1.5 ${/[!@#$%^&*]/.test(newPassword) ? "text-emerald-600" : "text-muted-foreground"}`}>
              {/[!@#$%^&*]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} Contains a special character
            </div>
          </div>
        )}
        <button onClick={handlePasswordChange} disabled={changing || !newPassword || !currentPassword} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
          {changing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update Password
        </button>
      </div>

      {/* Active Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> Active Sessions</h3>
          {sessions.length > 1 && (
            <button onClick={terminateAllOther} className="text-xs text-destructive font-medium hover:underline">
              Terminate all other
            </button>
          )}
        </div>
        {loadingSessions ? (
          <div className="flex justify-center py-6"><div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active sessions tracked</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, idx) => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-success/10">
                    {session.device_info?.includes("Mobile") ? <Smartphone className="h-3.5 w-3.5 text-success" /> : <Monitor className="h-3.5 w-3.5 text-success" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground flex items-center gap-2">
                      {session.device_info || "Unknown Device"}
                      {idx === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Current</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{session.ip_address || "Unknown IP"} · Last active: {new Date(session.last_active).toLocaleString()}</p>
                  </div>
                </div>
                {idx > 0 && (
                  <button onClick={() => terminateSession(session.id)} className="text-[10px] px-2 py-1 rounded bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors">
                    Terminate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Recent Login Activity</h3>
        {loadingHistory ? (
          <div className="flex justify-center py-6"><div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : loginHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No login history available</p>
        ) : (
          <div className="space-y-2">
            {loginHistory.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${entry.status === "success" ? "bg-success/10" : "bg-destructive/10"}`}>
                    {entry.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{entry.status === "success" ? "Successful login" : "Failed attempt"}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.ip_address || "Unknown IP"} · {entry.user_agent?.substring(0, 50) || "Unknown device"}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(entry.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Two-Factor Authentication */}
      <div className="border-t border-border pt-6">
        <Suspense fallback={<div className="py-8 flex justify-center"><div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <TwoFactorAuthLazy />
        </Suspense>
      </div>
    </div>
  );
}

/* ======================== NOTIFICATIONS ======================== */
function NotificationSettings() {
  const [prefs, setPrefs] = useState([
    { key: "email", label: "Email notifications", desc: "Receive updates via email", icon: Mail, enabled: true },
    { key: "inapp", label: "In-app notifications", desc: "Show notifications in the app", icon: Bell, enabled: true },
    { key: "desktop", label: "Desktop notifications", desc: "Browser push notifications", icon: Monitor, enabled: false },
    { key: "mobile", label: "Mobile notifications", desc: "Push notifications on mobile", icon: Smartphone, enabled: false },
    { key: "digest", label: "Weekly digest", desc: "Summary email every Monday", icon: MessageSquare, enabled: true },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("b360-notification-prefs");
    if (saved) {
      try {
        const savedPrefs = JSON.parse(saved);
        setPrefs((prev) => prev.map((p) => ({ ...p, enabled: savedPrefs[p.key] ?? p.enabled })));
      } catch {}
    }
  }, []);

  const toggle = (key: string) => {
    setPrefs((prev) => {
      const updated = prev.map((p) => p.key === key ? { ...p, enabled: !p.enabled } : p);
      const map: Record<string, boolean> = {};
      updated.forEach((p) => (map[p.key] = p.enabled));
      localStorage.setItem("b360-notification-prefs", JSON.stringify(map));
      return updated;
    });
    toast.success("Preference updated");
  };

  return (
    <div className="space-y-3">
      {prefs.map((p) => (
        <div key={p.key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><p.icon className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-sm font-medium text-foreground">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          </div>
          <ToggleSwitch enabled={p.enabled} onToggle={() => toggle(p.key)} />
        </div>
      ))}
    </div>
  );
}

/* ======================== INTEGRATIONS ======================== */
import IntegrationSettingsComponent from "@/components/IntegrationSettings";

function IntegrationSettings() {
  return <IntegrationSettingsComponent />;
}

/* ======================== CONNECTED ACCOUNTS ======================== */
function ConnectedAccountsSettings() {
  const { user } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);

  const PROVIDER_VISUALS: Record<string, { name: string; icon: React.ReactNode; bg: string }> = {
    google: {
      name: "Google",
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
      bg: "bg-white dark:bg-zinc-800",
    },
    apple: {
      name: "Apple",
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>,
      bg: "bg-black text-white",
    },
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [linkedRes, providersRes] = await Promise.all([
        supabase.from("social_linked_accounts").select("*").eq("user_id", user.id),
        supabase.from("social_signin_providers").select("provider_key, provider_name, is_enabled").eq("is_enabled", true),
      ]);
      setLinkedAccounts(linkedRes.data || []);
      setAvailableProviders(providersRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleConnect = async (providerKey: string) => {
    setActionLoading(providerKey);
    try {
      const redirectUri = `${window.location.origin}/auth/oauth-callback`;
      const { data, error } = await supabase.functions.invoke("social-oauth-init", {
        body: { provider_key: providerKey, redirect_uri: redirectUri },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message || "Failed to connect");
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (providerKey: string) => {
    setActionLoading(providerKey);
    try {
      const { error } = await supabase
        .from("social_linked_accounts")
        .delete()
        .eq("user_id", user!.id)
        .eq("provider_key", providerKey);
      if (error) throw error;
      setLinkedAccounts((prev) => prev.filter((a) => a.provider_key !== providerKey));
      toast.success(`${PROVIDER_VISUALS[providerKey]?.name || providerKey} disconnected`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const linkedKeys = new Set(linkedAccounts.map((a) => a.provider_key));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect your social accounts to sign in faster. You can also use email and password alongside social sign-in.
      </p>
      {availableProviders.map((provider) => {
        const key = provider.provider_key;
        const visual = PROVIDER_VISUALS[key];
        if (!visual) return null;
        const isLinked = linkedKeys.has(key);
        const linkedAccount = linkedAccounts.find((a) => a.provider_key === key);
        const isLoading = actionLoading === key;

        return (
          <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${visual.bg} border border-border`}>
                {visual.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{visual.name}</p>
                {isLinked && linkedAccount?.provider_email ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Connected as {linkedAccount.provider_email}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            {isLinked ? (
              <button
                onClick={() => handleDisconnect(key)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnect(key)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                Connect
              </button>
            )}
          </div>
        );
      })}
      {availableProviders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No social sign-in providers are currently enabled.</p>
      )}
    </div>
  );
}

/* ======================== COMPANY ======================== */
function CompanySettings() {
  const { user, profile } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const load = async () => {
      const [tenantRes, profileRes] = await Promise.all([
        supabase.from("tenants").select("name, industry, size").eq("id", profile.tenant_id!).maybeSingle(),
        supabase.from("profiles").select("is_owner").eq("user_id", (await supabase.auth.getUser()).data.user?.id || "").maybeSingle(),
      ]);
      if (tenantRes.data) {
        setCompanyName(tenantRes.data.name || "");
        setIndustry(tenantRes.data.industry || "");
        setSize(tenantRes.data.size || "");
      }
      if (profileRes.data) {
        setIsOwner(!!profileRes.data.is_owner);
      }
    };
    load();
  }, [profile?.tenant_id]);

  const handleSave = async () => {
    if (!profile?.tenant_id) return;
    setSaving(true);
    const { error } = await supabase.from("tenants").update({ name: companyName, industry, size }).eq("id", profile.tenant_id);
    setSaving(false);
    if (error) { toast.error("Failed to update company settings"); } else { toast.success("Company settings saved"); }
  };

  const handleDeleteCompany = async () => {
    if (!profile?.tenant_id || deleteConfirm !== companyName) {
      toast.error("Please type the exact company name to confirm");
      return;
    }
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired. Please log in again."); setDeleting(false); return; }

      const { data, error } = await supabase.functions.invoke("company-self-delete", {
        body: { tenant_id: profile.tenant_id, confirmation_text: deleteConfirm },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); setDeleting(false); return; }

      toast.success(data.message || "Company deleted successfully");
      // Redirect to onboarding after a short delay
      setTimeout(() => { window.location.href = "/onboarding"; }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete company");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <InputField label="Company Name" value={companyName} onChange={setCompanyName} />
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Industry</label>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Select</option>
          <option>Technology</option><option>Finance</option><option>Healthcare</option><option>Education</option><option>E-commerce</option><option>Manufacturing</option><option>Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Company Size</label>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Select</option>
          <option>1-10</option><option>11-50</option><option>50-200</option><option>200-500</option><option>500+</option>
        </select>
      </div>
      <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* Danger Zone */}
      {isOwner && (
        <div className="mt-8 pt-6 border-t border-destructive/20">
          <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-destructive">Danger Zone</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Permanently delete this company and all its data. This action cannot be undone. All employees, invoices, deals, documents, and other records will be permanently removed.
                </p>
              </div>
            </div>

            {!showDeleteZone ? (
              <button
                onClick={() => setShowDeleteZone(true)}
                className="px-4 py-2 rounded-lg border-2 border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Delete This Company
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg border border-destructive/20 bg-background">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Are you absolutely sure?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This will permanently delete <strong className="text-destructive">{companyName}</strong> and all associated data. 
                      If you have other companies, you'll be switched to the next one. Otherwise, you'll be redirected to create a new company.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Type <strong className="text-destructive">{companyName}</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={companyName}
                    className="w-full h-10 rounded-lg border border-destructive/30 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteCompany}
                    disabled={deleting || deleteConfirm !== companyName}
                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? "Deleting..." : "Permanently Delete Company"}
                  </button>
                  <button
                    onClick={() => { setShowDeleteZone(false); setDeleteConfirm(""); }}
                    className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================== BILLING ======================== */
function BillingSettings() {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="space-y-6">
      <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
        <h3 className="text-sm font-semibold text-foreground mb-1">Current Plan: Professional</h3>
        <p className="text-xs text-muted-foreground">Subscription active · Next billing: Mar 1, 2026</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Payment Gateway — SSLCommerz</h3>
        <div className="space-y-3">
          <InputField label="Store ID" value="dynime_live" />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Store Password</label>
            <div className="relative">
              <input type={showKey ? "text" : "password"} defaultValue="demo_password_123" className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <button onClick={() => toast.success("Payment settings saved")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
        <Save className="h-4 w-4" /> Save Settings
      </button>
    </div>
  );
}

/* ======================== HELPERS ======================== */
function InputField({ label, value, onChange, placeholder, disabled, hint, type = "text" }: {
  label: string; value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full h-10 rounded-lg border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${disabled ? "bg-muted/30 text-muted-foreground cursor-not-allowed" : "bg-background text-foreground"}`}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

/* ======================== MAIN ======================== */
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { section?: string } | null;
    if (state?.section) setActiveSection(state.section);
  }, [location.state]);

  const visibleSections = settingsSections;

  const renderContent = () => {
    switch (activeSection) {
      case "profile": return <ProfileSettings />;
      case "company": return <CompanySettings />;
      case "notifications": return <NotificationSettings />;
      case "security": return <SecuritySettings />;
      case "connected-accounts": return <ConnectedAccountsSettings />;
      case "integrations": return <IntegrationSettings />;
      case "appearance": return <AppearanceSettings />;
      case "payment-methods": return (
        <Suspense fallback={<div className="py-8 flex justify-center"><div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <SavedPaymentMethodsLazy />
        </Suspense>
      );
      default: return null;
    }
  };

  const activeLabel = settingsSections.find((s) => s.key === activeSection)?.label;

  if (activeSection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </button>
        <div><h1 className="text-2xl font-bold text-foreground">{activeLabel}</h1></div>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your workspace configuration</p>
      </div>
      <div className="space-y-2">
        {visibleSections.map((section) => (
          <button
            key={section.label}
            onClick={() => setActiveSection(section.key)}
            className="flex items-center gap-4 w-full p-4 rounded-xl border border-border bg-card hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
          >
            <div className="p-2.5 rounded-lg bg-primary/10">
              <section.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{section.label}</p>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
