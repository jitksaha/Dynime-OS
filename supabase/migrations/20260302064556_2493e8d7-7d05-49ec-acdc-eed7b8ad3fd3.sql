
CREATE TABLE public.platform_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'package',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_modules ENABLE ROW LEVEL SECURITY;

-- Super admins can manage, everyone can read active modules
CREATE POLICY "Anyone can read active modules"
  ON public.platform_modules FOR SELECT
  USING (true);

CREATE POLICY "Super admins can insert modules"
  ON public.platform_modules FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update modules"
  ON public.platform_modules FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete modules"
  ON public.platform_modules FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default modules
INSERT INTO public.platform_modules (name, label, description, icon, sort_order) VALUES
  ('hrms', 'HRM', 'Employee management, attendance, shifts, payroll, leave, recruitment', 'users', 0),
  ('crm', 'CRM', 'Sales pipeline, deal tracking, contact management', 'handshake', 1),
  ('marketing', 'Marketing', 'Campaigns, email templates, analytics', 'megaphone', 2),
  ('workflows', 'Workflows', 'Automation builder with triggers and actions', 'workflow', 3),
  ('accounting', 'Accounting', 'Invoices, expenses, payments, tax management', 'calculator', 4),
  ('helpdesk', 'Helpdesk', 'Ticket management and customer support', 'headphones', 5),
  ('projects', 'Projects', 'Task boards, team collaboration', 'kanban', 6),
  ('documents', 'Documents', 'File storage and document sharing', 'file', 7),
  ('reports', 'Reports', 'Business intelligence and analytics', 'bar-chart', 8),
  ('wallet', 'Wallet', 'Payment terminal, transfers, payment links, payouts', 'wallet', 9),
  ('product_hub', 'Product Hub', 'Product catalog, orders, POS, courier integration', 'shopping-bag', 10);
