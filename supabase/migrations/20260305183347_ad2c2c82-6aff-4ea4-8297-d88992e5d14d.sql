
-- Change default plan on tenants table from 'starter' to 'free'
ALTER TABLE public.tenants ALTER COLUMN plan SET DEFAULT 'free';

-- Update complete_onboarding (with country params) to use 'free' plan
CREATE OR REPLACE FUNCTION public.complete_onboarding(_company_name text, _slug text, _industry text DEFAULT NULL::text, _size text DEFAULT NULL::text, _country text DEFAULT 'US'::text, _currency text DEFAULT 'USD'::text, _currency_symbol text DEFAULT '$'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid;
  _existing_tenant_id uuid;
  _trial_days int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE((value::text)::int, 14) INTO _trial_days
  FROM public.platform_settings
  WHERE key = 'trial_duration_days';

  IF _trial_days IS NULL THEN
    _trial_days := 14;
  END IF;

  SELECT tenant_id INTO _existing_tenant_id
  FROM public.profiles WHERE user_id = _user_id;

  IF _existing_tenant_id IS NOT NULL THEN
    UPDATE public.profiles SET onboarding_completed = true WHERE user_id = _user_id;
    RETURN _existing_tenant_id;
  END IF;

  INSERT INTO public.tenants (name, slug, industry, size, plan, trial_ends_at, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, 'free', now() + (_trial_days || ' days')::interval, _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'company_admin');

  RETURN _tenant_id;
END;
$function$;

-- Update simpler overload
CREATE OR REPLACE FUNCTION public.complete_onboarding(_company_name text, _slug text, _industry text DEFAULT NULL::text, _size text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid;
  _existing_tenant_id uuid;
  _trial_days int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE((value::text)::int, 14) INTO _trial_days
  FROM public.platform_settings
  WHERE key = 'trial_duration_days';

  IF _trial_days IS NULL THEN
    _trial_days := 14;
  END IF;

  SELECT tenant_id INTO _existing_tenant_id
  FROM public.profiles WHERE user_id = _user_id;

  IF _existing_tenant_id IS NOT NULL THEN
    UPDATE public.profiles SET onboarding_completed = true WHERE user_id = _user_id;
    RETURN _existing_tenant_id;
  END IF;

  INSERT INTO public.tenants (name, slug, industry, size, plan, trial_ends_at)
  VALUES (_company_name, _slug, _industry, _size, 'free', now() + (_trial_days || ' days')::interval)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'company_admin');

  RETURN _tenant_id;
END;
$function$;

-- Update create_additional_company to use 'free' plan
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
