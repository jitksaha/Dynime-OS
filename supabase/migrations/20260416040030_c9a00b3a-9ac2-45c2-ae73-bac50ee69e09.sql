
CREATE OR REPLACE FUNCTION public.join_company_with_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _invite RECORD;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _invite FROM public.company_invite_codes
  WHERE code = _code AND (max_uses = 0 OR used_count < max_uses)
    AND (expires_at IS NULL OR expires_at > now());
  IF _invite IS NULL THEN RAISE EXCEPTION 'Invalid or expired invite code'; END IF;

  UPDATE public.profiles SET tenant_id = _invite.tenant_id WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _invite.tenant_id, _invite.role)
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;
  UPDATE public.company_invite_codes SET used_count = used_count + 1 WHERE id = _invite.id;

  RETURN _invite.tenant_id;
END;
$$;

-- Also drop the old 2-arg version to avoid ambiguity
DROP FUNCTION IF EXISTS public.join_company_with_code(uuid, text);
