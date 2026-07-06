
DROP POLICY IF EXISTS "pub_partner_apps" ON partner_applications;

CREATE POLICY "admin_read_partner_apps" ON partner_applications
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) 
  OR public.has_role(auth.uid(), 'company_admin'::app_role)
);
