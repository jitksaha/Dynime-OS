-- Allow super admins to view all tenants for KYB management
CREATE POLICY "Super admins can view all tenants"
ON public.tenants FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to update any tenant (for KYB approval/rejection)
CREATE POLICY "Super admins can update all tenants"
ON public.tenants FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));