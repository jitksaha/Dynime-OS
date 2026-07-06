
-- Login history table
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all login history" ON public.login_history
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own login history" ON public.login_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert login history" ON public.login_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- IP restrictions table
CREATE TABLE public.ip_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'whitelist',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all IP restrictions" ON public.ip_restrictions
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Company admins can manage their IP restrictions" ON public.ip_restrictions
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Tenant members can view IP restrictions" ON public.ip_restrictions
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
