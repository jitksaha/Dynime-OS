
-- Table to store company-level offer letter templates (last edit saved)
CREATE TABLE public.offer_letter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  template_body TEXT NOT NULL DEFAULT '',
  last_updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.offer_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their template" ON public.offer_letter_templates
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert their template" ON public.offer_letter_templates
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can update their template" ON public.offer_letter_templates
  FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Seed 100 default departments into every existing tenant
-- We'll add a "is_default" flag concept by seeding common departments
-- Actually, let's just ensure companies can manage their own. We'll seed defaults via code.
