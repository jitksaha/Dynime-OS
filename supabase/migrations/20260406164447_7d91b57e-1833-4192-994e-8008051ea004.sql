
-- Add missing columns to attendance_records that the code expects
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS attendance_date text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS employee_name text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS employee_department text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS working_hours numeric DEFAULT 0;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS attendance_type text DEFAULT 'automatic';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill attendance_date from existing date column
UPDATE public.attendance_records SET attendance_date = date WHERE attendance_date IS NULL AND date IS NOT NULL;

-- Add RLS policies for budgets table
CREATE POLICY "Tenant members can view budgets"
ON public.budgets FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can create budgets"
ON public.budgets FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can update budgets"
ON public.budgets FOR UPDATE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete budgets"
ON public.budgets FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));
