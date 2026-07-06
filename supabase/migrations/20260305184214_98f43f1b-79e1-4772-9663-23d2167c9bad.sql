
-- Add max_companies limit to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_companies integer NOT NULL DEFAULT -1;

-- Update create_additional_company to enforce max_companies limit
CREATE OR REPLACE FUNCTION public.create_additional_company(
  _company_name text,
  _slug text,
  _industry text DEFAULT NULL,
  _size text DEFAULT NULL,
  _country text DEFAULT 'US',
  _currency text DEFAULT 'USD',
  _currency_symbol text DEFAULT '$'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid;
  _trial_days int;
  _current_tenant_id uuid;
  _current_plan text;
  _max_companies int;
  _company_count int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current tenant to check plan limits
  SELECT tenant_id INTO _current_tenant_id
  FROM public.profiles WHERE user_id = _user_id;

  IF _current_tenant_id IS NOT NULL THEN
    SELECT t.plan INTO _current_plan
    FROM public.tenants t WHERE t.id = _current_tenant_id;

    -- Get max_companies from subscription plan
    SELECT sp.max_companies INTO _max_companies
    FROM public.subscription_plans sp WHERE sp.slug = _current_plan;

    -- If no plan found or limit is unlimited (-1), skip check
    IF _max_companies IS NOT NULL AND _max_companies != -1 THEN
      -- Count how many companies this user already has roles in
      SELECT COUNT(DISTINCT ur.tenant_id) INTO _company_count
      FROM public.user_roles ur WHERE ur.user_id = _user_id;

      IF _company_count >= _max_companies THEN
        RAISE EXCEPTION 'Company limit reached. Your plan allows a maximum of % companies. Please upgrade your subscription.', _max_companies;
      END IF;
    END IF;
  END IF;

  SELECT COALESCE((value::text)::int, 14) INTO _trial_days
  FROM public.platform_settings
  WHERE key = 'trial_duration_days';
  IF _trial_days IS NULL THEN _trial_days := 14; END IF;

  INSERT INTO public.tenants (name, slug, industry, size, plan, trial_ends_at, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, 'free', now() + (_trial_days || ' days')::interval, _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles
  SET tenant_id = _tenant_id, onboarding_completed = true
  WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'company_admin');

  RETURN _tenant_id;
END;
$$;
