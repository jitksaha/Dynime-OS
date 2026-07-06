
-- Module addon pricing table (admin configures per-module pricing)
CREATE TABLE public.module_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_quarterly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  price_onetime NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.module_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active addons" ON public.module_addons
  FOR SELECT USING (true);

CREATE POLICY "Super admins full access module_addons" ON public.module_addons
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Tenant addon modules (tracks purchased addons per tenant)
CREATE TABLE public.tenant_addon_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  module_name TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'subscription', -- 'subscription' or 'onetime'
  billing_cycle TEXT DEFAULT 'monthly',
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending', 'cancelled'
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_name)
);

ALTER TABLE public.tenant_addon_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their addons" ON public.tenant_addon_modules
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can request addons" ON public.tenant_addon_modules
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins full access tenant_addon_modules" ON public.tenant_addon_modules
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins can manage their addons" ON public.tenant_addon_modules
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

-- Seed default addon pricing for all modules
INSERT INTO public.module_addons (module_name, display_name, description, price_monthly, price_quarterly, price_yearly, price_onetime) VALUES
  ('hrms', 'HRMS', 'Employee management, attendance, payroll, leave, recruitment', 500, 1350, 4800, 15000),
  ('crm', 'CRM', 'Sales pipeline, deal tracking, contact management', 500, 1350, 4800, 15000),
  ('marketing', 'Marketing', 'Campaigns, email templates, analytics', 400, 1080, 3840, 12000),
  ('workflows', 'Workflows', 'Automation builder with triggers and actions', 300, 810, 2880, 9000),
  ('accounting', 'Accounting', 'Invoices, expenses, payments', 500, 1350, 4800, 15000),
  ('helpdesk', 'Helpdesk', 'Ticket management and customer support', 400, 1080, 3840, 12000),
  ('projects', 'Projects', 'Task boards, team collaboration', 400, 1080, 3840, 12000),
  ('documents', 'Documents', 'File storage and document sharing', 300, 810, 2880, 9000),
  ('reports', 'Reports', 'Business intelligence and analytics', 300, 810, 2880, 9000),
  ('wallet', 'Wallet', 'Payment terminal, transfers, payment links, payouts', 500, 1350, 4800, 15000);
