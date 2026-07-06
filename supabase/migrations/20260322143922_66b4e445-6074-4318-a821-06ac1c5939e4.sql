
-- ============================================
-- NEW MODULE TABLES: Phase 2 Expansion
-- ============================================

-- 1. CLIENT PORTAL (uses existing tenant/profile infra, add portal_pages)
CREATE TABLE public.client_portal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  content text DEFAULT '',
  is_published boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.client_portal_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.client_portal_pages FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 2. FEEDBACK & NPS
CREATE TABLE public.feedback_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  survey_type text DEFAULT 'nps',
  status text DEFAULT 'active',
  questions jsonb DEFAULT '[]',
  trigger_event text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.feedback_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.feedback_surveys FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE public.feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  survey_id uuid REFERENCES public.feedback_surveys(id) ON DELETE CASCADE NOT NULL,
  respondent_email text,
  respondent_name text,
  score int,
  answers jsonb DEFAULT '{}',
  sentiment text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.feedback_responses FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 3. LOYALTY & REWARDS
CREATE TABLE public.loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  points_per_currency numeric DEFAULT 1,
  tiers jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.loyalty_programs FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE public.loyalty_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  program_id uuid REFERENCES public.loyalty_programs(id) ON DELETE CASCADE NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  points_balance int DEFAULT 0,
  total_earned int DEFAULT 0,
  total_redeemed int DEFAULT 0,
  tier text DEFAULT 'Bronze',
  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.loyalty_members FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 4. REFERRAL PROGRAM (extends existing referrals)
CREATE TABLE public.referral_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  reward_type text DEFAULT 'discount',
  reward_value numeric DEFAULT 0,
  max_referrals int DEFAULT -1,
  is_active boolean DEFAULT true,
  total_referrals int DEFAULT 0,
  total_conversions int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.referral_campaigns FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 5. FIELD SERVICE MANAGEMENT
CREATE TABLE public.field_service_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  assigned_to text,
  customer_name text,
  customer_address text,
  customer_phone text,
  status text DEFAULT 'scheduled',
  priority text DEFAULT 'medium',
  scheduled_date date,
  check_in_time timestamptz,
  check_out_time timestamptz,
  gps_lat numeric,
  gps_lng numeric,
  signature_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.field_service_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.field_service_jobs FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 6. SHIFT & ROSTER PLANNER
CREATE TABLE public.shift_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  employee_name text NOT NULL,
  employee_id text,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_type text DEFAULT 'regular',
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.shift_rosters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.shift_rosters FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 7. SLA MANAGER
CREATE TABLE public.sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  module text DEFAULT 'helpdesk',
  response_time_hours int DEFAULT 4,
  resolution_time_hours int DEFAULT 24,
  escalation_rules jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.sla_policies FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE public.sla_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  sla_policy_id uuid REFERENCES public.sla_policies(id) ON DELETE SET NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  started_at timestamptz DEFAULT now(),
  first_response_at timestamptz,
  resolved_at timestamptz,
  breached boolean DEFAULT false,
  breach_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.sla_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.sla_tracking FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 8. DOCUMENT AUTOMATION
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'general',
  template_type text DEFAULT 'contract',
  content text DEFAULT '',
  merge_fields jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.document_templates FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 9. RESOURCE PLANNER
CREATE TABLE public.resource_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  resource_name text NOT NULL,
  resource_type text DEFAULT 'person',
  project_name text,
  allocation_percent int DEFAULT 100,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.resource_allocations FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 10. QUALITY CONTROL
CREATE TABLE public.qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  inspection_type text DEFAULT 'product',
  inspector_name text,
  status text DEFAULT 'pending',
  checklist jsonb DEFAULT '[]',
  defects_found int DEFAULT 0,
  pass_rate numeric DEFAULT 0,
  root_cause text,
  corrective_action text,
  inspected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.qc_inspections FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 11. COLLECTIONS & DUNNING
CREATE TABLE public.collection_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  invoice_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  amount_due numeric DEFAULT 0,
  days_overdue int DEFAULT 0,
  status text DEFAULT 'friendly',
  escalation_level int DEFAULT 1,
  last_contacted_at timestamptz,
  payment_plan jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.collection_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.collection_cases FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 12. SUBSCRIPTION ANALYTICS
CREATE TABLE public.subscription_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  metric_date date NOT NULL,
  mrr numeric DEFAULT 0,
  arr numeric DEFAULT 0,
  active_subscriptions int DEFAULT 0,
  new_subscriptions int DEFAULT 0,
  churned_subscriptions int DEFAULT 0,
  expansion_revenue numeric DEFAULT 0,
  ltv_average numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscription_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.subscription_metrics FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 13. MULTI-CURRENCY TREASURY
CREATE TABLE public.treasury_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  account_name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  balance numeric DEFAULT 0,
  account_type text DEFAULT 'operating',
  bank_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.treasury_accounts FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 14. REVENUE RECOGNITION
CREATE TABLE public.revenue_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  contract_name text NOT NULL,
  customer_name text NOT NULL,
  total_value numeric NOT NULL DEFAULT 0,
  recognized_amount numeric DEFAULT 0,
  deferred_amount numeric DEFAULT 0,
  recognition_method text DEFAULT 'straight_line',
  start_date date NOT NULL,
  end_date date NOT NULL,
  milestones jsonb DEFAULT '[]',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.revenue_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.revenue_schedules FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 15. EXPENSE CLAIMS 2.0
CREATE TABLE public.expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  employee_name text NOT NULL,
  title text NOT NULL,
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'draft',
  category text DEFAULT 'general',
  receipt_urls jsonb DEFAULT '[]',
  mileage_km numeric,
  per_diem_days int,
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.expense_claims FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 16. FINANCIAL FORECASTING
CREATE TABLE public.financial_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  forecast_type text DEFAULT 'cash_flow',
  scenario text DEFAULT 'expected',
  period_start date NOT NULL,
  period_end date NOT NULL,
  data_points jsonb DEFAULT '[]',
  assumptions jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.financial_forecasts FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- 17. APPOINTMENT REMINDERS (leveraging bookings table, add reminder config)
CREATE TABLE public.appointment_reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  channel text DEFAULT 'email',
  minutes_before int DEFAULT 60,
  message_template text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.appointment_reminder_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.appointment_reminder_rules FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
