import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";

interface WalletBalanceContextType {
  balance: number | null;
  currency: string;
  walletId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const WalletBalanceContext = createContext<WalletBalanceContextType>({
  balance: null,
  currency: "BDT",
  walletId: null,
  loading: true,
  refresh: async () => {},
});

export function WalletBalanceProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("BDT");
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile?.tenant_id) {
      setBalance(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("company_wallets")
        .select("id, balance, currency")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (data) {
        setBalance(Number((data as any).balance) || 0);
        setCurrency((data as any).currency || "BDT");
        setWalletId((data as any).id);
      } else {
        setBalance(null);
      }
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to realtime changes on company_wallets
  useEffect(() => {
    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel("wallet-balance")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "company_wallets",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          if (payload.new) {
            setBalance(Number((payload.new as any).balance) || 0);
            setCurrency((payload.new as any).currency || "BDT");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id]);

  return (
    <WalletBalanceContext.Provider value={{ balance, currency, walletId, loading, refresh }}>
      {children}
    </WalletBalanceContext.Provider>
  );
}

export const useWalletBalance = () => useContext(WalletBalanceContext);
