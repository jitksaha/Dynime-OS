
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_employees integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_invoices integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_deals integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_documents integer NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_projects integer NOT NULL DEFAULT -1;

COMMENT ON COLUMN public.subscription_plans.max_employees IS 'Max employees allowed. -1 = unlimited';
COMMENT ON COLUMN public.subscription_plans.max_invoices IS 'Max invoices per month. -1 = unlimited';
COMMENT ON COLUMN public.subscription_plans.max_deals IS 'Max CRM deals. -1 = unlimited';
COMMENT ON COLUMN public.subscription_plans.max_documents IS 'Max documents. -1 = unlimited';
COMMENT ON COLUMN public.subscription_plans.max_projects IS 'Max projects. -1 = unlimited';
