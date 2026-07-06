
-- Table to store tenant integration configurations
CREATE TABLE public.tenant_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL, -- gmail, slack, whatsapp, webhooks, google_calendar
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  last_tested_at TIMESTAMPTZ,
  test_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, integration_key)
);

-- Enable RLS
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own tenant's integrations
CREATE POLICY "Users can view own tenant integrations"
  ON public.tenant_integrations FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own tenant integrations"
  ON public.tenant_integrations FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own tenant integrations"
  ON public.tenant_integrations FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own tenant integrations"
  ON public.tenant_integrations FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_tenant_integrations_updated_at
  BEFORE UPDATE ON public.tenant_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
