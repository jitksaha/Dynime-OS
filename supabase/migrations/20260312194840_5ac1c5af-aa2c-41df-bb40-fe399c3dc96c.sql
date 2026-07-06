
-- ============================================
-- 1. INVENTORY & WAREHOUSE
-- ============================================
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  unit TEXT DEFAULT 'pcs',
  current_stock NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 10,
  reorder_quantity NUMERIC DEFAULT 50,
  unit_cost NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  warehouse TEXT DEFAULT 'Main',
  location_bin TEXT,
  barcode TEXT,
  status TEXT DEFAULT 'Active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.inventory_items FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL DEFAULT 'in',
  quantity NUMERIC NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT,
  from_warehouse TEXT,
  to_warehouse TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.stock_movements FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- 2. PROCUREMENT & VENDORS
-- ============================================
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT DEFAULT 'General',
  rating NUMERIC DEFAULT 0,
  payment_terms TEXT DEFAULT 'Net 30',
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.vendors FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id),
  po_number TEXT NOT NULL,
  status TEXT DEFAULT 'Draft',
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.purchase_orders FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- 3. OKR & GOALS
-- ============================================
CREATE TABLE public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  owner_name TEXT,
  level TEXT DEFAULT 'company',
  parent_id UUID REFERENCES public.objectives(id),
  period TEXT DEFAULT 'Q1 2026',
  status TEXT DEFAULT 'On Track',
  progress NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.objectives FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric_type TEXT DEFAULT 'percentage',
  start_value NUMERIC DEFAULT 0,
  target_value NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  status TEXT DEFAULT 'Not Started',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.key_results FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- 4. ASSET & FACILITY MANAGEMENT (extends existing company_assets)
-- ============================================
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.company_assets(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Open',
  assigned_to TEXT,
  scheduled_date DATE,
  completed_date DATE,
  cost NUMERIC DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.maintenance_requests FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.facility_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_name TEXT NOT NULL,
  facility_type TEXT DEFAULT 'Meeting Room',
  booked_by UUID NOT NULL,
  booked_by_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'Confirmed',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.facility_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.facility_bookings FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- 5. CONTRACT & LEGAL
-- ============================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contract_type TEXT DEFAULT 'Service Agreement',
  party_name TEXT NOT NULL,
  party_email TEXT,
  status TEXT DEFAULT 'Draft',
  start_date DATE,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  terms TEXT,
  renewal_notice_days INTEGER DEFAULT 30,
  signed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.contracts FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- 6. LOGISTICS & FLEET
-- ============================================
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  registration TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vehicle_type TEXT DEFAULT 'Van',
  status TEXT DEFAULT 'Available',
  assigned_driver TEXT,
  fuel_type TEXT DEFAULT 'Diesel',
  mileage NUMERIC DEFAULT 0,
  insurance_expiry DATE,
  next_service_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.vehicles FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_name TEXT,
  status TEXT DEFAULT 'Planned',
  stops JSONB DEFAULT '[]',
  estimated_distance NUMERIC DEFAULT 0,
  actual_distance NUMERIC,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.delivery_routes FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- 7. COMPLIANCE & RISK
-- ============================================
CREATE TABLE public.risk_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Operational',
  likelihood TEXT DEFAULT 'Medium',
  impact TEXT DEFAULT 'Medium',
  risk_score NUMERIC DEFAULT 0,
  mitigation_plan TEXT,
  owner_name TEXT,
  status TEXT DEFAULT 'Open',
  review_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.risk_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.risk_register FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.compliance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  regulation TEXT,
  category TEXT DEFAULT 'General',
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  assigned_to TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.compliance_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.compliance_checklists FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  incident_type TEXT DEFAULT 'Safety',
  severity TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Open',
  reported_by TEXT,
  assigned_to TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  root_cause TEXT,
  corrective_action TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.incidents FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
