
-- =====================
-- COUPON SYSTEM
-- =====================

-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  coupon_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_discount_amount numeric DEFAULT NULL, -- cap for percentage coupons
  max_uses integer NOT NULL DEFAULT 0, -- 0 = unlimited
  used_count integer NOT NULL DEFAULT 0,
  per_user_limit integer NOT NULL DEFAULT 1,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_until timestamp with time zone DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  scope text NOT NULL DEFAULT 'platform', -- 'platform' (super admin) or 'company' (tenant)
  tenant_id uuid REFERENCES public.tenants(id) DEFAULT NULL, -- null for platform-level coupons
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_coupons_code_scope ON public.coupons (code, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'));

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Super admins: full access
CREATE POLICY "Super admins full access coupons"
  ON public.coupons FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Company admins: manage their company coupons
CREATE POLICY "Company admins manage company coupons"
  ON public.coupons FOR ALL
  USING (scope = 'company' AND tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

-- Tenant members can view active platform coupons + their company coupons
CREATE POLICY "Users can view applicable coupons"
  ON public.coupons FOR SELECT
  USING (
    (scope = 'platform' AND is_active = true)
    OR (scope = 'company' AND tenant_id = get_user_tenant_id(auth.uid()) AND is_active = true)
  );

-- Coupon redemptions
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) DEFAULT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access redemptions"
  ON public.coupon_redemptions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Company admins view their redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Users can insert redemptions"
  ON public.coupon_redemptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (user_id = auth.uid());

-- =====================
-- WALLET SYSTEM
-- =====================

-- Wallets
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  user_id uuid NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Company admins view tenant wallets"
  ON public.wallets FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Super admins full access wallets"
  ON public.wallets FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  user_id uuid NOT NULL,
  transaction_type text NOT NULL DEFAULT 'credit', -- 'credit' or 'debit'
  amount numeric NOT NULL DEFAULT 0,
  description text DEFAULT NULL,
  reference_id text DEFAULT NULL,
  payment_method text DEFAULT NULL,
  status text NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins view tenant transactions"
  ON public.wallet_transactions FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Super admins full access transactions"
  ON public.wallet_transactions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Tenant payment methods (which payment methods a company has enabled for their customers)
CREATE TABLE public.tenant_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  method_key text NOT NULL, -- 'sslcommerz', 'bank_transfer', etc.
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, method_key)
);

ALTER TABLE public.tenant_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins manage payment methods"
  ON public.tenant_payment_methods FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Tenant members view enabled methods"
  ON public.tenant_payment_methods FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND is_enabled = true);

CREATE POLICY "Super admins full access payment methods"
  ON public.tenant_payment_methods FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenant_payment_methods_updated_at BEFORE UPDATE ON public.tenant_payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
