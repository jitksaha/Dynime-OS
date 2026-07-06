
CREATE TABLE public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  color text DEFAULT '#4F46E5',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view booking services"
  ON public.booking_services FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage booking services"
  ON public.booking_services FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active booking services"
  ON public.booking_services FOR SELECT TO anon
  USING (is_active = true);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.booking_services(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_public_booking boolean DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS calendar_event_id uuid;

CREATE POLICY "Anyone can create public bookings"
  ON public.bookings FOR INSERT TO anon
  WITH CHECK (is_public_booking = true);

CREATE OR REPLACE FUNCTION public.get_public_booking_services(_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO _result FROM (
    SELECT bs.id, bs.name, bs.description, bs.duration_minutes, bs.price, bs.currency, bs.color,
           te.name as company_name, te.slug as company_slug, te.logo_url as company_logo
    FROM public.booking_services bs
    JOIN public.tenants te ON te.id = bs.tenant_id
    WHERE te.slug = _slug AND bs.is_active = true
    ORDER BY bs.sort_order
  ) t;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_public_booking(
  _company_slug text,
  _service_id uuid,
  _title text,
  _start_time timestamptz,
  _end_time timestamptz,
  _attendee_name text,
  _attendee_email text,
  _attendee_phone text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _tenant_id uuid;
  _booking_id uuid;
  _owner_id uuid;
BEGIN
  SELECT t.id INTO _tenant_id FROM public.tenants t WHERE t.slug = _company_slug;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;

  SELECT p.user_id INTO _owner_id FROM public.profiles p WHERE p.tenant_id = _tenant_id AND p.is_owner = true LIMIT 1;
  IF _owner_id IS NULL THEN
    SELECT p.user_id INTO _owner_id FROM public.profiles p WHERE p.tenant_id = _tenant_id LIMIT 1;
  END IF;

  INSERT INTO public.bookings (tenant_id, created_by, service_id, title, start_time, end_time, attendee_name, attendee_email, attendee_phone, notes, booking_type, status, is_public_booking)
  VALUES (_tenant_id, _owner_id, _service_id, _title, _start_time, _end_time, _attendee_name, _attendee_email, _attendee_phone, _notes, 'appointment', 'pending', true)
  RETURNING id INTO _booking_id;

  INSERT INTO public.calendar_events (tenant_id, created_by, title, description, event_type, start_time, end_time, source_module, source_id, color)
  VALUES (_tenant_id, _owner_id, 'Booking: ' || _title, 'Booked by ' || _attendee_name || ' (' || _attendee_email || ')', 'meeting', _start_time, _end_time, 'bookings', _booking_id::text, '#4F46E5');

  RETURN _booking_id;
END;
$$;
