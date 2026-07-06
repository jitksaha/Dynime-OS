
-- 1. Fix user_roles unique constraint to support multi-tenant
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_tenant_id_role_key UNIQUE (user_id, tenant_id, role);

-- 2. Update complete_onboarding to use new constraint
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
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND onboarding_completed = true) THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;

  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

  RETURN _tenant_id;
END;
$$;

-- 3. Update create_additional_company
CREATE OR REPLACE FUNCTION public.create_additional_company(
  _company_name text, _slug text, _industry text DEFAULT NULL, _size text DEFAULT NULL,
  _country text DEFAULT 'US', _currency text DEFAULT 'USD', _currency_symbol text DEFAULT '$'
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
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

  RETURN _tenant_id;
END;
$$;

-- 4. Update join_company_with_code for new constraint
CREATE OR REPLACE FUNCTION public.join_company_with_code(_user_id uuid, _code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _invite RECORD;
BEGIN
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

-- 5. Create deduct_sms_credit function
CREATE OR REPLACE FUNCTION public.deduct_sms_credit(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _bal numeric;
BEGIN
  SELECT balance INTO _bal FROM public.tenant_sms_balances WHERE tenant_id = _tenant_id FOR UPDATE;
  IF _bal IS NULL OR _bal < 1 THEN RETURN false; END IF;

  UPDATE public.tenant_sms_balances SET balance = balance - 1, updated_at = now() WHERE tenant_id = _tenant_id;

  INSERT INTO public.sms_balance_transactions (tenant_id, amount, type, description, balance_after)
  VALUES (_tenant_id, -1, 'debit', 'SMS sent', _bal - 1);

  RETURN true;
END;
$$;

-- 6. Fix add_sms_credits to match calling code
CREATE OR REPLACE FUNCTION public.add_sms_credits(
  _tenant_id uuid, _count integer DEFAULT 0, _amount numeric DEFAULT 0,
  _pricing_id text DEFAULT NULL, _description text DEFAULT 'Credit purchase'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _new_balance numeric; _credit_amount numeric;
BEGIN
  _credit_amount := COALESCE(_count, 0);
  IF _credit_amount <= 0 THEN _credit_amount := COALESCE(_amount, 0); END IF;

  INSERT INTO public.tenant_sms_balances (tenant_id, balance)
  VALUES (_tenant_id, _credit_amount)
  ON CONFLICT (tenant_id) DO UPDATE SET balance = tenant_sms_balances.balance + _credit_amount, updated_at = now();

  SELECT balance INTO _new_balance FROM public.tenant_sms_balances WHERE tenant_id = _tenant_id;

  INSERT INTO public.sms_balance_transactions (tenant_id, amount, type, description, balance_after)
  VALUES (_tenant_id, _credit_amount, 'credit', _description, _new_balance);

  RETURN jsonb_build_object('success', true, 'new_balance', _new_balance);
END;
$$;

-- 7. Create booking_services table
CREATE TABLE IF NOT EXISTS public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view booking services"
ON public.booking_services FOR SELECT
TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant admins can manage booking services"
ON public.booking_services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_booking_services_updated_at
BEFORE UPDATE ON public.booking_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create get_public_booking_services function
CREATE OR REPLACE FUNCTION public.get_public_booking_services(_slug text)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT bs.id, bs.name, bs.description, bs.duration_minutes, bs.price, bs.currency
    FROM public.booking_services bs
    JOIN public.tenants te ON te.id = bs.tenant_id
    WHERE te.slug = _slug AND bs.is_active = true
    ORDER BY bs.name
  ) t;
$$;

-- 9. Create create_public_booking function
CREATE OR REPLACE FUNCTION public.create_public_booking(
  _company_slug text, _service_id uuid, _title text,
  _start_time timestamptz, _end_time timestamptz,
  _attendee_name text, _attendee_email text,
  _attendee_phone text DEFAULT NULL, _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _tenant_id uuid; _booking_id uuid;
BEGIN
  SELECT id INTO _tenant_id FROM public.tenants WHERE slug = _company_slug;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;

  INSERT INTO public.facility_bookings (tenant_id, facility_name, booked_by_name, start_time, end_time, purpose, status, attendees)
  VALUES (_tenant_id, _title, _attendee_name, _start_time, _end_time,
    format('Service: %s | Email: %s | Phone: %s | Notes: %s', _title, _attendee_email, COALESCE(_attendee_phone,''), COALESCE(_notes,'')),
    'confirmed', 1)
  RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;

-- 10. Create admin introspection functions
CREATE OR REPLACE FUNCTION public.get_table_info()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT c.relname as name,
           c.reltuples::bigint as row_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT column_name as name, data_type as type, is_nullable as nullable, column_default as default_value
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table_name
    ORDER BY ordinal_position
  ) t;
$$;
