-- Tenant-managed social platform credentials
CREATE TABLE IF NOT EXISTS public.social_channel_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook','whatsapp','twitter','messenger')),
  display_name TEXT,
  -- Common fields (nullable, used per platform)
  app_id TEXT,
  app_secret TEXT,
  page_id TEXT,
  page_access_token TEXT,
  business_account_id TEXT,
  phone_number_id TEXT,
  verify_token TEXT,
  bearer_token TEXT,
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  access_token_secret TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'pending',
  verification_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, platform, page_id),
  UNIQUE (tenant_id, platform, phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_scc_tenant ON public.social_channel_credentials (tenant_id);
CREATE INDEX IF NOT EXISTS idx_scc_platform ON public.social_channel_credentials (platform);

ALTER TABLE public.social_channel_credentials ENABLE ROW LEVEL SECURITY;

-- Tenant admins manage their own credentials
CREATE POLICY "Tenant admins can view own social credentials"
  ON public.social_channel_credentials FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );

CREATE POLICY "Tenant admins can insert own social credentials"
  ON public.social_channel_credentials FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );

CREATE POLICY "Tenant admins can update own social credentials"
  ON public.social_channel_credentials FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );

CREATE POLICY "Tenant admins can delete own social credentials"
  ON public.social_channel_credentials FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );

-- Super admins see everything
CREATE POLICY "Super admins manage all social credentials"
  ON public.social_channel_credentials FOR ALL
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Auto-update updated_at
CREATE TRIGGER trg_scc_updated_at
  BEFORE UPDATE ON public.social_channel_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();