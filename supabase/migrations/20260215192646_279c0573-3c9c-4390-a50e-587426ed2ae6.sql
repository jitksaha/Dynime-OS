
-- Tax profiles by region
CREATE TABLE public.tax_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.tax_profiles FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.tax_profiles FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.tax_profiles FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.tax_profiles FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Tax rates within a profile
CREATE TABLE public.tax_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_profile_id UUID NOT NULL REFERENCES public.tax_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  tax_type TEXT NOT NULL DEFAULT 'percentage',
  is_compound BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.tax_rates FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.tax_rates FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.tax_rates FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.tax_rates FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Invoice line items
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_profile_id UUID REFERENCES public.tax_profiles(id),
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.invoice_items FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.invoice_items FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.invoice_items FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.invoice_items FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add tax fields to invoices
ALTER TABLE public.invoices 
  ADD COLUMN tax_profile_id UUID REFERENCES public.tax_profiles(id),
  ADD COLUMN subtotal NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN tax_amount NUMERIC NOT NULL DEFAULT 0;

-- Add tax fields to expenses
ALTER TABLE public.expenses
  ADD COLUMN tax_profile_id UUID REFERENCES public.tax_profiles(id),
  ADD COLUMN tax_amount NUMERIC NOT NULL DEFAULT 0;

-- Add tax fields to payments
ALTER TABLE public.payments
  ADD COLUMN tax_profile_id UUID REFERENCES public.tax_profiles(id),
  ADD COLUMN tax_amount NUMERIC NOT NULL DEFAULT 0;

-- Triggers for updated_at
CREATE TRIGGER update_tax_profiles_updated_at BEFORE UPDATE ON public.tax_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
