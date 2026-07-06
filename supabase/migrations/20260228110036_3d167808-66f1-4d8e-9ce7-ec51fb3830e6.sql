
-- Add price grandfathering setting
INSERT INTO public.platform_settings (key, value, description)
VALUES ('price_update_policy', '"grandfather"'::jsonb, 'Whether existing subscribers keep old price (grandfather) or get new price (update_all) on next billing')
ON CONFLICT (key) DO NOTHING;

-- Add locked_price to tenant_subscriptions
ALTER TABLE public.tenant_subscriptions
ADD COLUMN IF NOT EXISTS locked_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS locked_modules jsonb DEFAULT NULL;

-- Add locked prices for module addons per tenant
ALTER TABLE public.tenant_modules
ADD COLUMN IF NOT EXISTS locked_price_monthly numeric DEFAULT NULL;
