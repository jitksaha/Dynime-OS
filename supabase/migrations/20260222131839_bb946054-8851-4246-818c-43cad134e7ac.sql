
-- Company Holidays
CREATE TABLE public.company_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant holidays" ON public.company_holidays FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage holidays" ON public.company_holidays FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Document Requests
CREATE TABLE public.document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'salary_certificate',
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own requests" ON public.document_requests FOR SELECT USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can create own requests" ON public.document_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update requests" ON public.document_requests FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Employee Loans
CREATE TABLE public.employee_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_name TEXT NOT NULL,
  loan_type TEXT NOT NULL DEFAULT 'salary_advance',
  amount NUMERIC NOT NULL DEFAULT 0,
  emi_amount NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  installments INT NOT NULL DEFAULT 1,
  paid_installments INT NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  approved_by UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users can view loans" ON public.employee_loans FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Tenant users can manage loans" ON public.employee_loans FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Training Records
CREATE TABLE public.training_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_name TEXT NOT NULL,
  training_name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  provider TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Assigned',
  score NUMERIC,
  certificate_url TEXT,
  expiry_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users can view training" ON public.training_records FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Tenant users can manage training" ON public.training_records FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Employee Warnings
CREATE TABLE public.employee_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_name TEXT NOT NULL,
  warning_type TEXT NOT NULL DEFAULT 'verbal',
  severity TEXT NOT NULL DEFAULT 'low',
  reason TEXT NOT NULL,
  details TEXT,
  issued_by TEXT NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  escalation_level INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users can view warnings" ON public.employee_warnings FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Tenant users can manage warnings" ON public.employee_warnings FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Recurring Invoices
CREATE TABLE public.recurring_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_date DATE NOT NULL,
  last_generated DATE,
  items_json JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  total_generated INT DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users can view recurring invoices" ON public.recurring_invoices FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Tenant users can manage recurring invoices" ON public.recurring_invoices FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Budgets
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users can view budgets" ON public.budgets FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Tenant users can manage budgets" ON public.budgets FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
