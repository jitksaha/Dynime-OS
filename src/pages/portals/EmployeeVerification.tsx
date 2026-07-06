import { useState, useEffect } from "react";
import { ShieldCheck, Upload, FileText, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface VerificationRequest {
  id: string;
  verification_type: string;
  status: string;
  requested_at: string;
  document_type: string | null;
  document_number: string | null;
  document_urls: any;
  address_data: any;
  rejection_reason: string | null;
  notes: string | null;
}

const typeLabels: Record<string, string> = {
  identity: "Identity Verification",
  address: "Address Verification",
  kyb: "Business Verification (KYB)",
};

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  pending: { color: "text-warning bg-warning/10", icon: Clock, label: "Pending Submission" },
  submitted: { color: "text-info bg-info/10", icon: FileText, label: "Under Review" },
  approved: { color: "text-success bg-success/10", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "text-destructive bg-destructive/10", icon: XCircle, label: "Rejected" },
};

const documentTypes: Record<string, string[]> = {
  identity: ["National ID", "Passport", "Driving License"],
  address: ["Utility Bill", "Bank Statement", "Government Letter"],
  kyb: ["Business License", "Trade License", "Certificate of Incorporation"],
};

export default function EmployeeVerification() {
  const { tenantId, supabase } = useTenant();
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Form states per request
  const [forms, setForms] = useState<Record<string, { docType: string; docNumber: string; address: string; city: string; postalCode: string }>>({});

  const fetchRequests = async () => {
    if (!tenantId || !profile?.full_name) return;
    // Get employee record first
    const { data: empData } = await supabase
      .from("employees")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", user?.email || "")
      .maybeSingle();

    if (!empData) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("employee_verification_requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_id", empData.id)
      .order("requested_at", { ascending: false });

    if (!error && data) {
      setRequests(data as VerificationRequest[]);
      // Init form state for pending ones
      const newForms: typeof forms = {};
      data.forEach((r: any) => {
        if (r.status === "pending") {
          newForms[r.id] = { docType: documentTypes[r.verification_type]?.[0] || "", docNumber: "", address: "", city: "", postalCode: "" };
        }
      });
      setForms((prev) => ({ ...prev, ...newForms }));
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [tenantId, profile?.full_name]);

  const handleSubmit = async (req: VerificationRequest) => {
    const form = forms[req.id];
    if (!form?.docType || !form?.docNumber) {
      toast.error("Please fill in document type and number");
      return;
    }
    setSubmitting(req.id);

    const updateData: any = {
      status: "submitted",
      submitted_at: new Date().toISOString(),
      document_type: form.docType,
      document_number: form.docNumber,
    };

    if (req.verification_type === "address") {
      updateData.address_data = { address: form.address, city: form.city, postal_code: form.postalCode };
    }

    const { error } = await supabase
      .from("employee_verification_requests")
      .update(updateData)
      .eq("id", req.id);

    if (error) {
      toast.error("Failed to submit verification");
    } else {
      toast.success("Verification submitted successfully!");
      fetchRequests();
    }
    setSubmitting(null);
  };

  const updateForm = (id: string, field: string, value: string) => {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> My Verifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount > 0
            ? `You have ${pendingCount} pending verification request${pendingCount > 1 ? "s" : ""}`
            : "All verifications are up to date"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No verification requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const cfg = statusConfig[req.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={req.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {typeLabels[req.verification_type] || req.verification_type}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" /> {cfg.label}
                  </span>
                </div>

                {req.notes && (
                  <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                    <span className="font-medium">Note:</span> {req.notes}
                  </p>
                )}

                {req.status === "rejected" && req.rejection_reason && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    <span className="font-medium">Rejection Reason:</span> {req.rejection_reason}
                  </div>
                )}

                {req.status === "submitted" && (
                  <div className="text-xs text-info bg-info/10 rounded-lg px-3 py-2">
                    Document: <span className="font-medium">{req.document_type}</span> — #{req.document_number}
                  </div>
                )}

                {req.status === "approved" && (
                  <div className="text-xs text-success bg-success/10 rounded-lg px-3 py-2">
                    ✓ Verified — {req.document_type} #{req.document_number}
                  </div>
                )}

                {/* Submission form for pending requests */}
                {req.status === "pending" && forms[req.id] && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-xs font-medium text-foreground">Submit your documents:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Document Type</label>
                        <select
                          value={forms[req.id].docType}
                          onChange={(e) => updateForm(req.id, "docType", e.target.value)}
                          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {(documentTypes[req.verification_type] || []).map((dt) => (
                            <option key={dt} value={dt}>{dt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Document Number</label>
                        <input
                          value={forms[req.id].docNumber}
                          onChange={(e) => updateForm(req.id, "docNumber", e.target.value)}
                          placeholder="e.g. AB123456"
                          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      {req.verification_type === "address" && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Address</label>
                            <input
                              value={forms[req.id].address}
                              onChange={(e) => updateForm(req.id, "address", e.target.value)}
                              placeholder="Street address"
                              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">City</label>
                            <input
                              value={forms[req.id].city}
                              onChange={(e) => updateForm(req.id, "city", e.target.value)}
                              placeholder="City"
                              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleSubmit(req)}
                      disabled={submitting === req.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {submitting === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Submit Verification
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
