import { useState, useEffect } from "react";
import { FileText, Plus, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "salary_certificate", label: "Salary Certificate" },
  { value: "experience_letter", label: "Experience Letter" },
  { value: "employment_letter", label: "Employment Confirmation Letter" },
  { value: "noc", label: "No Objection Certificate (NOC)" },
  { value: "payslip_copy", label: "Payslip Copy" },
  { value: "other", label: "Other" },
];

export default function EmployeeDocRequests() {
  const { tenantId, supabase } = useTenant();
  const { profile, user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState("salary_certificate");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase.from("document_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [user]);

  const handleSubmit = async () => {
    if (!tenantId || !user || !profile?.full_name) return;
    setSubmitting(true);
    const { error } = await supabase.from("document_requests").insert({
      tenant_id: tenantId, user_id: user.id, employee_name: profile.full_name,
      document_type: docType, purpose: purpose || null,
    });
    setSubmitting(false);
    if (error) { toast.error("Failed to submit request"); return; }
    toast.success("Document request submitted!");
    setShowForm(false); setDocType("salary_certificate"); setPurpose("");
    fetchRequests();
  };

  const statusIcon = (s: string) => s === "Approved" ? <CheckCircle className="h-4 w-4 text-success" /> : s === "Rejected" ? <XCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-warning" />;
  const statusColor = (s: string) => s === "Approved" ? "bg-success/10 text-success" : s === "Rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Document Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Request official documents from HR</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all">
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      {showForm && (
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">Request a Document</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Purpose (optional)</label>
              <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Bank loan application" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No document requests yet</p>
          </div>
        ) : requests.map(r => (
          <div key={r.id} className="px-5 py-4 border-b border-border last:border-b-0 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
            {statusIcon(r.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{DOC_TYPES.find(d => d.value === r.document_type)?.label || r.document_type}</p>
              <p className="text-xs text-muted-foreground">{r.purpose || 'No purpose specified'} · {new Date(r.created_at).toLocaleDateString()}</p>
              {r.admin_notes && <p className="text-xs text-info mt-1">Note: {r.admin_notes}</p>}
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
