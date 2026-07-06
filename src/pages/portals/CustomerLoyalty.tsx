// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Star, Trophy, Gift, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  { name: "Bronze", min: 0, color: "from-amber-600 to-amber-800" },
  { name: "Silver", min: 500, color: "from-gray-400 to-gray-600" },
  { name: "Gold", min: 2000, color: "from-yellow-400 to-amber-500" },
  { name: "Platinum", min: 5000, color: "from-indigo-400 to-purple-500" },
];

export default function CustomerLoyalty() {
  const { user, profile } = useAuth();
  const [points, setPoints] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile?.tenant_id) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("loyalty_points").select("*").eq("user_id", user.id).eq("tenant_id", profile.tenant_id).maybeSingle(),
        supabase.from("loyalty_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setPoints(p);
      setTransactions(t || []);
      setLoading(false);
    })();
  }, [user, profile?.tenant_id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const currentPoints = points?.points || 0;
  const lifetime = points?.lifetime_points || 0;
  const currentTier = [...TIERS].reverse().find(t => lifetime >= t.min) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const progress = nextTier ? ((lifetime - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Loyalty & Rewards</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your points, tier, and rewards</p>
      </div>

      {/* Points & Tier card */}
      <div className={cn("rounded-2xl p-6 bg-gradient-to-br text-white", currentTier.color)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <span className="text-sm font-semibold">{currentTier.name} Member</span>
          </div>
          <Star className="h-6 w-6 opacity-50" />
        </div>
        <p className="text-3xl font-bold mb-1">{currentPoints.toLocaleString()}</p>
        <p className="text-xs opacity-80">Available Points</p>
        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] opacity-80 mb-1">
              <span>{currentTier.name}</span>
              <span>{nextTier.name} ({nextTier.min - lifetime} pts away)</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        )}
        <p className="text-[10px] opacity-60 mt-3">Lifetime: {lifetime.toLocaleString()} points earned</p>
      </div>

      {/* Tier benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TIERS.map(tier => (
          <div key={tier.name} className={cn(
            "p-3 rounded-xl border text-center",
            currentTier.name === tier.name ? "border-primary bg-primary/5" : "border-border bg-card"
          )}>
            <Trophy className={cn("h-5 w-5 mx-auto mb-1", currentTier.name === tier.name ? "text-primary" : "text-muted-foreground")} />
            <p className="text-xs font-semibold text-foreground">{tier.name}</p>
            <p className="text-[10px] text-muted-foreground">{tier.min}+ pts</p>
          </div>
        ))}
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Points History</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Gift className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  tx.transaction_type === "earn" ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-destructive/10"
                )}>
                  {tx.transaction_type === "earn" ? <ArrowUp className="h-4 w-4 text-emerald-500" /> : <ArrowDown className="h-4 w-4 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{tx.description || tx.transaction_type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  tx.transaction_type === "earn" ? "text-emerald-600" : "text-destructive"
                )}>
                  {tx.transaction_type === "earn" ? "+" : "-"}{Math.abs(tx.points)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
