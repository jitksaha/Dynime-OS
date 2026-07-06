
-- Lead follow-up activities table
CREATE TABLE public.lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  type TEXT NOT NULL DEFAULT 'call',
  notes TEXT,
  follow_up_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.lead_follow_ups
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert" ON public.lead_follow_ups
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update" ON public.lead_follow_ups
  FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete" ON public.lead_follow_ups
  FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add lost stage and additional fields to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS loss_reason TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ;

CREATE TRIGGER update_lead_follow_ups_updated_at
  BEFORE UPDATE ON public.lead_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
