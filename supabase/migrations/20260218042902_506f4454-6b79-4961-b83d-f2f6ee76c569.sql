
-- Store integration configurations (WooCommerce, Shopify)
CREATE TABLE public.pdm_store_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  platform TEXT NOT NULL, -- 'woocommerce' or 'shopify'
  store_name TEXT NOT NULL,
  store_url TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_products BOOLEAN NOT NULL DEFAULT true,
  sync_orders BOOLEAN NOT NULL DEFAULT true,
  sync_customers BOOLEAN NOT NULL DEFAULT true,
  sync_categories BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'idle', -- idle, syncing, success, failed
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdm_store_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage store integrations"
ON public.pdm_store_integrations FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Tenant members can view store integrations"
ON public.pdm_store_integrations FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Sync logs for tracking history
CREATE TABLE public.pdm_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  integration_id UUID NOT NULL REFERENCES public.pdm_store_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'full', -- full, products, orders, customers, categories
  direction TEXT NOT NULL DEFAULT 'both', -- import, export, both
  status TEXT NOT NULL DEFAULT 'running', -- running, success, failed
  items_synced INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view sync logs"
ON public.pdm_sync_logs FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins can manage sync logs"
ON public.pdm_sync_logs FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

-- Add external_id columns to products and orders for mapping
ALTER TABLE public.pdm_products ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.pdm_products ADD COLUMN IF NOT EXISTS external_platform TEXT;
ALTER TABLE public.pdm_products ADD COLUMN IF NOT EXISTS external_url TEXT;

ALTER TABLE public.pdm_orders ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.pdm_orders ADD COLUMN IF NOT EXISTS external_platform TEXT;

-- Trigger for updated_at
CREATE TRIGGER update_pdm_store_integrations_updated_at
BEFORE UPDATE ON public.pdm_store_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
