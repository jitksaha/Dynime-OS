import { useState, useEffect } from "react";
import { Shield, Smartphone, Copy, CheckCircle2, XCircle, KeyRound, Fingerprint, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

// ===================== TOTP Section =====================
function TOTPSection() {
  const { user } = useAuth();
  const [step, setStep] = useState<"setup" | "verify" | "enabled" | "disabled">("disabled");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      if (data?.totp && data.totp.length > 0) {
        const verified = data.totp.find((f: any) => f.status === "verified");
        if (verified) { setStep("enabled"); setFactorId(verified.id); }
      }
    };
    check();
  }, []);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator App" });
      if (error) throw error;
      if (data) { setFactorId(data.id); setQrCode(data.totp.qr_code); setSecret(data.totp.secret); setStep("setup"); }
    } catch (err: any) { toast.error(err.message || "Failed to enroll 2FA"); }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) { toast.error("Enter a 6-digit code"); return; }
    setLoading(true);
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verifyCode });
      if (verifyErr) throw verifyErr;
      toast.success("Authenticator app enabled!"); setStep("enabled"); setVerifyCode("");
    } catch (err: any) { toast.error(err.message || "Invalid code"); }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("Authenticator app disabled"); setStep("disabled"); setFactorId("");
    } catch (err: any) { toast.error(err.message || "Failed to disable"); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Smartphone className="h-4.5 w-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Authenticator App (TOTP)</h3>
        {step === "enabled" && <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-success/10 text-success">Active</span>}
      </div>

      {step === "disabled" && (
        <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Use an authenticator app like Google Authenticator, Authy, or 1Password.
          </p>
          <button onClick={handleEnroll} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> {loading ? "Setting up..." : "Enable Authenticator"}
          </button>
        </div>
      )}

      {step === "setup" && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">1. Scan QR Code</h4>
            <p className="text-xs text-muted-foreground">Open your authenticator app and scan this QR code.</p>
          </div>
          {qrCode && <div className="flex justify-center p-3 bg-white rounded-lg"><img src={qrCode} alt="2FA QR Code" className="h-40 w-40" /></div>}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Manual Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-mono text-foreground break-all">{secret}</code>
              <button onClick={() => { navigator.clipboard.writeText(secret); toast.success("Copied"); }} className="p-1.5 rounded-lg border border-input hover:bg-secondary">
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">2. Enter Code</h4>
            <input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-center tracking-widest font-mono" />
          </div>
          <button onClick={handleVerify} disabled={loading || verifyCode.length !== 6} className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? "Verifying..." : "Verify & Enable"}
          </button>
        </div>
      )}

      {step === "enabled" && (
        <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-success" />
            <span className="text-sm text-foreground">Authenticator is active</span>
          </div>
          <button onClick={handleDisable} disabled={loading} className="text-xs text-destructive hover:underline">
            {loading ? "Disabling..." : "Disable Authenticator"}
          </button>
        </div>
      )}
    </div>
  );
}

// ===================== Passkey Section =====================
interface PasskeyRecord {
  id: string;
  credential_id: string;
  friendly_name: string;
  created_at: string;
  last_used_at: string | null;
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function PasskeySection() {
  const { user, session } = useAuth();
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [supported, setSupported] = useState(true);
  const [friendlyName, setFriendlyName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    setSupported(!!window.PublicKeyCredential);
    if (user) loadPasskeys();
  }, [user]);

  const loadPasskeys = async () => {
    const { data } = await supabase.from("user_passkeys").select("id, credential_id, friendly_name, created_at, last_used_at").order("created_at", { ascending: false });
    setPasskeys((data as PasskeyRecord[]) || []);
  };

  const rpId = window.location.hostname;
  const rpName = "Boostio Pro";

  const handleRegister = async () => {
    if (!user || !session) return;
    setRegistering(true);
    try {
      // Get challenge from edge function
      const { data: challengeData, error: fnErr } = await supabase.functions.invoke("webauthn-challenge", {
        body: { action: "generate-registration-challenge" },
      });
      if (fnErr) throw new Error(fnErr.message);

      const options: PublicKeyCredentialCreationOptions = {
        challenge: base64UrlToBuffer(challengeData.challenge),
        rp: { name: rpName, id: rpId },
        user: {
          id: new TextEncoder().encode(challengeData.userId),
          name: challengeData.userEmail || "user",
          displayName: challengeData.userEmail || "User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        timeout: 60000,
        attestation: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "preferred",
        },
        excludeCredentials: (challengeData.excludeCredentials || []).map((id: string) => ({
          id: base64UrlToBuffer(id),
          type: "public-key" as const,
        })),
      };

      const credential = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
      if (!credential) throw new Error("Registration cancelled");

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = bufferToBase64Url(credential.rawId);
      const publicKey = bufferToBase64Url(response.attestationObject);
      const transports = response.getTransports?.() || [];

      // Verify registration on server
      const { data: verifyResult, error: verifyErr } = await supabase.functions.invoke("webauthn-challenge", {
        body: {
          action: "verify-registration",
          credentialId,
          publicKey,
          friendlyName: friendlyName || "My Passkey",
          transports,
        },
      });

      if (verifyErr) throw new Error(verifyErr.message);
      if (!verifyResult?.success) throw new Error("Verification failed");

      toast.success("Passkey registered successfully!");
      setFriendlyName("");
      setShowNameInput(false);
      await loadPasskeys();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Passkey registration was cancelled");
      } else {
        toast.error(err.message || "Failed to register passkey");
      }
    }
    setRegistering(false);
  };

  const handleVerify = async () => {
    if (!user || !session) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: fnErr } = await supabase.functions.invoke("webauthn-challenge", {
        body: { action: "generate-authentication-challenge" },
      });
      if (fnErr) throw new Error(fnErr.message);

      const options: PublicKeyCredentialRequestOptions = {
        challenge: base64UrlToBuffer(challengeData.challenge),
        rpId,
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials: (challengeData.allowCredentials || []).map((c: any) => ({
          id: base64UrlToBuffer(c.id),
          type: "public-key" as const,
          transports: c.transports,
        })),
      };

      const assertion = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential;
      if (!assertion) throw new Error("Authentication cancelled");

      const credentialId = bufferToBase64Url(assertion.rawId);

      const { data: result, error: vErr } = await supabase.functions.invoke("webauthn-challenge", {
        body: { action: "verify-authentication", credentialId },
      });

      if (vErr) throw new Error(vErr.message);
      if (!result?.success) throw new Error("Verification failed");

      toast.success(`Verified with ${result.friendlyName}`);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Verification cancelled");
      } else {
        toast.error(err.message || "Verification failed");
      }
    }
    setVerifying(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove passkey "${name}"?`)) return;
    setLoading(true);
    const { error } = await supabase.from("user_passkeys").delete().eq("id", id);
    if (error) toast.error("Failed to remove passkey");
    else { toast.success("Passkey removed"); await loadPasskeys(); }
    setLoading(false);
  };

  if (!supported) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Fingerprint className="h-4.5 w-4.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Passkeys (WebAuthn)</h3>
        </div>
        <p className="text-xs text-muted-foreground">Your browser does not support passkeys.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Fingerprint className="h-4.5 w-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Passkeys (WebAuthn)</h3>
        {passkeys.length > 0 && <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-success/10 text-success">{passkeys.length} Active</span>}
      </div>

      {passkeys.length === 0 ? (
        <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Use your device's biometric sensor (Face ID, Touch ID, Windows Hello) or a hardware security key for phishing-resistant verification.
          </p>
          {showNameInput ? (
            <div className="space-y-2">
              <input value={friendlyName} onChange={(e) => setFriendlyName(e.target.value)} placeholder="e.g. MacBook Pro, iPhone"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm" />
              <div className="flex gap-2">
                <button onClick={handleRegister} disabled={registering} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
                  {registering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />}
                  {registering ? "Registering..." : "Register Passkey"}
                </button>
                <button onClick={() => setShowNameInput(false)} className="px-3 py-1.5 rounded-lg border border-input text-xs text-muted-foreground hover:bg-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNameInput(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add Passkey
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Passkey list */}
          <div className="space-y-2">
            {passkeys.map((pk) => (
              <div key={pk.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Fingerprint className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pk.friendly_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Added {new Date(pk.created_at).toLocaleDateString()}
                      {pk.last_used_at && ` · Last used ${new Date(pk.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(pk.id, pk.friendly_name)} disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleVerify} disabled={verifying} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/5 disabled:opacity-50">
              {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {verifying ? "Verifying..." : "Test Passkey"}
            </button>
            {showNameInput ? (
              <div className="flex items-center gap-2">
                <input value={friendlyName} onChange={(e) => setFriendlyName(e.target.value)} placeholder="Device name"
                  className="h-8 w-40 rounded-lg border border-input bg-background px-2.5 text-xs" />
                <button onClick={handleRegister} disabled={registering} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
                  {registering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add
                </button>
                <button onClick={() => setShowNameInput(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowNameInput(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input text-xs text-muted-foreground hover:bg-secondary">
                <Plus className="h-3.5 w-3.5" /> Add Another
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== Main Component =====================
export default function TwoFactorAuth() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Two-Step Verification</h2>
          <p className="text-sm text-muted-foreground">Protect your account with multiple verification methods</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-6">
        <TOTPSection />
        <div className="border-t border-border" />
        <PasskeySection />
      </div>
    </div>
  );
}
