
-- Fix permissive tenant insert policy — restrict to users who don't have a tenant yet
DROP POLICY "Authenticated users can create tenants" ON public.tenants;

CREATE POLICY "Users without a tenant can create one"
  ON public.tenants FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_tenant_id(auth.uid()) IS NULL);
