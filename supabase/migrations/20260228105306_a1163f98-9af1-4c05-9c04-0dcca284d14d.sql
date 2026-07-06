
-- Add is_free flag to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;

-- Create free plan limits configuration table
CREATE TABLE public.free_plan_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  limit_key TEXT NOT NULL UNIQUE,
  limit_label TEXT NOT NULL,
  limit_value INTEGER NOT NULL DEFAULT 0,
  limit_description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_plan_limits ENABLE ROW LEVEL SECURITY;

-- Super admins can manage (using has_role check), everyone can read
CREATE POLICY "Anyone can read free plan limits"
  ON public.free_plan_limits FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage free plan limits"
  ON public.free_plan_limits FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Insert default free plan limits
INSERT INTO public.free_plan_limits (limit_key, limit_label, limit_value, limit_description, category) VALUES
  ('max_users', 'Maximum Users', 2, 'Maximum number of team members allowed', 'general'),
  ('max_employees', 'Maximum Employees', 5, 'Maximum employee records in HRMS', 'hrms'),
  ('max_deals', 'Maximum Deals', 10, 'Maximum active deals in CRM', 'crm'),
  ('max_invoices_per_month', 'Invoices Per Month', 5, 'Maximum invoices created per month', 'accounting'),
  ('max_tickets', 'Maximum Open Tickets', 10, 'Maximum open helpdesk tickets', 'helpdesk'),
  ('max_projects', 'Maximum Projects', 2, 'Maximum active projects', 'projects'),
  ('max_documents', 'Maximum Documents', 20, 'Maximum stored documents', 'documents'),
  ('max_storage_mb', 'Storage (MB)', 100, 'Maximum file storage in megabytes', 'general'),
  ('max_api_calls_per_day', 'API Calls Per Day', 0, 'Daily API call limit (0 = disabled)', 'general'),
  ('max_campaigns', 'Maximum Campaigns', 1, 'Maximum active marketing campaigns', 'marketing'),
  ('max_workflows', 'Maximum Workflows', 1, 'Maximum active automation workflows', 'workflows');

-- Insert the Free plan into subscription_plans (sort_order 0 = first)
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_quarterly, price_yearly, price_lifetime, currency, max_users, modules, features, is_active, sort_order, is_free)
VALUES (
  'Free',
  'free',
  'Forever free for individuals and micro teams',
  0, 0, 0, 0,
  'BDT',
  2,
  ARRAY['hrms', 'crm', 'accounting'],
  ARRAY['Up to 2 users', '5 employee records', '10 CRM deals', '5 invoices/month', '100MB storage', 'Community support'],
  true,
  0,
  true
);

-- Add trigger for updated_at
CREATE TRIGGER update_free_plan_limits_updated_at
  BEFORE UPDATE ON public.free_plan_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
