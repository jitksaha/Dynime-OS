
-- Affiliate/Referral System Tables

-- Referral codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  commission_type TEXT NOT NULL DEFAULT 'free_month' CHECK (commission_type IN ('free_month', 'percentage')),
  commission_percentage NUMERIC DEFAULT 10 CHECK (commission_percentage >= 0 AND commission_percentage <= 50),
  total_referrals INT DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral tracking table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE CASCADE NOT NULL,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referred_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rewarded', 'expired', 'cancelled')),
  reward_type TEXT DEFAULT 'free_month' CHECK (reward_type IN ('free_month', 'commission')),
  reward_amount NUMERIC DEFAULT 0,
  referrer_rewarded BOOLEAN DEFAULT false,
  referred_rewarded BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral earnings/commissions log
CREATE TABLE public.referral_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE NOT NULL,
  referrer_user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('free_month', 'commission')),
  amount NUMERIC NOT NULL DEFAULT 0,
  source_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral program settings (per tenant)
CREATE TABLE public.referral_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  program_enabled BOOLEAN DEFAULT true,
  default_reward_type TEXT DEFAULT 'free_month' CHECK (default_reward_type IN ('free_month', 'percentage', 'both')),
  commission_percentage NUMERIC DEFAULT 10 CHECK (commission_percentage >= 0 AND commission_percentage <= 50),
  free_month_for_referrer BOOLEAN DEFAULT true,
  free_month_for_referred BOOLEAN DEFAULT true,
  min_subscription_months INT DEFAULT 1,
  max_referrals_per_user INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

-- Referral codes policies
CREATE POLICY "Users can view their own referral codes"
ON public.referral_codes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own referral codes"
ON public.referral_codes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own referral codes"
ON public.referral_codes FOR UPDATE
USING (user_id = auth.uid());

-- Company admins can see all codes in their tenant
CREATE POLICY "Company admins can view tenant referral codes"
ON public.referral_codes FOR SELECT
USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

-- Referrals policies
CREATE POLICY "Referrers can view their referrals"
ON public.referrals FOR SELECT
USING (referrer_user_id = auth.uid());

CREATE POLICY "Referred users can view their referral"
ON public.referrals FOR SELECT
USING (referred_user_id = auth.uid());

CREATE POLICY "Authenticated users can create referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update referrals"
ON public.referrals FOR UPDATE
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

-- Referral earnings policies
CREATE POLICY "Users can view their own earnings"
ON public.referral_earnings FOR SELECT
USING (referrer_user_id = auth.uid());

CREATE POLICY "Company admins can view tenant earnings"
ON public.referral_earnings FOR SELECT
USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

-- Referral settings policies
CREATE POLICY "Anyone can view referral settings"
ON public.referral_settings FOR SELECT
USING (true);

CREATE POLICY "Company admins can manage referral settings"
ON public.referral_settings FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Company admins can update referral settings"
ON public.referral_settings FOR UPDATE
USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

-- Super admin policies
CREATE POLICY "Super admins can view all referral codes"
ON public.referral_codes FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all referrals"
ON public.referrals FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all earnings"
ON public.referral_earnings FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all settings"
ON public.referral_settings FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Triggers for updated_at
CREATE TRIGGER update_referral_codes_updated_at
BEFORE UPDATE ON public.referral_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_settings_updated_at
BEFORE UPDATE ON public.referral_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
