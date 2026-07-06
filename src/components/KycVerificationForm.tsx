// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Shield, Upload, FileText, User,
  Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw,
  CreditCard, Globe,
} from "lucide-react";
import { useKycStatus } from "@/hooks/useKycStatus";

const DOCUMENT_TYPES = [
  { value: "nid", label: "National ID (NID)" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "birth_certificate", label: "Birth Certificate" },
];

type VerificationMethod = "manual" | "ai" | "sumsub";

export default function KycVerificationForm() {
  const { user, profile } = useAuth();
  const { status, kycData, loading: kycLoading, refresh } = useKycStatus();

  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("ai");
  const [methodLoading, setMethodLoading] = useState(true);
  const [sumsubToken, setSumsubToken] = useState<string | null>(null);
  const [sumsubLoading, setSumsubLoading] = useState(false);
  const [sumsubEnvironment, setSumsubEnvironment] = useState<"sandbox" | "live">("sandbox");
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("Bangladeshi");
  const [docType, setDocType] = useState("nid");
  const [docNumber, setDocNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Load verification method config
  useEffect(() => {
    const loadMethod = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "kyc_verification_config")
        .maybeSingle();
      if (data?.value) {
        const cfg = data.value as any;
        setVerificationMethod(cfg.method || "ai");
        setSumsubEnvironment(cfg.sumsub_environment || "sandbox");
      }
      setMethodLoading(false);
    };
    loadMethod();
  }, []);

  const startSumsubVerification = useCallback(async () => {
    setSumsubLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sumsub-access-token", {
        body: { action: "create-access-token" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setSumsubToken(data.token);
      setSumsubEnvironment(data.environment || "sandbox");
      toast.success("Sumsub verification session started");
    } catch (err: any) {
      toast.error("Failed to start verification: " + (err.message || "Unknown error"));
    }
    setSumsubLoading(false);
  }, []);

  const checkSumsubStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("sumsub-access-token", {
        body: { action: "check-status" },
      });
      if (error) throw new Error(error.message);
      if (data?.kyc_status === "approved") {
        toast.success("🎉 Identity verified successfully!");
        await refresh();
      } else if (data?.kyc_status === "rejected") {
        toast.error("Verification was rejected. Please try again.");
        await refresh();
      } else {
        toast.info("Verification still in progress. Please complete all steps in the Sumsub window.");
      }
    } catch (err: any) {
      toast.error("Failed to check status: " + (err.message || "Unknown error"));
    }
    setCheckingStatus(false);
  }, [refresh]);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return path;
  };

  const handleSubmit = async () => {
    if (!user || !profile?.tenant_id) return;
    if (!fullName.trim() || !docNumber.trim()) {
      toast.error("Full name and document number are required");
      return;
    }
    if (!frontFile) {
      toast.error("Please upload document front image");
      return;
    }

    setSubmitting(true);

    // Delete any existing non-approved KYC records to avoid unique constraint violation
    await supabase.from("kyc_verifications").delete()
      .eq("user_id", user.id)
      .in("status", ["pending", "under_review", "rejected"]);

    const frontUrl = await uploadFile(frontFile, "doc-front");
    const backUrl = backFile ? await uploadFile(backFile, "doc-back") : null;
    const selfieUrl = selfieFile ? await uploadFile(selfieFile, "selfie") : null;

    if (!frontUrl) {
      setSubmitting(false);
      return;
    }

    const { data: kycRecord, error } = await supabase.from("kyc_verifications").insert({
      user_id: user.id,
      tenant_id: profile.tenant_id,
      full_name: fullName,
      date_of_birth: dob || null,
      nationality: nationality || null,
      document_type: docType,
      document_number: docNumber,
      document_front_url: frontUrl,
      document_back_url: backUrl,
      selfie_url: selfieUrl,
      address: address || null,
      city: city || null,
      postal_code: postalCode || null,
      phone_number: phoneNumber || null,
    } as any).select("id").single();

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    // Trigger AI-powered verification
    toast.info("Documents submitted! AI is verifying your identity...");
    try {
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke("kyc-ai-verify", {
        body: { kyc_id: kycRecord.id },
      });

      if (verifyError) {
        console.error("AI verify error:", verifyError);
        toast.info("Submitted successfully. Verification is being processed.");
      } else if (verifyResult?.status === "approved") {
        toast.success("🎉 KYC Verified! Your identity has been approved by AI. Redirecting to wallet...");
        await refresh();
        setSubmitting(false);
        return; // refresh will update isVerified → wallet dashboard renders automatically
      } else if (verifyResult?.status === "rejected") {
        toast.error(`Verification failed: ${verifyResult.reason}. Please resubmit with clearer documents.`);
        // Delete the rejected record so user can resubmit immediately
        await supabase.from("kyc_verifications").delete().eq("id", kycRecord.id);
        await refresh();
        setSubmitting(false);
        return;
      } else {
        toast.info("Submitted. Your documents are being reviewed.");
      }
    } catch (err) {
      console.error("AI verification call failed:", err);
      toast.info("Submitted successfully. Verification is being processed.");
    }

    await refresh();
    setSubmitting(false);
  };

  const handleResubmit = async () => {
    // Delete rejected KYC and allow resubmit
    if (kycData?.id) {
      await supabase.from("kyc_verifications").delete().eq("id", kycData.id);
      refresh();
    }
  };

  if (kycLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking verification status...</p>
      </div>
    );
  }

  // Status display for pending/under_review
  if (status === "pending" || status === "under_review") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/10 p-8 text-center">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Verification In Progress</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Your KYC documents are being reviewed. This usually takes 1-2 business days. We'll notify you once it's done.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {status === "pending" ? "Pending Review" : "Under Review"}
              </span>
            </div>
            <div className="mt-6 bg-card/60 border border-border rounded-xl p-4 text-left">
              <p className="text-xs font-semibold text-foreground mb-2">Submitted Details</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Name:</span> {kycData?.full_name}</p>
                <p><span className="font-medium text-foreground">Document:</span> {DOCUMENT_TYPES.find(d => d.value === kycData?.document_type)?.label}</p>
                <p><span className="font-medium text-foreground">Number:</span> {kycData?.document_number}</p>
                <p><span className="font-medium text-foreground">Submitted:</span> {kycData?.submitted_at ? new Date(kycData.submitted_at).toLocaleDateString() : "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rejected status
  if (status === "rejected") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-destructive/10 p-8 text-center">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-destructive/5 blur-2xl" />
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Verification Rejected</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Unfortunately, your KYC verification was not approved. Please review the reason below and resubmit.
            </p>
            {kycData?.rejection_reason && (
              <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-destructive">Rejection Reason</p>
                    <p className="text-xs text-foreground mt-1">{kycData.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleResubmit}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Resubmit KYC
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (methodLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading verification settings...</p>
      </div>
    );
  }

  // Sumsub verification flow
  if (verificationMethod === "sumsub" && status === "none") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Identity Verification</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Complete your identity verification through our secure partner Sumsub. 
                {sumsubEnvironment === "sandbox" && (
                  <span className="text-amber-500 font-medium"> (Sandbox Mode)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {!sumsubToken ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Ready to Verify</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click below to start the secure verification process. You'll need a valid ID document and your camera.
              </p>
            </div>
            <button
              onClick={startSumsubVerification}
              disabled={sumsubLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {sumsubLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {sumsubLoading ? "Starting..." : "Start Sumsub Verification"}
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Verification session active. Complete the verification in the Sumsub window below.
              </p>
            </div>

            {/* Sumsub WebSDK iframe */}
            <div className="rounded-xl overflow-hidden border border-border bg-background" style={{ minHeight: 600 }}>
              <iframe
                src={`https://websdk.sumsub.com/idensic/#/uni_${sumsubToken}`}
                className="w-full border-0"
                style={{ height: 600 }}
                allow="camera; microphone"
                title="Sumsub Verification"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Completed the verification? Click to check your status.
              </p>
              <button
                onClick={checkSumsubStatus}
                disabled={checkingStatus}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {checkingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Check Verification Status
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // KYC Form (status === "none") - Manual/AI mode
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">KYC Verification Required</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete your identity verification to unlock wallet features. This is a one-time process required for security compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {s}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
              {s === 1 ? "Personal Info" : s === 2 ? "Document" : "Confirm"}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground block mb-1.5">Full Name *</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your legal full name"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Nationality</label>
              <input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Bangladeshi"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Phone Number</label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+880..."
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Dhaka"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground block mb-1.5">Full Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, Street, Area"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Postal Code</label>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 1205"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (!fullName.trim()) { toast.error("Full name is required"); return; }
                setStep(2);
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Next: Document Upload →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Document Upload */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Document Verification</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Document Type *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {DOCUMENT_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Document Number *</label>
              <input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Enter document number"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* File uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <FileUploadBox
              label="Document Front *"
              file={frontFile}
              onFileChange={setFrontFile}
              icon={CreditCard}
            />
            <FileUploadBox
              label="Document Back"
              file={backFile}
              onFileChange={setBackFile}
              icon={CreditCard}
            />
            <FileUploadBox
              label="Selfie with Document"
              file={selfieFile}
              onFileChange={setSelfieFile}
              icon={User}
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                if (!docNumber.trim()) { toast.error("Document number is required"); return; }
                if (!frontFile) { toast.error("Document front image is required"); return; }
                setStep(3);
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Review & Submit</h3>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Full Name</p>
                <p className="font-semibold text-foreground">{fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-semibold text-foreground">{dob || "Not provided"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nationality</p>
                <p className="font-semibold text-foreground">{nationality || "Not provided"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-semibold text-foreground">{phoneNumber || "Not provided"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Document Type</p>
                <p className="font-semibold text-foreground">{DOCUMENT_TYPES.find(d => d.value === docType)?.label}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Document Number</p>
                <p className="font-semibold text-foreground">{docNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-semibold text-foreground">{address || "Not provided"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-semibold text-foreground">{city || "Not provided"}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-border text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Front: {frontFile?.name}</span>
              </div>
              {backFile && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Back: {backFile.name}</span>
                </div>
              )}
              {selfieFile && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Selfie: {selfieFile.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              By submitting, you confirm that the information provided is accurate and the documents are genuine.
              False information may result in permanent account restrictions.
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {submitting ? "Submitting..." : "Submit Verification"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FileUploadBox({
  label,
  file,
  onFileChange,
  icon: Icon,
}: {
  label: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  icon: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground block">{label}</label>
      <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
        file ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-primary/5"
      }`}>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        {file ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-primary mb-1" />
            <span className="text-[10px] text-primary font-medium text-center truncate max-w-full">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">Click to upload</span>
          </>
        )}
      </label>
    </div>
  );
}
