// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  Shield, CheckCircle2, XCircle, Clock, Eye, Loader2,
  RefreshCw, Search, User, FileText,
} from "lucide-react";
import { format } from "date-fns";

interface KycRecord {
  id: string;
  user_id: string;
  tenant_id: string;
  status: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  document_type: string;
  document_number: string;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone_number: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  nid: "National ID",
  passport: "Passport",
  driving_license: "Driving License",
  birth_certificate: "Birth Certificate",
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending" },
  under_review: { icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10", label: "Under Review" },
  approved: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
};

export default function KycManagement() {
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "under_review" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<KycRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase.from("kyc_verifications").select("*").order("submitted_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setRecords((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [filter]);

  const updateStatus = async (id: string, status: "under_review" | "approved" | "rejected", reason?: string) => {
    setProcessing(true);
    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString(),
    };
    if (reason) updateData.rejection_reason = reason;

    const { error } = await supabase.from("kyc_verifications").update(updateData).eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`KYC ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "marked as under review"}`);
      setSelectedRecord(null);
      setRejectionReason("");
      fetchRecords();
    }
    setProcessing(false);
  };

  const getDocUrl = async (path: string) => {
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not load document");
  };

  const filtered = records.filter((r) =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || r.document_number.includes(search)
  );

  const counts = {
    all: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    under_review: records.filter((r) => r.status === "under_review").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">KYC Management</h1>
            <p className="text-xs text-muted-foreground">Review and manage user identity verifications</p>
          </div>
        </div>
        <button onClick={fetchRecords} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["all", "pending", "under_review", "approved", "rejected"] as const).map((key) => {
          const cfg = key === "all" ? { icon: User, color: "text-primary", bg: "bg-primary/10", label: "All" } : STATUS_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                filter === key ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/30"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-foreground leading-none">{counts[key]}</p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or document number..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>

      {/* Records List */}
      {loading ? (
        <div className="flex flex-col items-center py-14 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading KYC records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
            <Shield className="h-7 w-7 text-primary/40" />
          </div>
          <p className="text-sm font-medium text-foreground">No KYC records found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Submitted</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.phone_number || r.city || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{DOC_TYPE_LABELS[r.document_type] || r.document_type}</p>
                        <p className="text-xs text-muted-foreground">{r.document_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(r.submitted_at), "MMM dd, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                        >
                          <Eye className="h-3 w-3" /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setSelectedRecord(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">KYC Review</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground">Full Name</p><p className="font-semibold text-foreground">{selectedRecord.full_name}</p></div>
              <div><p className="text-muted-foreground">DOB</p><p className="font-semibold text-foreground">{selectedRecord.date_of_birth || "-"}</p></div>
              <div><p className="text-muted-foreground">Nationality</p><p className="font-semibold text-foreground">{selectedRecord.nationality || "-"}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-semibold text-foreground">{selectedRecord.phone_number || "-"}</p></div>
              <div><p className="text-muted-foreground">Document</p><p className="font-semibold text-foreground">{DOC_TYPE_LABELS[selectedRecord.document_type]}</p></div>
              <div><p className="text-muted-foreground">Doc Number</p><p className="font-semibold text-foreground">{selectedRecord.document_number}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-semibold text-foreground">{[selectedRecord.address, selectedRecord.city, selectedRecord.postal_code].filter(Boolean).join(", ") || "-"}</p></div>
            </div>

            {/* Document Links */}
            <div className="flex flex-wrap gap-2">
              {selectedRecord.document_front_url && (
                <button onClick={() => getDocUrl(selectedRecord.document_front_url!)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">
                  <FileText className="h-3 w-3" /> View Front
                </button>
              )}
              {selectedRecord.document_back_url && (
                <button onClick={() => getDocUrl(selectedRecord.document_back_url!)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">
                  <FileText className="h-3 w-3" /> View Back
                </button>
              )}
              {selectedRecord.selfie_url && (
                <button onClick={() => getDocUrl(selectedRecord.selfie_url!)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">
                  <User className="h-3 w-3" /> View Selfie
                </button>
              )}
            </div>

            {/* Status Actions */}
            {selectedRecord.status !== "approved" && (
              <div className="space-y-3 pt-2 border-t border-border">
                {selectedRecord.status === "pending" && (
                  <button
                    onClick={() => updateStatus(selectedRecord.id, "under_review")}
                    disabled={processing}
                    className="w-full py-2.5 rounded-xl bg-blue-500/10 text-blue-500 font-semibold text-sm hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" /> Mark as Under Review
                  </button>
                )}
                <button
                  onClick={() => updateStatus(selectedRecord.id, "approved")}
                  disabled={processing}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-semibold text-sm hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve KYC
                </button>

                <div>
                  <input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason (required to reject)"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm mb-2"
                  />
                  <button
                    onClick={() => {
                      if (!rejectionReason.trim()) { toast.error("Enter a rejection reason"); return; }
                      updateStatus(selectedRecord.id, "rejected", rejectionReason);
                    }}
                    disabled={processing}
                    className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Reject KYC
                  </button>
                </div>
              </div>
            )}

            {selectedRecord.status === "approved" && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified on {selectedRecord.reviewed_at ? format(new Date(selectedRecord.reviewed_at), "MMM dd, yyyy") : "-"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
