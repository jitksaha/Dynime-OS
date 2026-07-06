
CREATE TABLE public.social_signin_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  provider_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  client_id text DEFAULT '',
  client_secret text DEFAULT '',
  additional_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_signin_providers ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage
CREATE POLICY "Super admins can view social providers"
  ON public.social_signin_providers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert social providers"
  ON public.social_signin_providers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update social providers"
  ON public.social_signin_providers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete social providers"
  ON public.social_signin_providers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_social_signin_providers_updated_at
  BEFORE UPDATE ON public.social_signin_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default providers
INSERT INTO public.social_signin_providers (provider_key, provider_name, is_enabled) VALUES
  ('google', 'Google', false),
  ('apple', 'Apple', false),
  ('facebook', 'Facebook', false),
  ('github', 'GitHub', false),
  ('twitter', 'Twitter / X', false),
  ('linkedin', 'LinkedIn', false),
  ('microsoft', 'Microsoft', false),
  ('discord', 'Discord', false);
