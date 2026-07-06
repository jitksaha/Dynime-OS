
-- Platform-wide settings (Super Admin controls)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings FOR SELECT
USING (true);

-- Insert default self-service toggle
INSERT INTO public.platform_settings (key, value, description)
VALUES ('portal_self_service', '{"enabled": false}'::jsonb, 'Controls whether visitors can self-register and create portal spaces');

-- Communication templates table
CREATE TABLE public.communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  channel text NOT NULL DEFAULT 'email',
  subject text,
  body text NOT NULL DEFAULT '',
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view templates"
ON public.communication_templates FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins can manage templates"
ON public.communication_templates FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Super admins full access comm templates"
ON public.communication_templates FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Notification log for sent communications
CREATE TABLE public.communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  template_id uuid REFERENCES public.communication_templates(id),
  channel text NOT NULL DEFAULT 'email',
  recipient text NOT NULL,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'sent',
  sent_by uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view comm logs"
ON public.communication_logs FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert comm logs"
ON public.communication_logs FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins full access comm logs"
ON public.communication_logs FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_communication_templates_updated_at
BEFORE UPDATE ON public.communication_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
