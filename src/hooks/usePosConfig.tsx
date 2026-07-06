// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";

export interface PosConfig {
  id: string;
  tenant_id: string;
  business_type: string;
  business_type_label: string;
  features: Record<string, any>;
  settings: Record<string, any>;
  setup_completed: boolean;
}

export const POS_BUSINESS_TYPES = [
  {
    key: "retail",
    label: "Retail & E-commerce",
    icon: "🏪",
    description: "Physical or online product sales with full inventory management, barcode scanning, and stock tracking.",
    features: ["inventory", "barcode", "stock_alerts", "product_variants", "bulk_import", "e_commerce_sync"],
    color: "from-blue-500/20 to-blue-600/10",
    free: false,
  },
  {
    key: "restaurant",
    label: "Restaurant & F&B",
    icon: "🍽️",
    description: "Table management, kitchen display, modifiers & add-ons, split bills, and tip management.",
    features: ["tables", "kitchen_display", "modifiers", "split_bill", "tips", "recipe_costing"],
    color: "from-orange-500/20 to-orange-600/10",
    free: false,
  },
  {
    key: "services",
    label: "Services & Bookings",
    icon: "📅",
    description: "Appointment scheduling, service-based billing, customer history, and staff scheduling.",
    features: ["appointments", "service_catalog", "staff_scheduling", "recurring_bookings", "customer_history"],
    color: "from-purple-500/20 to-purple-600/10",
    free: false,
  },
  {
    key: "invoice_builder",
    label: "Invoice Builder",
    icon: "🧾",
    description: "Create and send professional invoices instantly — no inventory needed. Perfect for freelancers and service providers.",
    features: ["invoice_create", "client_management", "payment_tracking", "pdf_export", "recurring_invoices", "share_link"],
    color: "from-emerald-500/20 to-emerald-600/10",
    free: true,
  },
  {
    key: "general",
    label: "General Purpose",
    icon: "⚡",
    description: "Flexible POS for any business type — customize features as you grow.",
    features: ["inventory", "barcode", "product_variants", "appointments", "modifiers"],
    color: "from-emerald-500/20 to-emerald-600/10",
    free: false,
  },
] as const;

export function usePosConfig() {
  const { tenantId } = useTenant();
  const [config, setConfig] = useState<PosConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("pos_configurations")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    setConfig(data as PosConfig | null);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const setupPOS = async (businessType: string, businessTypeLabel: string) => {
    if (!tenantId) return null;
    const typeConfig = POS_BUSINESS_TYPES.find(t => t.key === businessType);
    const features: Record<string, boolean> = {};
    typeConfig?.features.forEach(f => { features[f] = true; });

    const { data, error } = await supabase
      .from("pos_configurations")
      .upsert({
        tenant_id: tenantId,
        business_type: businessType,
        business_type_label: businessTypeLabel,
        features,
        settings: {},
        setup_completed: true,
      }, { onConflict: "tenant_id" })
      .select()
      .single();

    if (error) throw error;
    setConfig(data as PosConfig);
    return data;
  };

  return {
    config,
    loading,
    isSetup: config?.setup_completed ?? false,
    businessType: config?.business_type ?? null,
    features: (config?.features ?? {}) as Record<string, boolean>,
    setupPOS,
    refetch: fetchConfig,
  };
}
