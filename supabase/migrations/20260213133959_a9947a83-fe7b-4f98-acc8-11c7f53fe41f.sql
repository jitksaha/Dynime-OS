
-- Create company_invite_codes table for employees to join companies
CREATE TABLE public.company_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  department text,
  max_uses integer DEFAULT 0, -- 0 = unlimited
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_invite_codes ENABLE ROW LEVEL SECURITY;

-- Company admins can manage codes for their tenant
CREATE POLICY "Company admins can manage invite codes"
ON public.company_invite_codes
FOR ALL
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND has_role(auth.uid(), 'company_admin'::app_role)
);

-- Super admins full access
CREATE POLICY "Super admins full access invite codes"
ON public.company_invite_codes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone authenticated can SELECT to validate a code (needed for join flow)
CREATE POLICY "Authenticated users can read active codes"
ON public.company_invite_codes
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Create a function to join a company via invite code
CREATE OR REPLACE FUNCTION public.join_company_with_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _invite record;
  _existing_tenant uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already belongs to a tenant
  SELECT tenant_id INTO _existing_tenant
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _existing_tenant IS NOT NULL THEN
    RAISE EXCEPTION 'You already belong to a company';
  END IF;

  -- Find and validate the code
  SELECT * INTO _invite
  FROM public.company_invite_codes
  WHERE code = _code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Check expiry
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RAISE EXCEPTION 'This invite code has expired';
  END IF;

  -- Check max uses
  IF _invite.max_uses > 0 AND _invite.used_count >= _invite.max_uses THEN
    RAISE EXCEPTION 'This invite code has reached its usage limit';
  END IF;

  -- Link profile to tenant
  UPDATE public.profiles
  SET tenant_id = _invite.tenant_id,
      onboarding_completed = true,
      department = _invite.department
  WHERE user_id = _user_id;

  -- Assign role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _invite.tenant_id, _invite.role);

  -- Increment used count
  UPDATE public.company_invite_codes
  SET used_count = used_count + 1
  WHERE id = _invite.id;

  RETURN _invite.tenant_id;
END;
$$;
