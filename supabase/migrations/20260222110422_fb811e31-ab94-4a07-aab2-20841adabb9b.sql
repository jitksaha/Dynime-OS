
-- Table to store mobile app configuration per tenant
CREATE TABLE public.mobile_app_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_name text NOT NULL DEFAULT 'My App',
  app_icon_url text,
  splash_screen_url text,
  primary_color text NOT NULL DEFAULT '#6366f1',
  secondary_color text NOT NULL DEFAULT '#8b5cf6',
  accent_color text NOT NULL DEFAULT '#06b6d4',
  background_color text NOT NULL DEFAULT '#ffffff',
  custom_domain text,
  push_enabled boolean NOT NULL DEFAULT false,
  push_provider text DEFAULT 'firebase',
  push_config jsonb DEFAULT '{}'::jsonb,
  feature_toggles jsonb NOT NULL DEFAULT '{
    "company": {"dashboard": true, "settings": true, "departments": true, "employees": true, "approvals": true, "wallet": true},
    "employee": {"dashboard": true, "attendance": true, "leave": true, "payslips": true, "documents": true},
    "customer": {"dashboard": true, "invoices": true, "tickets": true, "wallet": true, "documents": true}
  }'::jsonb,
  android_package_name text,
  ios_bundle_id text,
  app_version text DEFAULT '1.0.0',
  build_number integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.mobile_app_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Company admins can view their mobile app config"
  ON public.mobile_app_configs FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins can insert their mobile app config"
  ON public.mobile_app_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'company_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Company admins can update their mobile app config"
  ON public.mobile_app_configs FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'company_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_mobile_app_configs_updated_at
  BEFORE UPDATE ON public.mobile_app_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
