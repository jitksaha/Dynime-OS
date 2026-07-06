
-- BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL, code text, address text, city text, state text,
  country text, postal_code text, phone text, email text,
  manager_user_id uuid, timezone text DEFAULT 'UTC', currency text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  branding jsonb DEFAULT '{}'::jsonb, metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON public.branches(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_default_per_tenant
  ON public.branches(tenant_id) WHERE is_default = true;
DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branches: tenant members can view" ON public.branches;
CREATE POLICY "Branches: tenant members can view" ON public.branches FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
DROP POLICY IF EXISTS "Branches: admins manage" ON public.branches;
CREATE POLICY "Branches: admins manage" ON public.branches FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
              AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

-- USER ↔ BRANCH
CREATE TABLE IF NOT EXISTS public.user_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'branch' CHECK (access_level IN ('branch','multi','global')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_branches_global
  ON public.user_branches(user_id, tenant_id) WHERE branch_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_branches_specific
  ON public.user_branches(user_id, tenant_id, branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_branches_user ON public.user_branches(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON public.user_branches(branch_id);
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_branches: self read" ON public.user_branches;
CREATE POLICY "user_branches: self read" ON public.user_branches FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = public.get_user_tenant_id(auth.uid()));
DROP POLICY IF EXISTS "user_branches: admins manage" ON public.user_branches;
CREATE POLICY "user_branches: admins manage" ON public.user_branches FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
              AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

-- PROFILE
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- HELPERS
CREATE OR REPLACE FUNCTION public.get_user_branch_ids(_user_id uuid, _tenant_id uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(branch_id) FILTER (WHERE branch_id IS NOT NULL), ARRAY[]::uuid[])
  FROM public.user_branches WHERE user_id = _user_id AND tenant_id = _tenant_id;
$$;

CREATE OR REPLACE FUNCTION public.user_has_global_branch_access(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_branches
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND access_level = 'global')
  OR EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id
      AND role::text IN ('admin','super_admin','owner'));
$$;

CREATE OR REPLACE FUNCTION public.user_has_branch_access(_user_id uuid, _tenant_id uuid, _branch_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _branch_id IS NULL
    OR public.user_has_global_branch_access(_user_id, _tenant_id)
    OR EXISTS (SELECT 1 FROM public.user_branches
        WHERE user_id = _user_id AND tenant_id = _tenant_id AND branch_id = _branch_id);
$$;

CREATE OR REPLACE FUNCTION public.get_active_branch_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT active_branch_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_default_branch(_tenant_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bid uuid;
BEGIN
  SELECT id INTO _bid FROM public.branches WHERE tenant_id = _tenant_id AND is_default = true LIMIT 1;
  IF _bid IS NULL THEN
    INSERT INTO public.branches(tenant_id, name, code, is_default, is_active)
    VALUES (_tenant_id, 'Main Branch', 'MAIN', true, true) RETURNING id INTO _bid;
  END IF;
  RETURN _bid;
END; $$;

-- BACKFILL
DO $$ DECLARE t RECORD;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.ensure_default_branch(t.id);
  END LOOP;
END $$;

INSERT INTO public.user_branches (user_id, tenant_id, branch_id, access_level)
SELECT DISTINCT ur.user_id, ur.tenant_id, NULL::uuid, 'global'
FROM public.user_roles ur
WHERE ur.tenant_id IS NOT NULL
  AND ur.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_branches ub
    WHERE ub.user_id = ur.user_id AND ub.tenant_id = ur.tenant_id AND ub.branch_id IS NULL
  );

-- ADD branch_id to existing business tables
DO $$
DECLARE
  tbls text[] := ARRAY[
    'deals','lead_follow_ups','contracts','tickets','calendar_events',
    'invoices','invoice_items','recurring_invoices','payments','expenses','budgets',
    'inventory_items','purchase_orders','vendors',
    'pdm_products','pdm_orders','pdm_order_items','pos_configurations',
    'facility_bookings','booking_services',
    'projects','project_tasks','project_milestones','project_activities','staff_tasks',
    'employees','departments','attendance_records','leave_requests','leave_balances',
    'payroll_records','salary_increments','employee_loans','employee_expense_claims',
    'employee_warnings','performance_reviews','shift_assignments','late_records',
    'campaigns','workflows','whatsapp_gateway_configs','whatsapp_logs','sms_logs',
    'communication_logs','communication_templates','documents','document_requests',
    'company_assets','vehicles','delivery_routes','maintenance_requests',
    'training_enrollments','training_records'
  ];
  tn text;
BEGIN
  FOREACH tn IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tn) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL', tn);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(branch_id)', 'idx_'||tn||'_branch', tn);
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tn AND column_name='tenant_id') THEN
        EXECUTE format($f$
          UPDATE public.%I t SET branch_id = b.id FROM public.branches b
          WHERE t.tenant_id = b.tenant_id AND b.is_default = true AND t.branch_id IS NULL
        $f$, tn);
      END IF;
    END IF;
  END LOOP;
END $$;

-- BRANCH STOCK & PRICING
CREATE TABLE IF NOT EXISTS public.branch_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  last_counted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, branch_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_stock_lookup ON public.branch_stock(tenant_id, branch_id, product_id);
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_stock: read" ON public.branch_stock;
CREATE POLICY "branch_stock: read" ON public.branch_stock FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND public.user_has_branch_access(auth.uid(), tenant_id, branch_id));
DROP POLICY IF EXISTS "branch_stock: write" ON public.branch_stock;
CREATE POLICY "branch_stock: write" ON public.branch_stock FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND public.user_has_branch_access(auth.uid(), tenant_id, branch_id))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
              AND public.user_has_branch_access(auth.uid(), tenant_id, branch_id));

CREATE TABLE IF NOT EXISTS public.branch_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL, price numeric NOT NULL, currency text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, branch_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_pricing_lookup ON public.branch_pricing(tenant_id, branch_id, product_id);
DROP TRIGGER IF EXISTS trg_branch_pricing_updated ON public.branch_pricing;
CREATE TRIGGER trg_branch_pricing_updated BEFORE UPDATE ON public.branch_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.branch_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_pricing: read" ON public.branch_pricing;
CREATE POLICY "branch_pricing: read" ON public.branch_pricing FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND public.user_has_branch_access(auth.uid(), tenant_id, branch_id));
DROP POLICY IF EXISTS "branch_pricing: admins manage" ON public.branch_pricing;
CREATE POLICY "branch_pricing: admins manage" ON public.branch_pricing FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
              AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

-- STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_branch_id uuid NOT NULL REFERENCES public.branches(id),
  to_branch_id uuid NOT NULL REFERENCES public.branches(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','in_transit','received','cancelled')),
  reference text, notes text,
  requested_by uuid, approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_branch_id <> to_branch_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON public.stock_transfers(tenant_id);
DROP TRIGGER IF EXISTS trg_stock_transfers_updated ON public.stock_transfers;
CREATE TRIGGER trg_stock_transfers_updated BEFORE UPDATE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_transfers: read" ON public.stock_transfers;
CREATE POLICY "stock_transfers: read" ON public.stock_transfers FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND (public.user_has_branch_access(auth.uid(), tenant_id, from_branch_id)
              OR public.user_has_branch_access(auth.uid(), tenant_id, to_branch_id)));
DROP POLICY IF EXISTS "stock_transfers: insert" ON public.stock_transfers;
CREATE POLICY "stock_transfers: insert" ON public.stock_transfers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
              AND public.user_has_branch_access(auth.uid(), tenant_id, from_branch_id));
DROP POLICY IF EXISTS "stock_transfers: update" ON public.stock_transfers;
CREATE POLICY "stock_transfers: update" ON public.stock_transfers FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON public.stock_transfer_items(transfer_id);
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sti: read" ON public.stock_transfer_items;
CREATE POLICY "sti: read" ON public.stock_transfer_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stock_transfers st
    WHERE st.id = transfer_id
      AND st.tenant_id = public.get_user_tenant_id(auth.uid())
      AND (public.user_has_branch_access(auth.uid(), st.tenant_id, st.from_branch_id)
           OR public.user_has_branch_access(auth.uid(), st.tenant_id, st.to_branch_id))));
DROP POLICY IF EXISTS "sti: write" ON public.stock_transfer_items;
CREATE POLICY "sti: write" ON public.stock_transfer_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stock_transfers st
    WHERE st.id = transfer_id
      AND st.tenant_id = public.get_user_tenant_id(auth.uid())
      AND public.user_has_branch_access(auth.uid(), st.tenant_id, st.from_branch_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stock_transfers st
    WHERE st.id = transfer_id
      AND st.tenant_id = public.get_user_tenant_id(auth.uid())
      AND public.user_has_branch_access(auth.uid(), st.tenant_id, st.from_branch_id)));

-- EXECUTE TRANSFER
CREATE OR REPLACE FUNCTION public.execute_stock_transfer(_transfer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t RECORD; _it RECORD;
BEGIN
  SELECT * INTO _t FROM public.stock_transfers WHERE id = _transfer_id FOR UPDATE;
  IF _t IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF _t.status NOT IN ('pending','approved','in_transit') THEN
    RAISE EXCEPTION 'Transfer already finalized';
  END IF;
  FOR _it IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = _transfer_id LOOP
    UPDATE public.branch_stock SET quantity = quantity - _it.quantity, updated_at = now()
     WHERE tenant_id = _t.tenant_id AND branch_id = _t.from_branch_id AND product_id = _it.product_id;
    INSERT INTO public.branch_stock(tenant_id, branch_id, product_id, quantity)
    VALUES (_t.tenant_id, _t.to_branch_id, _it.product_id, _it.quantity)
    ON CONFLICT (tenant_id, branch_id, product_id)
    DO UPDATE SET quantity = public.branch_stock.quantity + EXCLUDED.quantity, updated_at = now();
  END LOOP;
  UPDATE public.stock_transfers SET status = 'received', updated_at = now() WHERE id = _transfer_id;
  RETURN jsonb_build_object('success', true);
END; $$;

-- ONBOARDING RPC UPDATES
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _company_name text, _slug text, _industry text DEFAULT NULL,
  _size text DEFAULT NULL, _country text DEFAULT 'US',
  _currency text DEFAULT 'USD', _currency_symbol text DEFAULT '$',
  _plan_slug text DEFAULT 'free'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid := auth.uid(); _tenant_id uuid; _trial_days int;
        _trial_ends timestamptz; _plan public.subscription_plans%ROWTYPE; _branch_id uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND onboarding_completed = true) THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;
  SELECT COALESCE((value)::int, 14) INTO _trial_days FROM public.platform_settings WHERE key = 'trial_days';
  IF _trial_days IS NULL THEN _trial_days := 14; END IF;
  _trial_ends := now() + (_trial_days || ' days')::interval;
  SELECT * INTO _plan FROM public.subscription_plans WHERE slug = COALESCE(_plan_slug,'free') AND is_active = true LIMIT 1;
  IF NOT FOUND THEN SELECT * INTO _plan FROM public.subscription_plans WHERE slug = 'free' LIMIT 1; END IF;
  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol, plan, trial_ends_at)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol, COALESCE(_plan.slug,'free'), _trial_ends)
  RETURNING id INTO _tenant_id;
  _branch_id := public.ensure_default_branch(_tenant_id);
  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true, active_branch_id = _branch_id
   WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;
  INSERT INTO public.user_branches (user_id, tenant_id, branch_id, access_level)
  VALUES (_user_id, _tenant_id, NULL, 'global') ON CONFLICT DO NOTHING;
  IF _plan.id IS NOT NULL AND _plan.modules IS NOT NULL THEN
    INSERT INTO public.tenant_modules (tenant_id, module_name, is_enabled)
    SELECT _tenant_id, m::text, true FROM jsonb_array_elements_text(_plan.modules) AS m
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN _tenant_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_additional_company(
  _company_name text, _slug text, _industry text DEFAULT NULL,
  _size text DEFAULT NULL, _country text DEFAULT 'US',
  _currency text DEFAULT 'USD', _currency_symbol text DEFAULT '$',
  _plan_slug text DEFAULT 'free'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid := auth.uid(); _tenant_id uuid; _trial_days int;
        _trial_ends timestamptz; _plan public.subscription_plans%ROWTYPE; _branch_id uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT COALESCE((value)::int, 14) INTO _trial_days FROM public.platform_settings WHERE key = 'trial_days';
  IF _trial_days IS NULL THEN _trial_days := 14; END IF;
  _trial_ends := now() + (_trial_days || ' days')::interval;
  SELECT * INTO _plan FROM public.subscription_plans WHERE slug = COALESCE(_plan_slug,'free') AND is_active = true LIMIT 1;
  IF NOT FOUND THEN SELECT * INTO _plan FROM public.subscription_plans WHERE slug = 'free' LIMIT 1; END IF;
  INSERT INTO public.tenants (name, slug, industry, size, country, currency, currency_symbol, plan, trial_ends_at)
  VALUES (_company_name, _slug, _industry, _size, _country, _currency, _currency_symbol, COALESCE(_plan.slug,'free'), _trial_ends)
  RETURNING id INTO _tenant_id;
  _branch_id := public.ensure_default_branch(_tenant_id);
  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true, active_branch_id = _branch_id
   WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'admin')
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;
  INSERT INTO public.user_branches (user_id, tenant_id, branch_id, access_level)
  VALUES (_user_id, _tenant_id, NULL, 'global') ON CONFLICT DO NOTHING;
  IF _plan.id IS NOT NULL AND _plan.modules IS NOT NULL THEN
    INSERT INTO public.tenant_modules (tenant_id, module_name, is_enabled)
    SELECT _tenant_id, m::text, true FROM jsonb_array_elements_text(_plan.modules) AS m
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN _tenant_id;
END; $$;

UPDATE public.profiles p SET active_branch_id = b.id FROM public.branches b
WHERE p.tenant_id = b.tenant_id AND b.is_default = true AND p.active_branch_id IS NULL;
