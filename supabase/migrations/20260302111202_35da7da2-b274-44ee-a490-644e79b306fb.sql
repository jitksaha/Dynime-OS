
-- =====================================================
-- SECURITY HARDENING: Role-based RLS for sensitive data
-- =====================================================

-- 1. Helper function: Check if user has HR/Finance/Admin role
CREATE OR REPLACE FUNCTION public.has_sensitive_data_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('company_admin', 'super_admin', 'hr_manager', 'finance_manager')
  )
$$;

-- 2. Helper function: Check if user is the record owner or has elevated access
CREATE OR REPLACE FUNCTION public.can_view_employee_data(_user_id uuid, _record_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND p.tenant_id = _record_tenant_id
      AND ur.role IN ('company_admin', 'super_admin', 'hr_manager', 'finance_manager')
  )
$$;

-- 3. Tighten payroll_records: Only HR/Finance/Admin or own records
DROP POLICY IF EXISTS "Tenant members can view payroll" ON public.payroll_records;
CREATE POLICY "Role-based payroll access" ON public.payroll_records
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_id(auth.uid()) = tenant_id
    AND (
      public.has_sensitive_data_access(auth.uid())
      OR created_by = auth.uid()
    )
  );

-- 4. Tighten salary_increments: Only HR/Finance/Admin or own records
DROP POLICY IF EXISTS "Tenant members can view salary increments" ON public.salary_increments;
CREATE POLICY "Role-based salary increment access" ON public.salary_increments
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_id(auth.uid()) = tenant_id
    AND (
      public.has_sensitive_data_access(auth.uid())
      OR created_by = auth.uid()
    )
  );

-- 5. Tighten employee_loans: Only HR/Finance/Admin or own records
DROP POLICY IF EXISTS "Tenant members can view employee loans" ON public.employee_loans;
CREATE POLICY "Role-based loan access" ON public.employee_loans
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_id(auth.uid()) = tenant_id
    AND (
      public.has_sensitive_data_access(auth.uid())
      OR created_by = auth.uid()
    )
  );

-- 6. Tighten employee_warnings: Only HR/Admin or own records
DROP POLICY IF EXISTS "Tenant members can view employee warnings" ON public.employee_warnings;
CREATE POLICY "Role-based warning access" ON public.employee_warnings
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_id(auth.uid()) = tenant_id
    AND (
      public.has_sensitive_data_access(auth.uid())
      OR created_by = auth.uid()
    )
  );

-- 7. Tighten performance_reviews: Only HR/Admin or own records
DROP POLICY IF EXISTS "Tenant members can view performance reviews" ON public.performance_reviews;
CREATE POLICY "Role-based performance review access" ON public.performance_reviews
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_id(auth.uid()) = tenant_id
    AND (
      public.has_sensitive_data_access(auth.uid())
      OR created_by = auth.uid()
    )
  );

-- 8. Tighten webhook_configs: Only admins
DROP POLICY IF EXISTS "Tenant members can view webhook configs" ON public.webhook_configs;
CREATE POLICY "Admin-only webhook access" ON public.webhook_configs
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_id(auth.uid()) = tenant_id
    AND public.has_sensitive_data_access(auth.uid())
  );

-- 9. Tighten api_keys: Only admins
DROP POLICY IF EXISTS "Tenant members can view api keys" ON public.api_keys;
CREATE POLICY "Admin-only api key access" ON public.api_keys
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_id(auth.uid()) = tenant_id
    AND public.has_sensitive_data_access(auth.uid())
  );

-- 10. Create login_attempts table for brute-force protection
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only super admins can view login attempts
CREATE POLICY "Super admins can view login attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow inserts from edge functions (service role)
CREATE POLICY "Service can insert login attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);

-- Auto-cleanup old login attempts (older than 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER cleanup_login_attempts_trigger
  AFTER INSERT ON public.login_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_login_attempts();
