
-- Notifications table for real-time alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  module TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Tenant members can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Subscription plans table (admin managed)
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_quarterly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  price_lifetime NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  max_users INTEGER NOT NULL DEFAULT 10,
  modules TEXT[] NOT NULL DEFAULT '{}',
  features TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans (public pricing page)
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Only super_admin can manage plans
CREATE POLICY "Super admins can insert plans"
ON public.subscription_plans FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update plans"
ON public.subscription_plans FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete plans"
ON public.subscription_plans FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Tenant subscriptions
CREATE TABLE public.tenant_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'sslcommerz',
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their subscription"
ON public.tenant_subscriptions FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can manage all subscriptions"
ON public.tenant_subscriptions FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins can insert subscription"
ON public.tenant_subscriptions FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

-- Module access table (which modules a tenant has access to)
CREATE TABLE public.tenant_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_name)
);

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their modules"
ON public.tenant_modules FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins can manage modules"
ON public.tenant_modules FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Super admins can manage all modules"
ON public.tenant_modules FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_quarterly, price_yearly, price_lifetime, max_users, modules, features, sort_order) VALUES
('Starter', 'starter', 'Perfect for small teams getting started', 2999, 7999, 29999, 99999, 10, ARRAY['hrms', 'crm'], ARRAY['Up to 10 users', 'HRMS & CRM modules', 'Email support', '5GB storage', 'Basic reports'], 1),
('Professional', 'professional', 'Best for growing businesses', 7999, 21999, 79999, 249999, 50, ARRAY['hrms', 'crm', 'marketing', 'workflows', 'accounting', 'helpdesk', 'projects', 'documents', 'reports'], ARRAY['Up to 50 users', 'All modules included', 'Priority support', '50GB storage', 'Advanced analytics', 'Workflow automation', 'API access'], 2),
('Enterprise', 'enterprise', 'For large organizations', 19999, 54999, 199999, 599999, -1, ARRAY['hrms', 'crm', 'marketing', 'workflows', 'accounting', 'helpdesk', 'projects', 'documents', 'reports', 'admin'], ARRAY['Unlimited users', 'All modules + custom', '24/7 dedicated support', 'Unlimited storage', 'White-label option', 'Custom integrations', 'SLA guarantee', 'On-premise option'], 3);

-- Add update triggers
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
BEFORE UPDATE ON public.tenant_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
