
-- Country-specific pricing for subscription plans
CREATE TABLE public.country_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_quarterly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  price_lifetime numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, country_code)
);

-- Country-specific pricing for module addons
CREATE TABLE public.country_addon_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid NOT NULL REFERENCES public.module_addons(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_quarterly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  price_onetime numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(addon_id, country_code)
);

-- Track whether plans/addons use uniform or country-specific pricing
-- We'll store this in platform_settings as 'plan_pricing_mode' and 'addon_pricing_mode'
INSERT INTO public.platform_settings (key, value)
VALUES 
  ('plan_pricing_mode', '"uniform"'),
  ('addon_pricing_mode', '"uniform"')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.country_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_addon_prices ENABLE ROW LEVEL SECURITY;

-- Super admins can manage, everyone can read (for pricing page)
CREATE POLICY "Anyone can read country plan prices" ON public.country_plan_prices FOR SELECT USING (true);
CREATE POLICY "Super admins manage country plan prices" ON public.country_plan_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can read country addon prices" ON public.country_addon_prices FOR SELECT USING (true);
CREATE POLICY "Super admins manage country addon prices" ON public.country_addon_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Indexes
CREATE INDEX idx_country_plan_prices_plan ON public.country_plan_prices(plan_id);
CREATE INDEX idx_country_plan_prices_country ON public.country_plan_prices(country_code);
CREATE INDEX idx_country_addon_prices_addon ON public.country_addon_prices(addon_id);
CREATE INDEX idx_country_addon_prices_country ON public.country_addon_prices(country_code);
