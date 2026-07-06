
-- Country-wise payment method configuration
CREATE TABLE public.country_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  gateway_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, gateway_key)
);

-- Enable RLS
ALTER TABLE public.country_payment_methods ENABLE ROW LEVEL SECURITY;

-- Super admins can manage, everyone can read
CREATE POLICY "Anyone can read country payment methods"
  ON public.country_payment_methods FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Super admins can manage country payment methods"
  ON public.country_payment_methods FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_country_payment_methods_updated_at
  BEFORE UPDATE ON public.country_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
