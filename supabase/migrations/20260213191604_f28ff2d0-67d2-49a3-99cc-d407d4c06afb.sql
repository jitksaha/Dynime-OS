
-- Wallet fee configuration (managed by super admin)
CREATE TABLE public.wallet_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT NOT NULL UNIQUE, -- 'transfer', 'payment_link', 'payout', 'payment'
  fee_mode TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  fee_value NUMERIC NOT NULL DEFAULT 0,
  min_fee NUMERIC NOT NULL DEFAULT 0,
  max_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_fee_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view fee config" ON public.wallet_fee_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage fee config" ON public.wallet_fee_config
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default fee types
INSERT INTO public.wallet_fee_config (fee_type, fee_mode, fee_value, description) VALUES
  ('transfer', 'percentage', 0, 'Fee for wallet-to-wallet transfers'),
  ('payment_link', 'percentage', 2.5, 'Fee for payment link transactions'),
  ('payout', 'fixed', 25, 'Fee for payout to bank/MFS'),
  ('payment', 'percentage', 1.5, 'Fee for direct payments');

-- Payment links table
CREATE TABLE public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC, -- NULL means custom amount
  amount_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' or 'custom'
  currency TEXT NOT NULL DEFAULT 'BDT',
  link_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'expired'
  expires_at TIMESTAMPTZ,
  total_collected NUMERIC NOT NULL DEFAULT 0,
  payment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage their payment links" ON public.payment_links
  FOR ALL USING (
    (tenant_id = get_user_tenant_id(auth.uid())) AND 
    has_role(auth.uid(), 'company_admin'::app_role)
  );

CREATE POLICY "Tenant members can view payment links" ON public.payment_links
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins full access payment_links" ON public.payment_links
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Payout requests table
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  wallet_id UUID NOT NULL REFERENCES public.company_wallets(id),
  requested_by UUID NOT NULL,
  amount NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payout_method TEXT NOT NULL DEFAULT 'bank', -- 'bank', 'bkash', 'nagad', 'rocket'
  account_details JSONB NOT NULL DEFAULT '{}'::jsonb, -- bank name, acc number, etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'processed'
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage their payout requests" ON public.payout_requests
  FOR ALL USING (
    (tenant_id = get_user_tenant_id(auth.uid())) AND 
    has_role(auth.uid(), 'company_admin'::app_role)
  );

CREATE POLICY "Super admins full access payout_requests" ON public.payout_requests
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Wallet transfers table (internal wallet-to-wallet)
CREATE TABLE public.wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_wallet_id UUID NOT NULL REFERENCES public.company_wallets(id),
  to_wallet_id UUID NOT NULL REFERENCES public.company_wallets(id),
  from_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  to_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  amount NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  initiated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view their transfers" ON public.wallet_transfers
  FOR SELECT USING (
    (from_tenant_id = get_user_tenant_id(auth.uid()) OR to_tenant_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Company admins can insert transfers" ON public.wallet_transfers
  FOR INSERT WITH CHECK (
    from_tenant_id = get_user_tenant_id(auth.uid()) AND 
    has_role(auth.uid(), 'company_admin'::app_role)
  );

CREATE POLICY "Super admins full access wallet_transfers" ON public.wallet_transfers
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add wallet module to tenant_modules if not exists (companies can have it toggled)
-- This is handled by the existing tenant_modules table with module_name = 'wallet'
