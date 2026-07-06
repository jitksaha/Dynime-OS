import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";

export interface CompanyInfo {
  company_name: string;
  registered_name: string;
  registration_number: string;
  registration_country: string;
  address: string;
  support_email: string;
  website: string;
}

const defaultCompanyInfo: CompanyInfo = {
  company_name: "Dynime OS",
  registered_name: "Dynime LLC",
  registration_number: "",
  registration_country: "England and Wales",
  address: "",
  support_email: "support@dynime.com",
  website: "",
};

const CompanyInfoContext = createContext<{ companyInfo: CompanyInfo; loading: boolean; refetch: () => void }>({
  companyInfo: defaultCompanyInfo,
  loading: true,
  refetch: () => {},
});

export function CompanyInfoProvider({ children }: { children: ReactNode }) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [loading, setLoading] = useState(true);

  const fetchCompanyInfo = useCallback(async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "company_info")
      .maybeSingle();

    if (data?.value) {
      setCompanyInfo({ ...defaultCompanyInfo, ...(data.value as any) });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanyInfo();
  }, [fetchCompanyInfo]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("company-info-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_settings",
          filter: "key=eq.company_info",
        },
        (payload) => {
          const newVal = (payload.new as any)?.value;
          if (newVal) {
            setCompanyInfo({ ...defaultCompanyInfo, ...newVal });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <CompanyInfoContext.Provider value={{ companyInfo, loading, refetch: fetchCompanyInfo }}>
      {children}
    </CompanyInfoContext.Provider>
  );
}

export function useCompanyInfo() {
  return useContext(CompanyInfoContext);
}
