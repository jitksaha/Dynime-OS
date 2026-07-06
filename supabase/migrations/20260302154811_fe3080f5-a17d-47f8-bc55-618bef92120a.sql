
-- Partners directory table
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  short_description TEXT,
  category TEXT NOT NULL DEFAULT 'technology',
  partner_type TEXT NOT NULL DEFAULT 'technology',
  tier TEXT NOT NULL DEFAULT 'standard',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  country TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  tags TEXT[],
  social_links JSONB DEFAULT '{}',
  meta JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything (platform-level partners when tenant_id IS NULL)
CREATE POLICY "Super admins full access on partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Company admins can manage their own tenant partners
CREATE POLICY "Company admins manage own tenant partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'company_admin')
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'company_admin')
  );

-- All authenticated users can view active partners (their tenant or platform-level)
CREATE POLICY "Users can view active partners"
  ON public.partners FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  );

-- Public can view active platform-level partners (no tenant_id)
CREATE POLICY "Public can view platform partners"
  ON public.partners FOR SELECT
  TO anon
  USING (is_active = true AND tenant_id IS NULL);

-- Auto-update timestamp
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_partners_tenant ON public.partners(tenant_id);
CREATE INDEX idx_partners_category ON public.partners(category);
CREATE INDEX idx_partners_active ON public.partners(is_active);
