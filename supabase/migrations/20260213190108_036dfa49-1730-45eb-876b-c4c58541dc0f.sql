
-- Create platform_payment_methods table to track admin-configured payment sources
CREATE TABLE public.platform_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_payment_methods ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can view platform payment methods"
ON public.platform_payment_methods FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only super admins can manage
CREATE POLICY "Super admins can manage platform payment methods"
ON public.platform_payment_methods FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default methods
INSERT INTO public.platform_payment_methods (method_key, display_name, description, is_enabled) VALUES
  ('sslcommerz', 'SSLCommerz', 'Online payment via SSLCommerz gateway', false),
  ('bank_transfer', 'Bank Transfer', 'Manual bank transfer payments', false),
  ('cash', 'Cash Payment', 'Cash on delivery or in-person', false),
  ('bkash', 'bKash', 'Mobile payment via bKash', false),
  ('nagad', 'Nagad', 'Mobile payment via Nagad', false);

-- Company wallet for collecting payments
CREATE TABLE public.company_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view their wallet"
ON public.company_wallets FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Company admins can update their wallet"
ON public.company_wallets FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "System can insert company wallets"
ON public.company_wallets FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins full access company_wallets"
ON public.company_wallets FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Company wallet transactions
CREATE TABLE public.company_wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  wallet_id UUID NOT NULL REFERENCES public.company_wallets(id),
  transaction_type TEXT NOT NULL DEFAULT 'credit',
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  payment_method TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view their transactions"
ON public.company_wallet_transactions FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Tenant members can insert transactions"
ON public.company_wallet_transactions FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins full access company_wallet_transactions"
ON public.company_wallet_transactions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));
