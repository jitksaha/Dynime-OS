
-- Table to store payment gateway configurations securely
CREATE TABLE public.payment_gateway_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_key text NOT NULL UNIQUE, -- 'sslcommerz', 'bkash', 'stripe'
  display_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT true,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb, -- encrypted credentials stored here
  settings jsonb NOT NULL DEFAULT '{}'::jsonb, -- additional gateway-specific settings
  last_tested_at timestamp with time zone,
  test_result text, -- 'success' or 'error'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;

-- Only super admins can access gateway configs
CREATE POLICY "Super admins full access payment_gateway_configs"
ON public.payment_gateway_configs
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payment_gateway_configs_updated_at
BEFORE UPDATE ON public.payment_gateway_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default gateways
INSERT INTO public.payment_gateway_configs (gateway_key, display_name, description, credentials, settings) VALUES
('sslcommerz', 'SSLCommerz', 'Bangladesh''s leading payment gateway supporting cards, mobile banking, and internet banking', 
 '{"store_id": "", "store_password": ""}'::jsonb,
 '{"sandbox_url": "https://sandbox.sslcommerz.com", "live_url": "https://securepay.sslcommerz.com"}'::jsonb),
('bkash', 'bKash', 'Bangladesh''s largest mobile financial service for merchant payments',
 '{"app_key": "", "app_secret": "", "username": "", "password": ""}'::jsonb,
 '{"sandbox_url": "https://tokenized.sandbox.bka.sh/v1.2.0-beta", "live_url": "https://tokenized.pay.bka.sh/v1.2.0-beta"}'::jsonb),
('stripe', 'Stripe', 'Global payment gateway supporting cards, wallets, bank transfers and 135+ currencies',
 '{"publishable_key": "", "secret_key": ""}'::jsonb,
 '{"webhook_secret": ""}'::jsonb);
