
-- Add columns for half-day, temporary, and multi-date leave support
ALTER TABLE public.leave_requests 
  ADD COLUMN IF NOT EXISTS is_half_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS half_day_period text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS leave_category text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_days text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_leave_id uuid REFERENCES public.leave_requests(id) ON DELETE CASCADE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz DEFAULT NULL;

-- Create leave balances table
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  leave_type text NOT NULL,
  total_allowed integer NOT NULL DEFAULT 0,
  used integer NOT NULL DEFAULT 0,
  carry_forward integer NOT NULL DEFAULT 0,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, employee_name, leave_type, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view leave balances" ON public.leave_balances
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can insert leave balances" ON public.leave_balances
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can update leave balances" ON public.leave_balances
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
