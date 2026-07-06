
-- Allow super admins to manage roles across all tenants
CREATE POLICY "Super admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update roles"
ON public.user_roles FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));
