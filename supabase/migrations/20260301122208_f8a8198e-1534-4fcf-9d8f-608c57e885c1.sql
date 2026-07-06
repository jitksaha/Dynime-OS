
-- SMS pricing set by super admin (per-SMS fee + bundles)
CREATE TABLE public.sms_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_type TEXT NOT NULL DEFAULT 'per_sms' CHECK (pricing_type IN ('per_sms', 'bundle')),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,4) NOT NULL DEFAULT 0,
  sms_count INT NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage SMS pricing"
  ON public.sms_pricing FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view active SMS pricing"
  ON public.sms_pricing FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Tenant SMS credit balances
CREATE TABLE public.tenant_sms_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sms_credits INT NOT NULL DEFAULT 0,
  total_purchased INT NOT NULL DEFAULT 0,
  total_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_sms_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view own SMS balance"
  ON public.tenant_sms_balances FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can manage all SMS balances"
  ON public.tenant_sms_balances FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- SMS balance transactions (top-ups and usage)
CREATE TABLE public.sms_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'usage', 'refund', 'admin_adjustment')),
  sms_count INT NOT NULL,
  amount NUMERIC(10,4) DEFAULT 0,
  pricing_id UUID REFERENCES public.sms_pricing(id),
  description TEXT,
  reference_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_balance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view own SMS transactions"
  ON public.sms_balance_transactions FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can manage all SMS transactions"
  ON public.sms_balance_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Tenant SMS gateway configs (own credentials)
CREATE TABLE public.tenant_sms_gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  use_own_gateway BOOLEAN NOT NULL DEFAULT false,
  gateway_key TEXT,
  api_url TEXT,
  credentials JSONB DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_sms_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage own SMS gateway config"
  ON public.tenant_sms_gateway_configs FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can view all tenant SMS configs"
  ON public.tenant_sms_gateway_configs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to deduct SMS credits
CREATE OR REPLACE FUNCTION public.deduct_sms_credit(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _balance INT;
BEGIN
  SELECT sms_credits INTO _balance
  FROM public.tenant_sms_balances
  WHERE tenant_id = _tenant_id
  FOR UPDATE;

  IF _balance IS NULL OR _balance < 1 THEN
    RETURN false;
  END IF;

  UPDATE public.tenant_sms_balances
  SET sms_credits = sms_credits - 1,
      total_used = total_used + 1,
      updated_at = now()
  WHERE tenant_id = _tenant_id;

  INSERT INTO public.sms_balance_transactions (tenant_id, transaction_type, sms_count, description)
  VALUES (_tenant_id, 'usage', 1, 'SMS sent via shared gateway');

  RETURN true;
END;
$$;

-- Function to add SMS credits (for top-ups)
CREATE OR REPLACE FUNCTION public.add_sms_credits(_tenant_id uuid, _count int, _amount numeric, _pricing_id uuid DEFAULT NULL, _description text DEFAULT 'SMS credit top-up')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.tenant_sms_balances (tenant_id, sms_credits, total_purchased)
  VALUES (_tenant_id, _count, _count)
  ON CONFLICT (tenant_id) DO UPDATE
  SET sms_credits = tenant_sms_balances.sms_credits + _count,
      total_purchased = tenant_sms_balances.total_purchased + _count,
      updated_at = now();

  INSERT INTO public.sms_balance_transactions (tenant_id, transaction_type, sms_count, amount, pricing_id, description)
  VALUES (_tenant_id, 'topup', _count, _amount, _pricing_id, _description);

  RETURN true;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_sms_pricing_updated_at
  BEFORE UPDATE ON public.sms_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_sms_balances_updated_at
  BEFORE UPDATE ON public.tenant_sms_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_sms_gateway_configs_updated_at
  BEFORE UPDATE ON public.tenant_sms_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
