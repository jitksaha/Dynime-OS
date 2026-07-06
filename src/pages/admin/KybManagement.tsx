import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Eye, Loader2,
  RefreshCw, Search, Building2, BadgeCheck, FileText,
  ExternalLink, Globe, Phone, Mail, Calendar, Users,
  DollarSign, Briefcase, MapPin, Shield, Sparkles, User,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  not_applied: { icon: Building2, color: "text-muted-foreground", bg: "bg-muted/30", label: "Not Applied" },
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending" },
  under_review: { icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10", label: "Under Review" },
  approved: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Verified" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
};

const REQUIRED_DOCUMENTS = [
  { key: "certificate_of_incorporation", label: "Certificate of Incorporation / Registration" },
  { key: "memorandum_articles", label: "Memorandum & Articles of Association" },
  { key: "tax_registration", label: "Tax Registration Certificate" },
  { key: "proof_of_address", label: "Proof of Business Address" },
  { key: "ownership_structure", label: "Ownership Structure / Shareholding Document" },
  { key: "bank_statement", label: "Bank Statement (last 3 months)" },
  { key: "trade_license", label: "Trade License" },
  { key: "authorized_signatory", label: "Board Resolution / Power of Attorney" },
];

function InfoField({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ElementType }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value || <span className="text-muted-foreground/50 italic">Not provided</span>}</p>
    </div>
  );
}

export default function KybManagement() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState<"ai" | "sumsub" | null>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from("tenants").select("*" as any).order("updated_at", { ascending: false });
    const allTenants = ((data as any[]) || []).filter((t: any) => t.kyb_status && t.kyb_status !== "not_applied");
    const finalData = filter === "all" ? allTenants : allTenants.filter((t: any) => t.kyb_status === filter);
    setRecords(finalData);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [filter]);

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setProcessing(true);
    const updateData: any = { kyb_status: status };
    if (status === "approved") updateData.kyb_verified_at = new Date().toISOString();
    if (reason) updateData.kyb_rejection_reason = reason;

    const { error } = await supabase.from("tenants").update(updateData).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`KYB ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated"}`);
      setSelected(null);
      setRejectionReason("");
      fetchRecords();
    }
    setProcessing(false);
  };

  const filtered = records.filter((r) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || (r.kyb_business_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const counts: Record<string, number> = {
    all: records.length,
    pending: records.filter((r) => r.kyb_status === "pending").length,
    under_review: records.filter((r) => r.kyb_status === "under_review").length,
    approved: records.filter((r) => r.kyb_status === "approved").length,
    rejected: records.filter((r) => r.kyb_status === "rejected").length,
  };

  const docs = selected?.kyb_documents || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">KYB Management</h1>
            <p className="text-xs text-muted-foreground">Review and manage business verification applications</p>
          </div>
        </div>
        <button onClick={fetchRecords} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["all", "pending", "under_review", "approved", "rejected"] as const).map((key) => {
          const cfg = key === "all" ? { icon: Building2, color: "text-primary", bg: "bg-primary/10", label: "All" } : STATUS_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${filter === key ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/30"}`}>
              <div className={`p-1.5 rounded-lg ${cfg.bg}`}><Icon className={`h-3.5 w-3.5 ${cfg.color}`} /></div>
              <div className="text-left">
                <p className="text-lg font-bold text-foreground leading-none">{counts[key] || 0}</p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center py-14 gap-3"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3"><BadgeCheck className="h-7 w-7 text-primary/40" /></div>
          <p className="text-sm font-medium text-foreground">No KYB applications found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Business Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Applied</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => {
                  const cfg = STATUS_CONFIG[r.kyb_status] || STATUS_CONFIG.pending;
                  const SIcon = cfg.icon;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.plan} plan</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{r.kyb_business_name || "-"}</td>
                      <td className="px-4 py-3 text-foreground text-xs">{r.kyb_business_type || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                          <SIcon className="h-3 w-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.kyb_applied_at ? format(new Date(r.kyb_applied_at), "MMM dd, yyyy") : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setSelected(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
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

      {/* ─── Detail Modal ─── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">KYB Review — {selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>

            {/* Status Badge */}
            {(() => {
              const cfg = STATUS_CONFIG[selected.kyb_status] || STATUS_CONFIG.pending;
              const SIcon = cfg.icon;
              return (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                  <SIcon className="h-3.5 w-3.5" /> {cfg.label}
                </div>
              );
            })()}

            {/* ── Section: Business Information ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Business Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Legal Business Name" value={selected.kyb_business_name} icon={Building2} />
                <InfoField label="Business Type" value={selected.kyb_business_type} icon={Briefcase} />
                <InfoField label="Country" value={selected.kyb_country} icon={Globe} />
                <InfoField label="Registration #" value={selected.kyb_registration_number} />
                <InfoField label="Tax ID" value={selected.kyb_tax_id} />
                <InfoField label="Industry" value={selected.industry} />
                <InfoField label="Incorporation Date" value={selected.kyb_incorporation_date} icon={Calendar} />
                <InfoField label="Employee Count" value={selected.kyb_employee_count} icon={Users} />
                <InfoField label="Website" value={selected.kyb_website} icon={Globe} />
              </div>
            </div>

            {/* ── Section: Contact Information ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Contact Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Business Email" value={selected.kyb_email} icon={Mail} />
                <InfoField label="Business Phone" value={selected.kyb_phone} icon={Phone} />
              </div>
            </div>

            {/* ── Section: Address ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Business Address
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Street Address" value={selected.kyb_business_address} />
                <InfoField label="City" value={selected.kyb_city} />
                <InfoField label="State / Province" value={selected.kyb_state} />
                <InfoField label="Postal Code" value={selected.kyb_postal_code} />
              </div>
            </div>

            {/* ── Section: Authorized Representative ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Authorized Representative
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Full Name" value={selected.kyb_authorized_rep_name} />
                <InfoField label="Title / Position" value={selected.kyb_authorized_rep_title} />
                <InfoField label="Email" value={selected.kyb_authorized_rep_email} icon={Mail} />
                <InfoField label="Phone" value={selected.kyb_authorized_rep_phone} icon={Phone} />
                <InfoField label="Date of Birth" value={selected.kyb_authorized_rep_dob} icon={Calendar} />
              </div>
            </div>

            {/* ── Section: Financial Information ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Financial Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Annual Revenue" value={selected.kyb_annual_revenue} icon={DollarSign} />
                <InfoField label="Source of Funds" value={selected.kyb_source_of_funds} />
                <InfoField label="Purpose of Account" value={selected.kyb_purpose_of_account} />
              </div>
            </div>

            {/* ── Section: Beneficial Owners (UBO) ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Beneficial Owners (UBO)
              </h4>
              {selected.kyb_beneficial_owners && Array.isArray(selected.kyb_beneficial_owners) && selected.kyb_beneficial_owners.length > 0 ? (
                <div className="space-y-2">
                  {(selected.kyb_beneficial_owners as any[]).map((o: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs p-3 rounded-lg bg-muted/20 border border-border">
                      <div>
                        <span className="font-semibold text-foreground">{o.full_name}</span>
                        {o.nationality && <span className="text-muted-foreground ml-2">({o.nationality})</span>}
                        {o.is_pep && <span className="ml-2 text-amber-500 font-bold">⚠️ PEP</span>}
                      </div>
                      <span className="text-muted-foreground font-semibold">{o.ownership_percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">No beneficial owners provided</p>
              )}
            </div>

            {/* ── Section: Submitted Documents ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Submitted Documents
              </h4>
              <div className="space-y-2">
                {REQUIRED_DOCUMENTS.map((doc) => {
                  const uploaded = docs[doc.key];
                  return (
                    <div key={doc.key} className={`flex items-center justify-between p-3 rounded-lg border text-xs ${uploaded ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-muted/10"}`}>
                      <div className="flex items-center gap-2">
                        <FileText className={`h-3.5 w-3.5 ${uploaded ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                        <div>
                          <p className={`font-medium ${uploaded ? "text-foreground" : "text-muted-foreground/50"}`}>{doc.label}</p>
                          {uploaded && <p className="text-muted-foreground text-[10px] mt-0.5">{uploaded.name}</p>}
                        </div>
                      </div>
                      {uploaded ? (
                        <a href={uploaded.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors">
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 italic">Not uploaded</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Section: Terms & Submission ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Terms & Submission
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Terms Accepted" value={selected.kyb_terms_accepted ? "Yes ✓" : "No"} />
                <InfoField label="Applied On" value={selected.kyb_applied_at ? format(new Date(selected.kyb_applied_at), "MMM dd, yyyy 'at' h:mm a") : null} icon={Calendar} />
                {selected.kyb_terms_accepted_at && (
                  <InfoField label="Terms Accepted On" value={format(new Date(selected.kyb_terms_accepted_at), "MMM dd, yyyy 'at' h:mm a")} />
                )}
              </div>
            </div>

            {/* ── Verification Buttons ── */}
            <div className="space-y-3 pt-2 border-t border-border">
              {verifyResult && (
                <div className={`p-4 rounded-xl border text-sm space-y-2 ${
                  verifyResult.status === "approved" ? "bg-emerald-500/5 border-emerald-500/20" :
                  verifyResult.status === "rejected" ? "bg-destructive/5 border-destructive/20" :
                  verifyResult.status === "error" ? "bg-destructive/5 border-destructive/20" :
                  "bg-blue-500/5 border-blue-500/20"
                }`}>
                  <p className="font-semibold text-foreground">
                    {verifyResult.status === "approved" ? "✅ Approved" :
                     verifyResult.status === "rejected" ? "❌ Rejected" :
                     verifyResult.status === "error" ? "⚠️ Error" :
                     "🔍 Under Review"}
                  </p>
                  <p className="text-xs text-muted-foreground">{verifyResult.reason}</p>
                  {verifyResult.risk_score != null && (
                    <p className="text-xs text-muted-foreground">Risk Score: <span className="font-bold text-foreground">{verifyResult.risk_score}/100</span></p>
                  )}
                  {verifyResult.issues?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mt-1">Issues:</p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {verifyResult.issues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                      </ul>
                    </div>
                  )}
                  {verifyResult.checks && (
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {Object.entries(verifyResult.checks).map(([key, val]) => (
                        <span key={key} className="text-[10px]">
                          {val ? "✅" : "❌"} {key.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    setVerifying("sumsub");
                    setVerifyResult(null);
                    try {
                      const { data, error } = await supabase.functions.invoke("kyb-verify", {
                        body: { tenant_id: selected.id, method: "sumsub" },
                      });
                      if (error) throw error;
                      setVerifyResult(data);
                      if (data?.status === "approved" || data?.status === "under_review") {
                        fetchRecords();
                      }
                      if (data?.status === "error") toast.error(data.reason);
                      else toast.success(data?.reason || "Sumsub verification initiated");
                    } catch (err: any) {
                      toast.error(err.message || "Sumsub verification failed");
                      setVerifyResult({ status: "error", reason: err.message });
                    }
                    setVerifying(null);
                  }}
                  disabled={verifying !== null}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500/10 text-sky-500 font-semibold text-sm hover:bg-sky-500/20 transition-colors border border-sky-500/20 disabled:opacity-50"
                >
                  {verifying === "sumsub" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Verify with Sumsub
                </button>
                <button
                  onClick={async () => {
                    setVerifying("ai");
                    setVerifyResult(null);
                    try {
                      const { data, error } = await supabase.functions.invoke("kyb-verify", {
                        body: { tenant_id: selected.id, method: "ai" },
                      });
                      if (error) throw error;
                      setVerifyResult(data);
                      if (data?.status === "approved" || data?.status === "rejected") {
                        fetchRecords();
                      }
                      if (data?.status === "error") toast.error(data.reason);
                      else toast.success(data?.reason || "AI verification complete");
                    } catch (err: any) {
                      toast.error(err.message || "AI verification failed");
                      setVerifyResult({ status: "error", reason: err.message });
                    }
                    setVerifying(null);
                  }}
                  disabled={verifying !== null}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500/10 text-violet-500 font-semibold text-sm hover:bg-violet-500/20 transition-colors border border-violet-500/20 disabled:opacity-50"
                >
                  {verifying === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Verify with AI
                </button>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            {selected.kyb_status !== "approved" && (
              <div className="space-y-3 pt-2 border-t border-border">
                {selected.kyb_status === "pending" && (
                  <button onClick={() => updateStatus(selected.id, "under_review")} disabled={processing}
                    className="w-full py-2.5 rounded-xl bg-blue-500/10 text-blue-500 font-semibold text-sm hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2">
                    <Eye className="h-4 w-4" /> Mark as Under Review
                  </button>
                )}
                <button onClick={() => updateStatus(selected.id, "approved")} disabled={processing}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-semibold text-sm hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve & Verify Company
                </button>
                <div>
                  <input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason (required)"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm mb-2" />
                  <button
                    onClick={() => { if (!rejectionReason.trim()) { toast.error("Enter a rejection reason"); return; } updateStatus(selected.id, "rejected", rejectionReason); }}
                    disabled={processing}
                    className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2">
                    <XCircle className="h-4 w-4" /> Reject Application
                  </button>
                </div>
              </div>
            )}

            {selected.kyb_status === "approved" && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified on {selected.kyb_verified_at ? format(new Date(selected.kyb_verified_at), "MMM dd, yyyy") : "-"}
                </p>
              </div>
            )}

            {selected.kyb_rejection_reason && selected.kyb_status === "rejected" && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-destructive">Rejection Reason</p>
                  <p className="text-xs text-foreground mt-0.5">{selected.kyb_rejection_reason}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
