
-- Shift Management table
CREATE TABLE public.shift_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  grace_period_minutes INT NOT NULL DEFAULT 15,
  is_night_shift BOOLEAN NOT NULL DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_name TEXT NOT NULL,
  employee_id UUID REFERENCES public.employees(id),
  shift_type_id UUID NOT NULL REFERENCES public.shift_types(id),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Salary Scaleup / Increment table
CREATE TABLE public.salary_increments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  previous_salary NUMERIC NOT NULL DEFAULT 0,
  new_salary NUMERIC NOT NULL DEFAULT 0,
  increment_percentage NUMERIC NOT NULL DEFAULT 0,
  increment_amount NUMERIC NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Late tracking records
CREATE TABLE public.late_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_name TEXT NOT NULL,
  attendance_record_id UUID REFERENCES public.attendance_records(id),
  late_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TEXT NOT NULL,
  actual_time TEXT NOT NULL,
  late_minutes INT NOT NULL DEFAULT 0,
  reason TEXT,
  excused BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_increments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.late_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for shift_types
CREATE POLICY "Users can view shift types in their tenant" ON public.shift_types
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert shift types in their tenant" ON public.shift_types
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update shift types in their tenant" ON public.shift_types
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete shift types in their tenant" ON public.shift_types
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS policies for shift_assignments
CREATE POLICY "Users can view shift assignments in their tenant" ON public.shift_assignments
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert shift assignments in their tenant" ON public.shift_assignments
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update shift assignments in their tenant" ON public.shift_assignments
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete shift assignments in their tenant" ON public.shift_assignments
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS policies for salary_increments
CREATE POLICY "Users can view salary increments in their tenant" ON public.salary_increments
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert salary increments in their tenant" ON public.salary_increments
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update salary increments in their tenant" ON public.salary_increments
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS policies for late_records
CREATE POLICY "Users can view late records in their tenant" ON public.late_records
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert late records in their tenant" ON public.late_records
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update late records in their tenant" ON public.late_records
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_shift_types_updated_at BEFORE UPDATE ON public.shift_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shift_assignments_updated_at BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_increments_updated_at BEFORE UPDATE ON public.salary_increments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
