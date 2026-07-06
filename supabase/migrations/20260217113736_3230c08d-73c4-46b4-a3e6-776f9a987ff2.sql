
-- PDM Products
CREATE TABLE public.pdm_products (
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

ALTER TABLE public.pdm_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation pdm_products" ON public.pdm_products FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert pdm_products" ON public.pdm_products FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update pdm_products" ON public.pdm_products FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete pdm_products" ON public.pdm_products FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Super admin pdm_products" ON public.pdm_products FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- PDM Orders
CREATE TABLE public.pdm_orders (
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

ALTER TABLE public.pdm_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation pdm_orders" ON public.pdm_orders FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert pdm_orders" ON public.pdm_orders FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update pdm_orders" ON public.pdm_orders FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete pdm_orders" ON public.pdm_orders FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Super admin pdm_orders" ON public.pdm_orders FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- PDM Order Items
CREATE TABLE public.pdm_order_items (
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

ALTER TABLE public.pdm_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation pdm_order_items" ON public.pdm_order_items FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert pdm_order_items" ON public.pdm_order_items FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update pdm_order_items" ON public.pdm_order_items FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete pdm_order_items" ON public.pdm_order_items FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Super admin pdm_order_items" ON public.pdm_order_items FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- PDM Courier Configs (per tenant, multiple couriers)
CREATE TABLE public.pdm_courier_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  courier_key TEXT NOT NULL, -- steadfast, pathao, redx
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

ALTER TABLE public.pdm_courier_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins manage courier configs" ON public.pdm_courier_configs FOR ALL USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role)
);
CREATE POLICY "Tenant members view courier configs" ON public.pdm_courier_configs FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid())
);
CREATE POLICY "Super admin pdm_courier_configs" ON public.pdm_courier_configs FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Indexes
CREATE INDEX idx_pdm_products_tenant ON public.pdm_products(tenant_id);
CREATE INDEX idx_pdm_orders_tenant ON public.pdm_orders(tenant_id);
CREATE INDEX idx_pdm_orders_status ON public.pdm_orders(order_status);
CREATE INDEX idx_pdm_order_items_order ON public.pdm_order_items(order_id);
CREATE INDEX idx_pdm_courier_configs_tenant ON public.pdm_courier_configs(tenant_id);

-- Triggers for updated_at
CREATE TRIGGER update_pdm_products_updated_at BEFORE UPDATE ON public.pdm_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pdm_orders_updated_at BEFORE UPDATE ON public.pdm_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pdm_courier_configs_updated_at BEFORE UPDATE ON public.pdm_courier_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
