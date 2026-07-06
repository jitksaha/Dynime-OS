import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";

interface PayoutRequest {
  id: string;
  tenant_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  payout_method: string;
  account_details: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default function PayoutApprovals() {
  const { user } = useAuth();
  const { formatPrice: fp } = usePlatformCurrency();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const [reqRes, tenRes] = await Promise.all([
      supabase.from("payout_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, name"),
    ]);
    setRequests((reqRes.data as any) || []);
    const map: Record<string, string> = {};
    (tenRes.data || []).forEach((t: any) => { map[t.id] = t.name; });
    setTenantNames(map);
    setLoading(false);
  };

  const handleAction = async (id: string, action: "approved" | "rejected", notes?: string) => {
    setProcessing(id);
    const { error } = await supabase
      .from("payout_requests")
      .update({
        status: action,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes || null,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Payout ${action}`);
      fetchRequests();
    }
    setProcessing(null);
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payout Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve company payout requests</p>
      </div>

      <div className="flex gap-1 bg-secondary/30 rounded-lg p-0.5 w-fit">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Banknote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} payout requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {fp(req.amount)} payout request
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tenantNames[req.tenant_id] || "Unknown Company"} · {format(new Date(req.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  req.status === "pending" ? "bg-warning/10 text-warning" :
                  req.status === "approved" ? "bg-success/10 text-success" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  {req.status === "pending" ? <Clock className="h-3 w-3" /> :
                   req.status === "approved" ? <CheckCircle2 className="h-3 w-3" /> :
                   <XCircle className="h-3 w-3" />}
                  {req.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div>
                  <span className="text-muted-foreground">Method</span>
                  <p className="font-medium text-foreground capitalize">{req.payout_method}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fee</span>
                  <p className="font-medium text-foreground">{fp(req.fee_amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Amount</span>
                  <p className="font-medium text-success">{fp(req.net_amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Account</span>
                  <p className="font-medium text-foreground truncate">
                    {req.account_details?.account_number || req.account_details?.phone || "—"}
                  </p>
                </div>
              </div>

              {req.status === "pending" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleAction(req.id, "approved")}
                    disabled={processing === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {processing === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(req.id, "rejected")}
                    disabled={processing === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
