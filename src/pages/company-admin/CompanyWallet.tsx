// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useKycStatus } from "@/hooks/useKycStatus";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { usePayBrand } from "@/hooks/usePayBrand";
import KycVerificationForm from "@/components/KycVerificationForm";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, History, TrendingUp,
  TrendingDown, DollarSign, Loader2, RefreshCw, Send, Link2, Banknote,
  Plus, Copy, Clock, CheckCircle2, XCircle, Users,
  Sparkles, ArrowRight, Eye, EyeOff, CreditCard,
} from "lucide-react";
import { format } from "date-fns";

type TabType = "overview" | "send" | "payment-links" | "payouts" | "topup";

interface WalletData { id: string; balance: number; currency: string; }
interface Transaction { id: string; transaction_type: string; amount: number; description: string | null; payment_method: string | null; customer_name: string | null; status: string; created_at: string; }
interface PaymentLink { id: string; title: string; description: string | null; amount: number | null; amount_type: string; link_code: string; status: string; total_collected: number; payment_count: number; created_at: string; expires_at: string | null; }
interface PayoutReq { id: string; amount: number; fee_amount: number; net_amount: number; payout_method: string; account_details: any; status: string; created_at: string; }
interface FeeConfig { fee_type: string; fee_mode: string; fee_value: number; min_fee: number; max_fee: number; is_active: boolean; }

export default function CompanyWallet() {
  const { user, profile } = useAuth();
  const { balance: sharedBalance, refresh: refreshSharedBalance } = useWalletBalance();
  const { isVerified, loading: kycLoading } = useKycStatus();
  const { symbol: cs, formatPrice } = useTenantCurrency();
  const { payBrand } = usePayBrand();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<TabType>("overview");
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [payouts, setPayouts] = useState<PayoutReq[]>([]);
  const [fees, setFees] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [stats, setStats] = useState({ totalCredits: 0, totalDebits: 0, txCount: 0 });
  const [showBalance, setShowBalance] = useState(true);

  // Send form
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendDesc, setSendDesc] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMethod, setSendMethod] = useState<"wallet_id" | "email" | "phone">("wallet_id");

  // Payment link form
  const [plTitle, setPlTitle] = useState("");
  const [plAmount, setPlAmount] = useState("");
  const [plType, setPlType] = useState<"fixed" | "custom">("fixed");
  const [plDesc, setPlDesc] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);

  // Payout form
  const [poAmount, setPoAmount] = useState("");
  const [poMethod, setPoMethod] = useState("bank");
  const [poAccName, setPoAccName] = useState("");
  const [poAccNumber, setPoAccNumber] = useState("");
  const [poBankName, setPoBankName] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);

  // Top-up form
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpMethod, setTopUpMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<{ method_key: string; display_name: string }[]>([]);
  const [toppingUp, setToppingUp] = useState(false);

  const fetchAll = async () => {
    if (!user || !profile?.tenant_id) return;
    setLoading(true);

    // Fetch wallet and payment methods in parallel
    const [walletRes, pmRes] = await Promise.all([
      supabase.from("company_wallets").select("id, balance, currency").eq("tenant_id", profile.tenant_id).maybeSingle(),
      supabase.from("payment_gateway_configs").select("gateway_key, display_name").eq("is_enabled", true),
    ]);

    let w = walletRes.data;
    if (!w) {
      const { data: newW } = await supabase
        .from("company_wallets")
        .insert({ tenant_id: profile.tenant_id } as any)
        .select("id, balance, currency")
        .single();
      w = newW;
    }
    setWallet(w as any);

    // Set payment methods immediately
    const methods = (pmRes.data || []).map((g: any) => ({ method_key: g.gateway_key, display_name: g.display_name }));
    setPaymentMethods(methods);
    if (methods.length > 0 && !topUpMethod) setTopUpMethod(methods[0].method_key);

    if (w) {
      const [txRes, plRes, poRes, feeRes] = await Promise.all([
        supabase.from("company_wallet_transactions").select("*").eq("wallet_id", (w as any).id).order("created_at", { ascending: false }).limit(50),
        supabase.from("payment_links").select("*").eq("tenant_id", profile.tenant_id!).order("created_at", { ascending: false }),
        supabase.from("payout_requests").select("*").eq("tenant_id", profile.tenant_id!).order("created_at", { ascending: false }),
        supabase.from("wallet_fee_config").select("*"),
      ]);

      const txList = (txRes.data as any) || [];
      setTransactions(txList);
      setPaymentLinks((plRes.data as any) || []);
      setPayouts((poRes.data as any) || []);
      setFees((feeRes.data as any) || []);

      const credits = txList.filter((t: Transaction) => t.transaction_type === "credit").reduce((s: number, t: Transaction) => s + Number(t.amount), 0);
      const debits = txList.filter((t: Transaction) => t.transaction_type === "debit").reduce((s: number, t: Transaction) => s + Number(t.amount), 0);
      setStats({ totalCredits: credits, totalDebits: debits, txCount: txList.length });
    }

    setLoading(false);
    refreshSharedBalance();
  };

  useEffect(() => { fetchAll(); }, [user, profile?.tenant_id]);

  // Handle payment callback from URL params
  useEffect(() => {
    const topupStatus = searchParams.get("topup");
    const topupAmount = searchParams.get("amount");
    if (topupStatus === "success") {
      toast.success(`${cs}${topupAmount || ""} added to wallet successfully!`);
      fetchAll();
      refreshSharedBalance();
      // Clean URL
      window.history.replaceState({}, "", "/wallet");
    } else if (topupStatus === "failed") {
      toast.error("Top-up payment failed. Please try again.");
      window.history.replaceState({}, "", "/wallet");
    } else if (topupStatus === "cancelled") {
      toast.info("Top-up payment was cancelled.");
      window.history.replaceState({}, "", "/wallet");
    }
  }, [searchParams]);

  const getFee = (type: string) => fees.find((f) => f.fee_type === type);

  const calcFee = (amount: number, feeConfig: FeeConfig | undefined) => {
    if (!feeConfig || !feeConfig.is_active) return 0;
    let fee = feeConfig.fee_mode === "percentage" ? (amount * feeConfig.fee_value) / 100 : feeConfig.fee_value;
    if (feeConfig.min_fee > 0 && fee < feeConfig.min_fee) fee = feeConfig.min_fee;
    if (feeConfig.max_fee > 0 && fee > feeConfig.max_fee) fee = feeConfig.max_fee;
    return Math.round(fee * 100) / 100;
  };

  const handleSend = async () => {
    if (!wallet || !profile?.tenant_id || !user) return;
    const amt = parseFloat(sendAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > (wallet.balance || 0)) { toast.error("Insufficient balance"); return; }
    if (!sendRecipient.trim()) { toast.error("Enter recipient details"); return; }

    setSending(true);
    const transferFee = calcFee(amt, getFee("transfer"));

    const { data: recipientWallet } = await supabase
      .from("company_wallets")
      .select("id, tenant_id")
      .neq("tenant_id", profile.tenant_id)
      .limit(1)
      .maybeSingle();

    if (!recipientWallet) {
      toast.error("Recipient wallet not found");
      setSending(false);
      return;
    }

    const { error: transferErr } = await supabase.from("wallet_transfers").insert({
      from_wallet_id: wallet.id,
      to_wallet_id: (recipientWallet as any).id,
      from_tenant_id: profile.tenant_id,
      to_tenant_id: (recipientWallet as any).tenant_id,
      amount: amt,
      fee_amount: transferFee,
      net_amount: amt - transferFee,
      description: sendDesc || `Transfer to ${sendRecipient}`,
      initiated_by: user.id,
    } as any);

    if (transferErr) {
      toast.error(transferErr.message);
    } else {
      await supabase.from("company_wallet_transactions").insert({
        wallet_id: wallet.id,
        tenant_id: profile.tenant_id,
        transaction_type: "debit",
        amount: amt + transferFee,
        description: `Transfer to ${sendRecipient}${transferFee > 0 ? ` (fee: ${cs}${transferFee})` : ""}`,
        payment_method: "wallet_transfer",
        status: "completed",
      } as any);

      toast.success(`${cs}${amt.toLocaleString()} sent successfully`);
      setSendRecipient(""); setSendAmount(""); setSendDesc("");
      fetchAll();
    }
    setSending(false);
  };

  const handleCreateLink = async () => {
    if (!profile?.tenant_id || !user) return;
    if (!plTitle.trim()) { toast.error("Title is required"); return; }
    if (plType === "fixed" && (!plAmount || parseFloat(plAmount) <= 0)) { toast.error("Enter a valid amount"); return; }

    setCreatingLink(true);
    const code = `PL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { error } = await supabase.from("payment_links").insert({
      tenant_id: profile.tenant_id,
      created_by: user.id,
      title: plTitle,
      description: plDesc || null,
      amount: plType === "fixed" ? parseFloat(plAmount) : null,
      amount_type: plType,
      link_code: code,
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Payment link created!");
      setPlTitle(""); setPlAmount(""); setPlDesc("");
      fetchAll();
    }
    setCreatingLink(false);
  };

  const handlePayout = async () => {
    if (!wallet || !profile?.tenant_id || !user) return;
    const amt = parseFloat(poAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > (wallet.balance || 0)) { toast.error("Insufficient balance"); return; }
    if (!poAccNumber.trim()) { toast.error("Enter account details"); return; }

    setRequestingPayout(true);
    const payoutFee = calcFee(amt, getFee("payout"));

    const { error } = await supabase.from("payout_requests").insert({
      tenant_id: profile.tenant_id,
      wallet_id: wallet.id,
      requested_by: user.id,
      amount: amt,
      fee_amount: payoutFee,
      net_amount: amt - payoutFee,
      payout_method: poMethod,
      account_details: {
        account_name: poAccName,
        account_number: poAccNumber,
        bank_name: poBankName,
        phone: poMethod !== "bank" ? poAccNumber : undefined,
      },
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Payout request submitted for approval");
      setPoAmount(""); setPoAccName(""); setPoAccNumber(""); setPoBankName("");
      fetchAll();
    }
    setRequestingPayout(false);
  };

  const handleTopUp = async () => {
    if (!wallet || !profile?.tenant_id || !user) return;
    const amt = parseFloat(topUpAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!topUpMethod) { toast.error("Select a payment method"); return; }

    setToppingUp(true);

    try {
      const { data, error } = await supabase.functions.invoke("payment-initiate", {
        body: {
          gateway: topUpMethod,
          purpose: "wallet_topup",
          amount: amt,
          wallet_id: wallet.id,
          tenant_id: profile.tenant_id,
        },
      });

      if (error) {
        toast.error(error.message || "Failed to initiate payment");
        setToppingUp(false);
        return;
      }

      if (data?.url) {
        // Redirect to payment gateway
        toast.info("Redirecting to payment gateway...");
        window.location.href = data.url;
      } else {
        toast.error(data?.error || "Failed to create payment session");
      }
    } catch (err: any) {
      toast.error(err.message || "Payment initiation failed");
    }
    setToppingUp(false);
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/${code}`);
    toast.success("Payment link copied!");
  };

  const filteredTxns = filter === "all" ? transactions : transactions.filter((t) => t.transaction_type === filter);

  if (loading || kycLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="relative">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary absolute -bottom-1 -right-1" />
        </div>
        <p className="text-sm text-muted-foreground">Loading {payBrand}...</p>
      </div>
    );
  }

  // KYC Gate
  if (!isVerified) {
    return <KycVerificationForm />;
  }

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Wallet },
    { id: "topup", label: "Top Up", icon: CreditCard },
    { id: "send", label: "Send & Receive", icon: Send },
    { id: "payment-links", label: "Payment Links", icon: Link2 },
    { id: "payouts", label: "Payouts", icon: Banknote },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{payBrand}</h1>
            <p className="text-xs text-muted-foreground">Manage payments, transfers & payouts</p>
          </div>
        </div>
        <button onClick={fetchAll} className="p-2.5 rounded-xl border border-border hover:bg-primary/10 text-primary transition-all hover:scale-105">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Hero Balance Card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjwvc3ZnPg==')] opacity-60" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -left-4 -bottom-10 h-32 w-32 rounded-full bg-white/5 blur-xl" />
        
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 opacity-70" />
              <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Total Balance</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {showBalance ? `${cs}${wallet?.balance?.toLocaleString() || "0"}` : `${cs} ••••••`}
              </p>
              <button onClick={() => setShowBalance(!showBalance)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs opacity-60 mt-2 font-medium">{wallet?.currency || "BDT"} · Updated just now</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Wallet className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="relative flex gap-2 mt-6 flex-wrap">
          <button onClick={() => setTab("topup")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-sm font-medium transition-all border border-white/10">
            <CreditCard className="h-3.5 w-3.5" /> Top Up
          </button>
          <button onClick={() => setTab("send")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-sm font-medium transition-all border border-white/10">
            <Send className="h-3.5 w-3.5" /> Send
          </button>
          <button onClick={() => setTab("payment-links")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-sm font-medium transition-all border border-white/10">
            <Link2 className="h-3.5 w-3.5" /> Payment Link
          </button>
          <button onClick={() => setTab("payouts")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-sm font-medium transition-all border border-white/10">
            <Banknote className="h-3.5 w-3.5" /> Payout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success/10 group-hover:bg-success/15 transition-colors">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Received</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{cs}{stats.totalCredits.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10 group-hover:bg-destructive/15 transition-colors">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Paid Out</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{cs}{stats.totalDebits.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Transactions</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{stats.txCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <History className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-sm font-bold text-foreground">Transaction History</h2>
              </div>
              <div className="flex gap-0.5 bg-primary/5 rounded-lg p-0.5 border border-primary/10">
                {(["all", "credit", "debit"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-primary/10"}`}>
                    {f === "all" ? "All" : f === "credit" ? "Received" : "Sent"}
                  </button>
                ))}
              </div>
            </div>

            {filteredTxns.length === 0 ? (
              <div className="text-center py-14">
                <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                  <Wallet className="h-7 w-7 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Your transactions will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTxns.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-primary/5 transition-colors">
                    <div className="flex items-center gap-3">
                      {tx.transaction_type === "credit" ? (
                        <div className="p-2 rounded-xl bg-success/10"><ArrowUpCircle className="h-4 w-4 text-success" /></div>
                      ) : (
                        <div className="p-2 rounded-xl bg-destructive/10"><ArrowDownCircle className="h-4 w-4 text-destructive" /></div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{tx.description || (tx.transaction_type === "credit" ? "Payment Received" : "Payment Sent")}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}</span>
                          {tx.customer_name && <><span>·</span><span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tx.customer_name}</span></>}
                          {tx.payment_method && <><span>·</span><span>{tx.payment_method}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${tx.transaction_type === "credit" ? "text-success" : "text-destructive"}`}>
                        {tx.transaction_type === "credit" ? "+" : "-"}{cs}{Number(tx.amount).toLocaleString()}
                      </span>
                      <p className={`text-[10px] font-semibold mt-0.5 ${tx.status === "completed" ? "text-success" : tx.status === "pending" ? "text-warning" : "text-destructive"}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send & Receive Tab */}
      {tab === "send" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Send className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Send Money</h3>
                <p className="text-xs text-muted-foreground">Transfer funds instantly</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Send To</label>
              <div className="flex gap-1 bg-primary/5 rounded-lg p-0.5 w-fit mb-3 border border-primary/10">
                {(["wallet_id", "email", "phone"] as const).map((m) => (
                  <button key={m} onClick={() => setSendMethod(m)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${sendMethod === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-primary/10"}`}>
                    {m === "wallet_id" ? "Wallet ID" : m === "email" ? "Email" : "Phone"}
                  </button>
                ))}
              </div>
              <input
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                placeholder={sendMethod === "wallet_id" ? "Enter wallet ID" : sendMethod === "email" ? "Enter email address" : "Enter phone number"}
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Amount ({cs})</label>
              <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              {sendAmount && parseFloat(sendAmount) > 0 && (
                <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-foreground font-medium">
                    Fee: {cs}{calcFee(parseFloat(sendAmount), getFee("transfer")).toLocaleString()} · 
                    Total: {cs}{(parseFloat(sendAmount) + calcFee(parseFloat(sendAmount), getFee("transfer"))).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Description (optional)</label>
              <input value={sendDesc} onChange={(e) => setSendDesc(e.target.value)} placeholder="What's this for?" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
            </div>
            <button onClick={handleSend} disabled={sending} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send Money <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15">
                <ArrowUpCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Receive Money</h3>
                <p className="text-xs text-muted-foreground">Share your wallet details</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Share your wallet ID, email, or phone number with others to receive payments directly.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Your Wallet ID</label>
                <div className="flex items-center gap-2 bg-card rounded-xl p-3.5 border border-border">
                  <code className="text-xs font-mono text-foreground flex-1 truncate select-all">{wallet?.id ? `${wallet.id.slice(0, 8)}...${wallet.id.slice(-4)}` : "—"}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(wallet?.id || ""); toast.success("Wallet ID copied!"); }}
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-105"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Receivable Email</label>
                <div className="flex items-center gap-2 bg-card rounded-xl p-3.5 border border-border">
                  <span className="text-xs text-foreground flex-1 truncate select-all">{user?.email || "—"}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(user?.email || ""); toast.success("Email copied!"); }}
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-105"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Receivable Mobile</label>
                <div className="flex items-center gap-2 bg-card rounded-xl p-3.5 border border-border">
                  <span className="text-xs text-foreground flex-1 truncate select-all">{user?.phone || profile?.full_name ? (user?.phone || "Not set") : "Not set"}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(user?.phone || ""); toast.success("Phone copied!"); }}
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-105"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/15">
              <p className="text-xs text-foreground font-medium flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Pro tip: Create a payment link for easier collection
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Links Tab */}
      {tab === "payment-links" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Create Payment Link</h3>
                <p className="text-xs text-muted-foreground">Generate shareable payment links</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Title</label>
                <input value={plTitle} onChange={(e) => setPlTitle(e.target.value)} placeholder="e.g. Invoice #123" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Amount Type</label>
                <div className="flex gap-1 bg-primary/5 rounded-lg p-0.5 border border-primary/10">
                  <button onClick={() => setPlType("fixed")} className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${plType === "fixed" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/10"}`}>Fixed</button>
                  <button onClick={() => setPlType("custom")} className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${plType === "custom" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/10"}`}>Custom</button>
                </div>
              </div>
            </div>
            {plType === "fixed" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Amount ({cs})</label>
                <input type="number" value={plAmount} onChange={(e) => setPlAmount(e.target.value)} placeholder="0.00" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Description (optional)</label>
              <input value={plDesc} onChange={(e) => setPlDesc(e.target.value)} placeholder="Payment details" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
            </div>
            <button onClick={handleCreateLink} disabled={creatingLink} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20">
              {creatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2 className="h-4 w-4" /> Create Link</>}
            </button>
          </div>

          {paymentLinks.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" /> Your Payment Links
                </h3>
              </div>
              <div className="divide-y divide-border">
                {paymentLinks.map((pl) => (
                  <div key={pl.id} className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{pl.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{pl.amount_type === "fixed" ? `${cs}${Number(pl.amount).toLocaleString()}` : "Custom amount"}</span>
                        <span className="text-primary/30">·</span>
                        <span>{pl.payment_count} payments</span>
                        <span className="text-primary/30">·</span>
                        <span className="font-medium text-primary">{cs}{Number(pl.total_collected).toLocaleString()} collected</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${pl.status === "active" ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"}`}>{pl.status}</span>
                      <button onClick={() => copyLink(pl.link_code)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-all hover:scale-105"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payouts Tab */}
      {tab === "payouts" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Banknote className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Request Payout</h3>
                <p className="text-xs text-muted-foreground">Withdraw to your bank or mobile wallet</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Amount ({cs})</label>
              <input type="number" value={poAmount} onChange={(e) => setPoAmount(e.target.value)} placeholder="0.00" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              {poAmount && parseFloat(poAmount) > 0 && (
                <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-foreground font-medium">
                    Fee: {cs}{calcFee(parseFloat(poAmount), getFee("payout")).toLocaleString()} · 
                    You'll receive: <span className="text-primary font-bold">{cs}{(parseFloat(poAmount) - calcFee(parseFloat(poAmount), getFee("payout"))).toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Payout Method</label>
              <div className="flex gap-1 bg-primary/5 rounded-xl p-0.5 w-fit border border-primary/10">
                {["bank", "bkash", "nagad", "rocket"].map((m) => (
                  <button key={m} onClick={() => setPoMethod(m)} className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${poMethod === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/10"}`}>{m}</button>
                ))}
              </div>
            </div>
            {poMethod === "bank" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Bank Name</label>
                <input value={poBankName} onChange={(e) => setPoBankName(e.target.value)} placeholder="e.g. Dutch Bangla Bank" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">{poMethod === "bank" ? "Account Number" : "Phone Number"}</label>
                <input value={poAccNumber} onChange={(e) => setPoAccNumber(e.target.value)} placeholder={poMethod === "bank" ? "Account number" : "01XXXXXXXXX"} className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Account Holder Name</label>
                <input value={poAccName} onChange={(e) => setPoAccName(e.target.value)} placeholder="Full name" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            </div>
            <button onClick={handlePayout} disabled={requestingPayout} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20">
              {requestingPayout ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Banknote className="h-4 w-4" /> Submit Payout Request</>}
            </button>
          </div>

          {payouts.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Payout History
                </h3>
              </div>
              <div className="divide-y divide-border">
                {payouts.map((po) => (
                  <div key={po.id} className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{cs}{Number(po.amount).toLocaleString()} via <span className="capitalize">{po.payout_method}</span></p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{format(new Date(po.created_at), "MMM d, yyyy")}</span>
                        <span className="text-primary/30">·</span>
                        <span>Fee: {cs}{Number(po.fee_amount).toLocaleString()}</span>
                        <span className="text-primary/30">·</span>
                        <span className="font-medium">Net: {cs}{Number(po.net_amount).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      po.status === "pending" ? "bg-warning/10 text-warning" :
                      po.status === "approved" ? "bg-success/10 text-success" :
                      po.status === "processed" ? "bg-primary/10 text-primary" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {po.status === "pending" ? <Clock className="h-3 w-3" /> :
                       po.status === "approved" ? <CheckCircle2 className="h-3 w-3" /> :
                       <XCircle className="h-3 w-3" />}
                      {po.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Up Tab */}
      {tab === "topup" && (
        <div className="max-w-lg space-y-5">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Top Up Wallet</h3>
                <p className="text-xs text-muted-foreground">Add funds using a payment gateway</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Amount ({cs})</label>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 flex-wrap">
              {[500, 1000, 2000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopUpAmount(String(amt))}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all hover:scale-105 ${
                    topUpAmount === String(amt)
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "border-primary/20 text-foreground hover:bg-primary/10"
                  }`}
                >
                  {cs}{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Payment Method</label>
              {paymentMethods.length === 0 ? (
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                  <CreditCard className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No payment methods enabled. Ask your admin to configure payment gateways in Wallet Settings.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.method_key}
                      onClick={() => setTopUpMethod(m.method_key)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                        topUpMethod === m.method_key
                          ? "bg-primary/10 border-primary/40 shadow-sm"
                          : "border-border hover:border-primary/20 hover:bg-primary/5"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${topUpMethod === m.method_key ? "bg-primary/15" : "bg-muted/50"}`}>
                        <CreditCard className={`h-4 w-4 ${topUpMethod === m.method_key ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-sm font-semibold ${topUpMethod === m.method_key ? "text-primary" : "text-foreground"}`}>
                        {m.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {topUpAmount && parseFloat(topUpAmount) > 0 && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{cs}{parseFloat(topUpAmount).toLocaleString()}</span>
                </div>
                {calcFee(parseFloat(topUpAmount), getFee("topup")) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="font-medium text-foreground">{cs}{calcFee(parseFloat(topUpAmount), getFee("topup")).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-primary/10">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary">{cs}{(parseFloat(topUpAmount) + calcFee(parseFloat(topUpAmount), getFee("topup"))).toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleTopUp}
              disabled={toppingUp || paymentMethods.length === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
            >
              {toppingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CreditCard className="h-4 w-4" /> Add Funds <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
