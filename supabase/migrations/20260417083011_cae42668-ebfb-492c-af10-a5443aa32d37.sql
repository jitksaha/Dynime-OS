
-- ========== SUBSCRIPTION_PLANS: add missing columns the app expects ==========
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price_lifetime numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_employees integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_invoices integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_deals integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_documents integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_projects integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS limit_reset_cycle text NOT NULL DEFAULT 'billing_cycle';

-- Seed sort_order, lifetime prices and descriptions for the four standard plans
UPDATE public.subscription_plans SET sort_order = 1, description = 'Get started with the basics',           price_lifetime = 0      WHERE slug = 'free'         AND sort_order = 0;
UPDATE public.subscription_plans SET sort_order = 2, description = 'For small teams getting up and running', price_lifetime = 990    WHERE slug = 'starter'      AND sort_order = 0;
UPDATE public.subscription_plans SET sort_order = 3, description = 'For growing businesses',                 price_lifetime = 2490   WHERE slug = 'professional' AND sort_order = 0;
UPDATE public.subscription_plans SET sort_order = 4, description = 'For large organisations',                price_lifetime = 5990   WHERE slug = 'enterprise'   AND sort_order = 0;

-- ========== MODULE_ADDONS: align table with what the app reads/writes ==========
ALTER TABLE public.module_addons
  ADD COLUMN IF NOT EXISTS module_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS price_quarterly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_onetime numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill module_name/display_name from existing key/name (if any rows exist)
UPDATE public.module_addons SET module_name = key WHERE module_name IS NULL AND key IS NOT NULL;
UPDATE public.module_addons SET display_name = name WHERE display_name IS NULL AND name IS NOT NULL;

-- Seed default purchasable add-on modules if table is empty
INSERT INTO public.module_addons (name, key, module_name, display_name, description, price_monthly, price_quarterly, price_yearly, price_onetime, is_active, sort_order)
SELECT * FROM (VALUES
  ('Recruitment',         'recruitment',       'recruitment',       'Recruitment',         'Applicant tracking, job posts and pipelines', 19, 51, 190,  490, true, 1),
  ('Payroll',             'payroll',           'payroll',           'Payroll',             'Run payroll, payslips and statutory reports', 29, 78, 290,  690, true, 2),
  ('Inventory',           'inventory',         'inventory',         'Inventory',           'Stock, warehouses, transfers and adjustments', 19, 51, 190,  490, true, 3),
  ('POS',                 'pos',               'pos',               'POS',                 'Point of sale for retail and counter sales',   29, 78, 290,  690, true, 4),
  ('Helpdesk',            'helpdesk',          'helpdesk',          'Helpdesk',            'Tickets, SLAs and customer support inbox',     19, 51, 190,  490, true, 5),
  ('Knowledge Base',      'knowledge_base',    'knowledge_base',    'Knowledge Base',      'Self-service KB and internal documentation',    9, 24,  90,  290, true, 6),
  ('Marketing Automation','marketing',         'marketing',         'Marketing Automation','Email/SMS campaigns and automations',           29, 78, 290,  690, true, 7),
  ('Project Management',  'projects',          'projects',          'Project Management',  'Tasks, sprints, gantt and time-tracking',      19, 51, 190,  490, true, 8),
  ('Asset Management',    'assets',            'assets',            'Asset Management',    'Track company assets, assignments and warranty',9, 24,  90,  290, true, 9),
  ('Live Chat',           'live_chat',         'live_chat',         'Live Chat',           'Embeddable live chat widget for your site',    19, 51, 190,  490, true,10)
) AS v(name, key, module_name, display_name, description, price_monthly, price_quarterly, price_yearly, price_onetime, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.module_addons);

-- ========== TENANT_SUBSCRIPTIONS: columns the app reads/writes ==========
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_plan_id uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS transaction_id text;

-- ========== TENANT_ADDON_MODULES: columns the app reads/writes ==========
ALTER TABLE public.tenant_addon_modules
  ADD COLUMN IF NOT EXISTS module_name text,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT now();

-- ========== PLATFORM_SETTINGS: trial days, pricing modes, price policy ==========
INSERT INTO public.platform_settings (key, value)
VALUES
  ('trial_days',           '14'::jsonb),
  ('plan_pricing_mode',    '"uniform"'::jsonb),
  ('addon_pricing_mode',   '"uniform"'::jsonb),
  ('price_update_policy',  '"grandfather"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========== complete_onboarding: apply trial_ends_at + selected plan ==========
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _company_name     text,
  _slug             text,
  _industry         text DEFAULT NULL,
  _size             text DEFAULT NULL,
  _country          text DEFAULT 'US',
  _currency         text DEFAULT 'USD',
  _currency_symbol  text DEFAULT '$',
  _plan_slug        text DEFAULT 'free'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id   uuid := auth.uid();
  _tenant_id uuid;
  _trial_days int;
  _trial_ends timestamptz;
  _plan      public.subscription_plans%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND onboarding_completed = true) THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;

  SELECT COALESCE((value)::int, 14) INTO _trial_days
  FROM public.platform_settings WHERE key = 'trial_days';
  IF _trial_days IS NULL THEN _trial_days := 14; END IF;
  _trial_ends := now() + (_trial_days || ' days')::interval;

  SELECT * INTO _plan FROM public.subscription_plans
   WHERE slug = COALESCE(_plan_slug, 'free') AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO _plan FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;

  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol, plan, trial_ends_at)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol,
          COALESCE(_plan.slug, 'free'), _trial_ends)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles
     SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true
   WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

  -- Pre-enable the modules included in the chosen plan
  IF _plan.id IS NOT NULL AND _plan.modules IS NOT NULL THEN
    INSERT INTO public.tenant_modules (tenant_id, module_name, is_enabled)
    SELECT _tenant_id, m::text, true
      FROM jsonb_array_elements_text(_plan.modules) AS m
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _tenant_id;
END;
$function$;

-- Same enhancement for create_additional_company so trial applies there too
CREATE OR REPLACE FUNCTION public.create_additional_company(
  _company_name     text,
  _slug             text,
  _industry         text DEFAULT NULL,
  _size             text DEFAULT NULL,
  _country          text DEFAULT 'US',
  _currency         text DEFAULT 'USD',
  _currency_symbol  text DEFAULT '$',
  _plan_slug        text DEFAULT 'free'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id   uuid := auth.uid();
  _tenant_id uuid;
  _trial_days int;
  _trial_ends timestamptz;
  _plan      public.subscription_plans%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE((value)::int, 14) INTO _trial_days
  FROM public.platform_settings WHERE key = 'trial_days';
  IF _trial_days IS NULL THEN _trial_days := 14; END IF;
  _trial_ends := now() + (_trial_days || ' days')::interval;

  SELECT * INTO _plan FROM public.subscription_plans
   WHERE slug = COALESCE(_plan_slug, 'free') AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO _plan FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;

  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol, plan, trial_ends_at)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol,
          COALESCE(_plan.slug, 'free'), _trial_ends)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

  IF _plan.id IS NOT NULL AND _plan.modules IS NOT NULL THEN
    INSERT INTO public.tenant_modules (tenant_id, module_name, is_enabled)
    SELECT _tenant_id, m::text, true
      FROM jsonb_array_elements_text(_plan.modules) AS m
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _tenant_id;
END;
$function$;
