
-- Add country/currency columns to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS currency_symbol text DEFAULT '$';

-- Create complete_onboarding function
CREATE OR REPLACE FUNCTION public.complete_onboarding(
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
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already completed onboarding
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND onboarding_completed = true) THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;

  -- Create tenant
  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  -- Update profile
  UPDATE public.profiles
  SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true
  WHERE user_id = _user_id;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _tenant_id;
END;
$$;

-- Create create_additional_company function
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
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create tenant
  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  -- Switch user to new tenant
  UPDATE public.profiles
  SET tenant_id = _tenant_id, is_owner = true
  WHERE user_id = _user_id;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _tenant_id;
END;
$$;
