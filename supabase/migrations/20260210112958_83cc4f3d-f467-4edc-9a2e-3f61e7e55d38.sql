
-- 1. Attendance Records
CREATE TABLE public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_by uuid NOT NULL,
  employee_name text NOT NULL,
  employee_department text,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present',
  check_in time,
  check_out time,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.attendance_records FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.attendance_records FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.attendance_records FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.attendance_records FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2. Payroll Records
CREATE TABLE public.payroll_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_by uuid NOT NULL,
  employee_name text NOT NULL,
  employee_department text,
  pay_period text NOT NULL DEFAULT 'Feb 2026',
  basic_salary numeric NOT NULL DEFAULT 0,
  hra numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.payroll_records FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.payroll_records FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.payroll_records FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.payroll_records FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 3. Job Postings
CREATE TABLE public.job_postings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_by uuid NOT NULL,
  title text NOT NULL,
  department text NOT NULL,
  location text NOT NULL DEFAULT 'Remote',
  employment_type text NOT NULL DEFAULT 'Full-time',
  description text,
  applicants integer NOT NULL DEFAULT 0,
  shortlisted integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open',
  posted_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.job_postings FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.job_postings FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.job_postings FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.job_postings FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 4. Performance Reviews
CREATE TABLE public.performance_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_by uuid NOT NULL,
  employee_name text NOT NULL,
  employee_department text,
  review_period text NOT NULL DEFAULT 'Q1 2026',
  rating numeric DEFAULT 0,
  total_goals integer NOT NULL DEFAULT 3,
  completed_goals integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.performance_reviews FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.performance_reviews FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.performance_reviews FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.performance_reviews FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));
