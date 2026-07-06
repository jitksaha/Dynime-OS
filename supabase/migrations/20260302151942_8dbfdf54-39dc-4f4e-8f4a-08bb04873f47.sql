
-- Add missing columns to tax_profiles for country-wise tax management
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS tax_system text DEFAULT 'vat';
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS fiscal_year_start text DEFAULT '01-01';
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS filing_frequency text DEFAULT 'quarterly';
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS default_tax_rate numeric(6,3) DEFAULT 0;
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.tax_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add missing columns to tax_rates
ALTER TABLE public.tax_rates ADD COLUMN IF NOT EXISTS rate_type text DEFAULT 'percentage';
ALTER TABLE public.tax_rates ADD COLUMN IF NOT EXISTS applies_to text DEFAULT 'all';
ALTER TABLE public.tax_rates ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.tax_rates ADD COLUMN IF NOT EXISTS effective_from date;
ALTER TABLE public.tax_rates ADD COLUMN IF NOT EXISTS effective_until date;

-- Tax Compliance Records
CREATE TABLE IF NOT EXISTS public.tax_compliance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  tax_profile_id uuid REFERENCES public.tax_profiles(id) ON DELETE CASCADE NOT NULL,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  filing_deadline date,
  status text NOT NULL DEFAULT 'pending',
  total_tax_collected numeric(14,2) DEFAULT 0,
  total_tax_paid numeric(14,2) DEFAULT 0,
  net_liability numeric(14,2) DEFAULT 0,
  payment_reference text,
  filed_at timestamptz,
  filed_by uuid,
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Tax Calculations - manual calculation history
CREATE TABLE IF NOT EXISTS public.tax_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  tax_profile_id uuid REFERENCES public.tax_profiles(id),
  calculation_type text NOT NULL DEFAULT 'simple',
  base_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate numeric(10,4) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_category text DEFAULT 'vat',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.tax_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

-- RLS for tax_compliance_records
CREATE POLICY "Users can view own tenant compliance" ON public.tax_compliance_records
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own tenant compliance" ON public.tax_compliance_records
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own tenant compliance" ON public.tax_compliance_records
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own tenant compliance" ON public.tax_compliance_records
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS for tax_calculations
CREATE POLICY "Users can view own tenant calculations" ON public.tax_calculations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own tenant calculations" ON public.tax_calculations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own tenant calculations" ON public.tax_calculations
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Super admin access
CREATE POLICY "Super admins manage all compliance" ON public.tax_compliance_records
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins manage all calculations" ON public.tax_calculations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_compliance_tenant ON public.tax_compliance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_profile ON public.tax_compliance_records(tax_profile_id);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_tenant ON public.tax_calculations(tenant_id);
