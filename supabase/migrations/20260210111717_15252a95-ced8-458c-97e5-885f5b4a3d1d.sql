
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users without a tenant can create one" ON public.tenants;

-- Create a security definer function for onboarding
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _company_name text,
  _slug text,
  _industry text DEFAULT NULL,
  _size text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid;
  _existing_tenant_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a tenant
  SELECT tenant_id INTO _existing_tenant_id
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _existing_tenant_id IS NOT NULL THEN
    -- Already has a tenant, just mark onboarding complete
    UPDATE public.profiles
    SET onboarding_completed = true
    WHERE user_id = _user_id;
    RETURN _existing_tenant_id;
  END IF;

  -- Create tenant
  INSERT INTO public.tenants (name, slug, industry, size, plan, trial_ends_at)
  VALUES (_company_name, _slug, _industry, _size, 'starter', now() + interval '14 days')
  RETURNING id INTO _tenant_id;

  -- Link profile
  UPDATE public.profiles
  SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true
  WHERE user_id = _user_id;

  -- Assign company_admin role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'company_admin');

  RETURN _tenant_id;
END;
$$;
