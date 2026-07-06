
-- CDN configurations table
CREATE TABLE public.cdn_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  credentials JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  endpoint_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cdn_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage CDN configs"
  ON public.cdn_configurations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Employee expense claims
CREATE TABLE public.employee_expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  user_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category TEXT DEFAULT 'general',
  description TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employee_expense_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expense claims"
  ON public.employee_expense_claims FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Users can insert own expense claims"
  ON public.employee_expense_claims FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update expense claims"
  ON public.employee_expense_claims FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'company_admin'));

-- Company assets assignment
CREATE TABLE public.company_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  asset_name TEXT NOT NULL,
  asset_type TEXT DEFAULT 'other',
  serial_number TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  status TEXT DEFAULT 'available',
  purchase_date TEXT,
  purchase_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.company_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assigned assets"
  ON public.company_assets FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can manage assets"
  ON public.company_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'company_admin'));

-- Training courses
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  duration_hours NUMERIC DEFAULT 0,
  instructor TEXT,
  status TEXT DEFAULT 'active',
  max_participants INTEGER DEFAULT 50,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view courses"
  ON public.training_courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage courses"
  ON public.training_courses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'company_admin'));

-- Training enrollments
CREATE TABLE public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  course_id UUID REFERENCES public.training_courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  status TEXT DEFAULT 'enrolled',
  progress INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
  ON public.training_enrollments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Users can enroll themselves"
  ON public.training_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Feedback surveys
CREATE TABLE public.employee_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  questions JSONB DEFAULT '[]'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.employee_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view surveys"
  ON public.employee_surveys FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage surveys"
  ON public.employee_surveys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'company_admin'));

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  survey_id UUID REFERENCES public.employee_surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  answers JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own responses"
  ON public.survey_responses FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all responses"
  ON public.survey_responses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin'));

-- Customer knowledge base
CREATE TABLE public.knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'published',
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles"
  ON public.knowledge_base_articles FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can manage articles"
  ON public.knowledge_base_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'company_admin'));

-- Customer loyalty
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  user_id UUID NOT NULL,
  points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  lifetime_points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
  ON public.loyalty_points FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "System can manage points"
  ON public.loyalty_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'company_admin'));

CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT DEFAULT 'earn',
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty transactions"
  ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Admins can manage loyalty transactions"
  ON public.loyalty_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'company_admin'));
