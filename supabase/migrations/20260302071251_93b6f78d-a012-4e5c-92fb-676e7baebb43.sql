-- AI Configuration setting (stored in platform_settings)
-- No new table needed, we use platform_settings key = 'ai_config'

-- Onboarding tour tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_tour_completed boolean DEFAULT false;

-- IP Whitelisting for security
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  label text DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage IP whitelist"
  ON public.ip_whitelist FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins can manage own tenant IP whitelist"
  ON public.ip_whitelist FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 2FA enforcement config (stored in platform_settings key = 'security_config')
-- GDPR data export requests tracking
CREATE TABLE IF NOT EXISTS public.gdpr_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  download_url text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE public.gdpr_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own GDPR exports"
  ON public.gdpr_export_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can request own GDPR exports"
  ON public.gdpr_export_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Dashboard widget configurations per user
CREATE TABLE IF NOT EXISTS public.dashboard_widget_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  widgets jsonb DEFAULT '[]'::jsonb,
  layout jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.dashboard_widget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dashboard config"
  ON public.dashboard_widget_configs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());