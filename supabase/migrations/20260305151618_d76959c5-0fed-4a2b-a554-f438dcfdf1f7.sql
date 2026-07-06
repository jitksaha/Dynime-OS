
CREATE TABLE public.pos_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_type text NOT NULL DEFAULT 'general',
  business_type_label text NOT NULL DEFAULT 'General',
  features jsonb DEFAULT '{}',
  settings jsonb DEFAULT '{}',
  setup_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant POS config"
  ON public.pos_configurations FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Company admins can manage POS config"
  ON public.pos_configurations FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
