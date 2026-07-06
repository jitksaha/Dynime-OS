-- Table: payment_gateway_configs
CREATE TABLE IF NOT EXISTS public.payment_gateway_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT true,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_tested_at timestamp with time zone,
  test_result text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: pdm_products
CREATE TABLE IF NOT EXISTS public.pdm_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  category TEXT DEFAULT 'General',
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  weight_grams NUMERIC DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: pdm_orders
CREATE TABLE IF NOT EXISTS public.pdm_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  customer_city TEXT,
  customer_zone TEXT,
  customer_area TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_charge NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  cod_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  order_status TEXT NOT NULL DEFAULT 'pending',
  courier_name TEXT,
  courier_tracking_id TEXT,
  courier_consignment_id TEXT,
  courier_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: pdm_order_items
CREATE TABLE IF NOT EXISTS public.pdm_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.pdm_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.pdm_products(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: pdm_courier_configs
CREATE TABLE IF NOT EXISTS public.pdm_courier_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  courier_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_tested_at TIMESTAMPTZ,
  test_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, courier_key)
);

-- Table: pdm_store_integrations
CREATE TABLE IF NOT EXISTS public.pdm_store_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  platform TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_url TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_products BOOLEAN NOT NULL DEFAULT true,
  sync_orders BOOLEAN NOT NULL DEFAULT true,
  sync_customers BOOLEAN NOT NULL DEFAULT true,
  sync_categories BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: pdm_sync_logs
CREATE TABLE IF NOT EXISTS public.pdm_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  integration_id UUID NOT NULL REFERENCES public.pdm_store_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'full',
  direction TEXT NOT NULL DEFAULT 'both',
  status TEXT NOT NULL DEFAULT 'running',
  items_synced INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: kyc_verifications
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  status TEXT NOT NULL DEFAULT 'pending',
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  document_type TEXT NOT NULL DEFAULT 'nid',
  document_number TEXT NOT NULL,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone_number TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: page_seo
CREATE TABLE IF NOT EXISTS public.page_seo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_path TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  meta_image TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index, follow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: offer_letter_templates
CREATE TABLE IF NOT EXISTS public.offer_letter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  template_body TEXT NOT NULL DEFAULT '',
  last_updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Table: tenant_integrations
CREATE TABLE IF NOT EXISTS public.tenant_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  last_tested_at TIMESTAMPTZ,
  test_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, integration_key)
);

-- Table: referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  commission_type TEXT NOT NULL DEFAULT 'free_month',
  commission_percentage NUMERIC DEFAULT 10,
  total_referrals INT DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE CASCADE NOT NULL,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referred_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_type TEXT DEFAULT 'free_month',
  reward_amount NUMERIC DEFAULT 0,
  referrer_rewarded BOOLEAN DEFAULT false,
  referred_rewarded BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: referral_earnings
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE NOT NULL,
  referrer_user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  earning_type TEXT NOT NULL DEFAULT 'free_month',
  amount NUMERIC NOT NULL DEFAULT 0,
  source_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: referral_settings
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  commission_type TEXT NOT NULL DEFAULT 'free_month',
  default_commission_percentage NUMERIC NOT NULL DEFAULT 10,
  min_payout_amount NUMERIC NOT NULL DEFAULT 50,
  cookie_duration_days INT NOT NULL DEFAULT 30,
  require_subscription BOOLEAN NOT NULL DEFAULT true,
  max_referrals_per_user INT DEFAULT 0,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: shift_types
CREATE TABLE IF NOT EXISTS public.shift_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: shift_assignments
CREATE TABLE IF NOT EXISTS public.shift_assignments (
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

-- Table: salary_increments
CREATE TABLE IF NOT EXISTS public.salary_increments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  current_salary NUMERIC NOT NULL DEFAULT 0,
  new_salary NUMERIC NOT NULL DEFAULT 0,
  increment_percentage NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  effective_date DATE NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: late_records
CREATE TABLE IF NOT EXISTS public.late_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TIME NOT NULL,
  actual_time TIME NOT NULL,
  minutes_late INTEGER NOT NULL DEFAULT 0,
  excused BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  requests_count INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: api_request_logs
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: mobile_app_configs
CREATE TABLE IF NOT EXISTS public.mobile_app_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'Dynime',
  package_name TEXT NOT NULL DEFAULT 'com.dynime.app',
  version TEXT NOT NULL DEFAULT '1.0.0',
  min_version TEXT NOT NULL DEFAULT '1.0.0',
  force_update BOOLEAN NOT NULL DEFAULT false,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT DEFAULT 'App is under maintenance',
  android_url TEXT DEFAULT '',
  ios_url TEXT DEFAULT '',
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: company_holidays
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'public',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: document_requests
CREATE TABLE IF NOT EXISTS public.document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: employee_loans
CREATE TABLE IF NOT EXISTS public.employee_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  loan_type TEXT NOT NULL DEFAULT 'Personal',
  principal_amount NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  total_repayable NUMERIC NOT NULL DEFAULT 0,
  monthly_installment NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: training_records
CREATE TABLE IF NOT EXISTS public.training_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  training_name TEXT NOT NULL,
  provider TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Upcoming',
  score NUMERIC,
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: employee_warnings
CREATE TABLE IF NOT EXISTS public.employee_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  warning_type TEXT NOT NULL DEFAULT 'Verbal',
  severity TEXT NOT NULL DEFAULT 'Low',
  reason TEXT NOT NULL,
  description TEXT,
  issued_by UUID,
  issued_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: recurring_invoices
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  client TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  items JSONB DEFAULT '[]'::jsonb,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'Monthly',
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: webhook_configs
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: webhook_deliveries
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  attempts INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: chat_channels
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'group',
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: scheduled_reports
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: tenant_branding
CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  accent_color TEXT DEFAULT '#F59E0B',
  company_name TEXT,
  tagline TEXT,
  custom_css TEXT,
  email_header_html TEXT,
  email_footer_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: free_plan_limits
CREATE TABLE IF NOT EXISTS public.free_plan_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key TEXT NOT NULL,
  limit_key TEXT NOT NULL,
  limit_value INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_key, limit_key)
);

-- Table: system_email_templates
CREATE TABLE IF NOT EXISTS public.system_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'system',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: saved_payment_methods
CREATE TABLE IF NOT EXISTS public.saved_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  gateway_key text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  method_label text NOT NULL DEFAULT '',
  method_token text NOT NULL DEFAULT '',
  card_last4 text,
  card_brand text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: recurring_payment_schedules
CREATE TABLE IF NOT EXISTS public.recurring_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  saved_method_id uuid REFERENCES public.saved_payment_methods(id) ON DELETE SET NULL,
  gateway_key text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  interval_type text NOT NULL DEFAULT 'monthly',
  description text,
  status text NOT NULL DEFAULT 'active',
  next_charge_at timestamptz NOT NULL,
  last_charged_at timestamptz,
  failure_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: recurring_payment_logs
CREATE TABLE IF NOT EXISTS public.recurring_payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.recurring_payment_schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid,
  gateway_key text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  failure_reason text,
  gateway_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: sms_gateway_configs
CREATE TABLE IF NOT EXISTS public.sms_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  api_url text NOT NULL DEFAULT '',
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT true,
  supported_countries text[] DEFAULT ARRAY['BD'],
  config_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: notification_event_types
CREATE TABLE IF NOT EXISTS public.notification_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  default_sms_template text,
  default_email_subject text,
  default_email_body text,
  available_variables text[] DEFAULT ARRAY[]::text[],
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: tenant_notification_preferences
CREATE TABLE IF NOT EXISTS public.tenant_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  sms_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_gateway_key text,
  custom_sms_template text,
  custom_email_subject text,
  custom_email_body text,
  recipient_type text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, event_key)
);

-- Table: sms_logs
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  gateway_key text NOT NULL,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  event_key text,
  status text NOT NULL DEFAULT 'pending',
  gateway_response jsonb DEFAULT '{}'::jsonb,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: employee_verification_requests
CREATE TABLE IF NOT EXISTS public.employee_verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id),
  employee_name TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'employment',
  requested_by_company TEXT,
  requested_by_email TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  response_data JSONB DEFAULT '{}',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pdm_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pdm_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pdm_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pdm_courier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pdm_store_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pdm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.page_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offer_letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.salary_increments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.late_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mobile_app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.free_plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurring_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurring_payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sms_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_verification_requests ENABLE ROW LEVEL SECURITY;