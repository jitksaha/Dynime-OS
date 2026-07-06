
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
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get dynamic trial duration
  SELECT COALESCE((value::text)::int, 14) INTO _trial_days
  FROM public.platform_settings
  WHERE key = 'trial_duration_days';
  IF _trial_days IS NULL THEN _trial_days := 14; END IF;

  -- Always create a new tenant
  INSERT INTO public.tenants (name, slug, industry, size, plan, trial_ends_at, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, 'starter', now() + (_trial_days || ' days')::interval, _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  -- Switch user to new tenant
  UPDATE public.profiles
  SET tenant_id = _tenant_id, onboarding_completed = true
  WHERE user_id = _user_id;

  -- Assign company_admin role for new tenant
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'company_admin');

  RETURN _tenant_id;
END;
$$;
