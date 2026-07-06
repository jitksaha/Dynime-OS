
-- Table for persisting sidebar item order per user
CREATE TABLE public.user_sidebar_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sidebar_key text NOT NULL, -- 'main' or 'company_admin'
  item_order text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sidebar_key)
);

ALTER TABLE public.user_sidebar_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sidebar prefs"
ON public.user_sidebar_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sidebar prefs"
ON public.user_sidebar_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sidebar prefs"
ON public.user_sidebar_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Table for role-module permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  role text NOT NULL,
  module_key text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role, module_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view role permissions"
ON public.role_permissions FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins can manage role permissions"
ON public.role_permissions FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE POLICY "Super admins can manage all role permissions"
ON public.role_permissions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
