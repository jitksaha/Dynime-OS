CREATE TABLE public.user_sidebar_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sidebar_key text NOT NULL,
  item_order text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sidebar_key)
);
ALTER TABLE public.user_sidebar_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sidebar prefs" ON public.user_sidebar_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own sidebar prefs" ON public.user_sidebar_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own sidebar prefs" ON public.user_sidebar_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());

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
CREATE POLICY "Tenant members can view role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Company admins can manage role permissions" ON public.role_permissions FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));
CREATE POLICY "Super admins can manage all role permissions" ON public.role_permissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  applicant_name text NOT NULL, applicant_email text NOT NULL, applicant_phone text, cover_letter text, resume_url text,
  status text NOT NULL DEFAULT 'New',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit applications" ON public.job_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant members can view applications" ON public.job_applications FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can update applications" ON public.job_applications FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can delete applications" ON public.job_applications FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id), created_by uuid NOT NULL,
  name text NOT NULL, category text NOT NULL DEFAULT 'General', type text NOT NULL DEFAULT 'Table',
  frequency text NOT NULL DEFAULT 'One-time', status text NOT NULL DEFAULT 'Scheduled',
  last_generated timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.reports FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.reports FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.reports FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.reports FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Tenant members can view resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND auth.uid() IS NOT NULL);

CREATE TABLE public.managed_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft', blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text, seo_description text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.managed_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage pages" ON public.managed_pages FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can view published pages" ON public.managed_pages FOR SELECT USING (status = 'published');

CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Super admins manage site settings" ON public.site_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  description text NOT NULL, quantity numeric NOT NULL DEFAULT 1, unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.invoice_items FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.invoice_items FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.invoice_items FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.invoice_items FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  pay_frequency text NOT NULL DEFAULT 'monthly', pay_day integer NOT NULL DEFAULT 25,
  overtime_rate numeric NOT NULL DEFAULT 1.5, tax_enabled boolean NOT NULL DEFAULT true,
  tax_rate numeric NOT NULL DEFAULT 0, provident_fund_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.payroll_settings FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.payroll_settings FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.payroll_settings FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id),
  type text NOT NULL, amount numeric NOT NULL, description text,
  reference_id text, status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON public.wallet_transactions FOR SELECT TO authenticated
USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));
CREATE POLICY "Users insert own transactions" ON public.wallet_transactions FOR INSERT TO authenticated
WITH CHECK (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

CREATE TABLE public.wallet_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_wallet_id uuid NOT NULL REFERENCES public.wallets(id),
  to_wallet_id uuid NOT NULL REFERENCES public.wallets(id),
  amount numeric NOT NULL, note text, status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transfers" ON public.wallet_transfers FOR SELECT TO authenticated
USING (from_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()) OR to_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

CREATE TABLE public.company_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) UNIQUE,
  balance numeric NOT NULL DEFAULT 0, currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.company_wallets FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.company_wallets FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.company_wallets FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.company_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.company_wallets(id),
  type text NOT NULL, amount numeric NOT NULL, description text, reference_id text,
  status text NOT NULL DEFAULT 'completed', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant see own" ON public.company_wallet_transactions FOR SELECT TO authenticated
USING (wallet_id IN (SELECT id FROM public.company_wallets WHERE tenant_id = get_user_tenant_id(auth.uid())));

CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL, rate numeric NOT NULL, type text NOT NULL DEFAULT 'percentage',
  is_default boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.tax_rates FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.tax_rates FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.tax_rates FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.tax_rates FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) UNIQUE,
  tax_id text, tax_type text DEFAULT 'VAT', fiscal_year_start integer DEFAULT 1,
  filing_frequency text DEFAULT 'quarterly', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.tax_profiles FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.tax_profiles FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.tax_profiles FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, discount_percent integer NOT NULL DEFAULT 0,
  max_uses integer DEFAULT 0, used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz, valid_until timestamptz, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id),
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  redeemed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert" ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.module_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, key text NOT NULL UNIQUE, description text,
  price_monthly numeric NOT NULL DEFAULT 0, price_yearly numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.module_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active addons" ON public.module_addons FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins manage" ON public.module_addons FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.tenant_addon_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  addon_id uuid NOT NULL REFERENCES public.module_addons(id),
  status text NOT NULL DEFAULT 'active', activated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, addon_id)
);
ALTER TABLE public.tenant_addon_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.tenant_addon_modules FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Company admins manage" ON public.tenant_addon_modules FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE TABLE public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  invoice_id uuid REFERENCES public.invoices(id),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  amount numeric NOT NULL, currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active', expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.payment_links FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.payment_links FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Public view by token" ON public.payment_links FOR SELECT USING (true);

CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, wallet_id uuid REFERENCES public.wallets(id),
  amount numeric NOT NULL, method text NOT NULL DEFAULT 'bank_transfer',
  details jsonb, status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON public.payout_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert" ON public.payout_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Super admins manage" ON public.payout_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.wallet_fee_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL UNIQUE, fee_percent numeric NOT NULL DEFAULT 0,
  flat_fee numeric NOT NULL DEFAULT 0, min_amount numeric DEFAULT 0,
  max_amount numeric, is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_fee_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view" ON public.wallet_fee_config FOR SELECT USING (true);
CREATE POLICY "Super admins manage" ON public.wallet_fee_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  type text NOT NULL DEFAULT 'call', note text, scheduled_at timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false, created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.lead_follow_ups FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.lead_follow_ups FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.lead_follow_ups FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.lead_follow_ups FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, device text, browser text, ip_address text,
  last_active timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON public.active_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert" ON public.active_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update" ON public.active_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete" ON public.active_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, email text NOT NULL, company text, phone text, message text NOT NULL,
  status text NOT NULL DEFAULT 'new', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Super admins view" ON public.contact_submissions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admins update" ON public.contact_submissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE public.tenant_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  method_name text NOT NULL, gateway text NOT NULL, is_enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.tenant_payment_methods FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Company admins manage" ON public.tenant_payment_methods FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role));

CREATE TABLE public.platform_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL UNIQUE, display_name text NOT NULL, description text,
  is_enabled boolean DEFAULT false, config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view" ON public.platform_payment_methods FOR SELECT USING (true);
CREATE POLICY "Super admins manage" ON public.platform_payment_methods FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Functions
CREATE OR REPLACE FUNCTION public.get_public_job(job_id uuid) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT row_to_json(t) FROM (SELECT jp.id, jp.title, jp.department, jp.location, jp.employment_type, jp.description, jp.status, jp.posted_date, te.name as company_name, te.slug as company_slug, te.logo_url as company_logo FROM public.job_postings jp JOIN public.tenants te ON te.id = jp.tenant_id WHERE jp.id = job_id AND jp.status = 'Open') t
$$;

CREATE OR REPLACE FUNCTION public.submit_job_application(_job_id uuid, _name text, _email text, _phone text DEFAULT NULL, _cover_letter text DEFAULT NULL, _resume_url text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant_id uuid; _app_id uuid; _job_status text;
BEGIN
  SELECT tenant_id, status INTO _tenant_id, _job_status FROM public.job_postings WHERE id = _job_id;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF _job_status != 'Open' THEN RAISE EXCEPTION 'This job is no longer accepting applications'; END IF;
  INSERT INTO public.job_applications (job_id, tenant_id, applicant_name, applicant_email, applicant_phone, cover_letter, resume_url) VALUES (_job_id, _tenant_id, _name, _email, _phone, _cover_letter, _resume_url) RETURNING id INTO _app_id;
  UPDATE public.job_postings SET applicants = applicants + 1 WHERE id = _job_id;
  RETURN _app_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_public_jobs_by_slug(company_slug text) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT jp.id, jp.title, jp.department, jp.location, jp.employment_type, jp.description, jp.status, jp.posted_date, jp.applicants, te.name as company_name, te.slug as company_slug, te.logo_url as company_logo FROM public.job_postings jp JOIN public.tenants te ON te.id = jp.tenant_id WHERE te.slug = company_slug AND jp.status = 'Open' ORDER BY jp.posted_date DESC) t
$$;

ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS salary_range text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS requirements text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS benefits text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'Mid-level';

ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;

-- Dashboard widget configs
CREATE TABLE public.dashboard_widget_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  widget_key text NOT NULL, position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true, config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, widget_key)
);
ALTER TABLE public.dashboard_widget_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON public.dashboard_widget_configs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own" ON public.dashboard_widget_configs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own" ON public.dashboard_widget_configs FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own" ON public.dashboard_widget_configs FOR DELETE TO authenticated USING (user_id = auth.uid());
