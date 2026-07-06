
-- Add transaction_id and activated_at to tenant_addon_modules
ALTER TABLE public.tenant_addon_modules
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
