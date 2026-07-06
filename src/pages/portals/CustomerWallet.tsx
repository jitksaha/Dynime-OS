import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, History, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
}

interface PaymentMethod {
  method_key: string;
  display_name: string;
}

export default function CustomerWallet() {
  const { user, profile } = useAuth();
  const { symbol: cs } = useTenantCurrency();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");

  const fetchWallet = async () => {
    if (!user || !profile?.tenant_id) return;

    // Get or create wallet
    let { data: w } = await supabase
      .from("wallets")
      .select("id, balance, currency")
      .eq("user_id", user.id)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    if (!w) {
      const { data: newW } = await supabase
        .from("wallets")
        .insert({ user_id: user.id, tenant_id: profile.tenant_id } as any)
        .select("id, balance, currency")
        .single();
      w = newW;
    }

    setWallet(w as any);

    if (w) {
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", (w as any).id)
        .order("created_at", { ascending: false })
        .limit(20);
      setTransactions((txns as any) || []);
    }

    // Fetch enabled payment methods
    const { data: pm } = await supabase
      .from("tenant_payment_methods")
      .select("method_key, display_name")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_enabled", true);
    setMethods((pm as any) || []);
    if (pm && pm.length > 0) setSelectedMethod((pm as any)[0].method_key);

    setLoading(false);
  };

  useEffect(() => { fetchWallet(); }, [user, profile?.tenant_id]);

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (!wallet || !user || !profile?.tenant_id) return;

    // Create transaction
    const { error } = await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      tenant_id: profile.tenant_id,
      user_id: user.id,
      transaction_type: "credit",
      amount,
      description: `Wallet top-up via ${selectedMethod}`,
      payment_method: selectedMethod,
      status: "completed",
    } as any);

    if (error) { toast.error(error.message); return; }

    // Update balance
    await supabase
      .from("wallets")
      .update({ balance: wallet.balance + amount })
      .eq("id", wallet.id);

    toast.success(`${cs}${amount} added to wallet`);
    setShowTopUp(false);
    setTopUpAmount("");
    fetchWallet();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your balance and transactions</p>
        </div>
        <button
          onClick={() => navigate("/wallet/settings")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Wallet Settings</span>
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {cs}{wallet?.balance?.toLocaleString() || "0"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{wallet?.currency || "BDT"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </div>
        <button
          onClick={() => setShowTopUp(!showTopUp)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Top Up Wallet
        </button>
      </div>

      {/* Top Up Form */}
      {showTopUp && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Top Up Your Wallet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Amount ({cs})</label>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
              {methods.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">No payment methods available. Contact support.</p>
              ) : (
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {methods.map((m) => (
                    <option key={m.method_key} value={m.method_key}>{m.display_name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {[100, 500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => setTopUpAmount(String(amt))}
                className="px-3 py-1.5 rounded-lg border border-primary/20 text-xs font-medium text-foreground hover:bg-primary/10 transition-colors"
              >
                {cs}{amt}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleTopUp} disabled={methods.length === 0} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              Add Funds
            </button>
            <button onClick={() => setShowTopUp(false)} className="px-4 py-2 rounded-lg border border-primary/20 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {tx.transaction_type === "credit" ? (
                    <ArrowUpCircle className="h-5 w-5 text-success" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{tx.description || (tx.transaction_type === "credit" ? "Top Up" : "Payment")}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                      {tx.payment_method ? ` · ${tx.payment_method}` : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.transaction_type === "credit" ? "text-success" : "text-destructive"}`}>
                  {tx.transaction_type === "credit" ? "+" : "-"}{cs}{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
